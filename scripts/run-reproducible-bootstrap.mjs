#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(scriptPath), '..')

export function validateBootstrapRuntime(nodeVersion, pnpmVersion) {
  if (nodeVersion !== 'v20.9.0') throw new Error('reproducible bootstrap requires Node 20.9.0')
  if (pnpmVersion !== '9.15.4') throw new Error('reproducible bootstrap requires pnpm 9.15.4')
}

export function buildBootstrapInstallCommands(storeDir) {
  const common = [
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
    '--store-dir',
    storeDir,
    '--reporter=append-only',
  ]
  return {
    cold: [...common],
    warmOffline: [
      'install',
      '--frozen-lockfile',
      '--offline',
      '--force',
      '--ignore-scripts',
      '--store-dir',
      storeDir,
      '--reporter=append-only',
    ],
  }
}

export function buildRuntimeProbeCommand() {
  return ['--filter=storefront', 'exec', 'next', '--version']
}

function run(command, args, options = {}) {
  const startedAt = Date.now()
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    input: options.input,
  })
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  assertNoSensitiveOutput(output)
  if (result.status !== 0) throw new Error(`${command} failed with exit ${String(result.status)}`)
  return { durationMs: Date.now() - startedAt, outputBytes: Buffer.byteLength(output) }
}

function assertNoSensitiveOutput(output) {
  const patterns = [
    /sk_live_[A-Za-z0-9]+/,
    /(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|DOKPLOY_API_TOKEN|BSWEB_INTERNAL_API_TOKEN)\s*=\s*\S+/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ]
  if (patterns.some(pattern => pattern.test(output))) throw new Error('bootstrap output contains sensitive material')
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function assertTemporaryRoot(tempRoot) {
  const expectedPrefix = join(resolve(tmpdir()), 'bns-bootstrap-')
  if (!resolve(tempRoot).startsWith(expectedPrefix)) throw new Error('refusing to clean unexpected bootstrap path')
}

function main() {
  const originalStatus = execFileSync('git', ['status', '--porcelain=v1'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()
  if (originalStatus) throw new Error('reproducible bootstrap requires a clean source worktree')
  const pnpmVersion = execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim()
  validateBootstrapRuntime(process.version, pnpmVersion)

  const tempRoot = mkdtempSync(join(tmpdir(), 'bns-bootstrap-'))
  assertTemporaryRoot(tempRoot)
  const sourceRoot = join(tempRoot, 'source')
  const storeDir = join(tempRoot, 'pnpm-store')
  mkdirSync(sourceRoot)
  let receipt
  try {
    const archive = spawnSync('git', ['archive', '--format=tar', 'HEAD'], {
      cwd: repoRoot,
      maxBuffer: 256 * 1024 * 1024,
    })
    if (archive.status !== 0 || !archive.stdout) throw new Error('git archive failed')
    const extraction = spawnSync('tar', ['-xf', '-', '-C', sourceRoot], {
      input: archive.stdout,
      maxBuffer: 256 * 1024 * 1024,
    })
    if (extraction.status !== 0) throw new Error('source archive extraction failed')

    const commands = buildBootstrapInstallCommands(storeDir)
    const environment = {
      ...process.env,
      CI: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'https://synthetic.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-nonsecret',
      LEADS_RATE_LIMIT_SALT: 'synthetic-nonsecret-bootstrap-salt',
    }
    const cold = run('pnpm', commands.cold, { cwd: sourceRoot, env: environment })
    const runtimeProbeCommand = buildRuntimeProbeCommand()
    const coldRuntime = run('pnpm', runtimeProbeCommand, {
      cwd: sourceRoot,
      env: environment,
    })
    const warmOffline = run('pnpm', commands.warmOffline, { cwd: sourceRoot, env: environment })
    const warmRuntime = run('pnpm', runtimeProbeCommand, {
      cwd: sourceRoot,
      env: environment,
    })
    const finalStatus = execFileSync('git', ['status', '--porcelain=v1'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim()
    if (finalStatus !== originalStatus) throw new Error('bootstrap changed the source worktree')

    receipt = {
      schema: 'bootandstrap.reproducible-bootstrap/v1',
      status: 'passed',
      revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
      runtime: { node: process.version, pnpm: pnpmVersion },
      lockfileSha256: sha256(readFileSync(join(repoRoot, 'pnpm-lock.yaml'))),
      phases: {
        cold: { ...cold, runtimeProbeMs: coldRuntime.durationMs },
        warmOffline: { ...warmOffline, runtimeProbeMs: warmRuntime.durationMs },
      },
      guarantees: {
        frozenLockfile: true,
        isolatedStore: true,
        warmOffline: true,
        syntheticEnvironment: true,
        sensitiveOutputMatches: 0,
        sourceDiff: 0,
        runtimeBinaryAvailable: true,
      },
      cleanup: { temporaryRootRemoved: false },
      residuals: [],
    }
  } finally {
    assertTemporaryRoot(tempRoot)
    rmSync(tempRoot, { recursive: true, force: true })
  }
  if (!receipt) throw new Error('bootstrap did not produce a receipt')
  receipt.cleanup.temporaryRootRemoved = true
  const outputPath = join(repoRoot, '.artifacts', 'assurance', 'reproducible-bootstrap.json')
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
  process.stdout.write(`${JSON.stringify({ status: receipt.status, revision: receipt.revision })}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) main()
