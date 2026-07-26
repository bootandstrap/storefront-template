#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(SCRIPT_DIR, '..')
const DEFAULT_MATRIX_PATH = join(SCRIPT_DIR, 'risk-test-matrix.json')
const SENSITIVE_TOKEN_PATTERN = /\b(secret|token|password|passwd|private_key|sk_live|stripe_live)\b/i

function fail(message) {
  console.error(`[risk-domain-evidence] ${message}`)
  process.exit(1)
}

function parseArgs(argv) {
  const parsed = {
    domain: undefined,
    matrixPath: DEFAULT_MATRIX_PATH,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]

    if (arg === '--domain') {
      if (!value) fail('--domain requires a value')
      parsed.domain = value
      index += 1
      continue
    }

    if (arg === '--matrix') {
      if (!value) fail('--matrix requires a value')
      parsed.matrixPath = resolve(value)
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/run-risk-domain-evidence.mjs [--domain <id>] [--matrix <path>]')
      process.exit(0)
    }

    fail(`unknown argument: ${arg}`)
  }

  return parsed
}

function readMatrix(matrixPath) {
  try {
    return JSON.parse(readFileSync(matrixPath, 'utf8'))
  } catch (error) {
    fail(`cannot read ${matrixPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function splitCommand(command) {
  return command.trim().split(/\s+/).filter(Boolean)
}

function assertSafeRelativePath(relativePath, baseDir, suffixPattern) {
  if (isAbsolute(relativePath)) return false

  const normalized = normalize(relativePath)
  if (normalized.startsWith('..')) return false
  if (!suffixPattern.test(normalized)) return false

  const absolutePath = resolve(baseDir, normalized)
  if (!absolutePath.startsWith(`${baseDir}/`)) return false

  return existsSync(absolutePath)
}

function isAllowedNodeCommand(parts) {
  if (parts.length !== 2) return false
  if (parts[0] !== 'node') return false
  return parts[1] === 'scripts/check-risk-test-matrix.mjs' && existsSync(join(ROOT_DIR, parts[1]))
}

function isAllowedStorefrontVitestCommand(parts) {
  if (parts.length < 5) return false
  if (parts[0] !== 'pnpm') return false
  if (parts[1] !== '--filter=storefront') return false
  if (parts[2] !== 'exec') return false
  if (parts[3] !== 'vitest') return false
  if (parts[4] !== 'run') return false

  const storefrontDir = join(ROOT_DIR, 'apps', 'storefront')
  const testPaths = parts.slice(5)
  if (testPaths.length < 1) return false

  return testPaths.every((testPath) =>
    assertSafeRelativePath(testPath, storefrontDir, /^src\/.+\.test\.(ts|tsx)$/)
  )
}

function isAllowedStorefrontPlaywrightCommand(parts) {
  if (parts.length < 6) return false
  if (parts[0] !== 'pnpm') return false
  if (parts[1] !== '--filter=storefront') return false
  if (parts[2] !== 'exec') return false
  if (parts[3] !== 'playwright') return false
  if (parts[4] !== 'test') return false

  const storefrontDir = join(ROOT_DIR, 'apps', 'storefront')
  const specPaths = parts.slice(5)
  if (specPaths.length < 1) return false

  return specPaths.every((specPath) =>
    assertSafeRelativePath(specPath, storefrontDir, /^e2e\/.+\.spec\.ts$/)
  )
}

function validateCommand(command, domainId) {
  if (typeof command !== 'string' || command.trim().length === 0) {
    fail(`${domainId}: runtimeEvidence command must be a non-empty string`)
  }

  if (SENSITIVE_TOKEN_PATTERN.test(command)) {
    fail(`${domainId}: runtimeEvidence command appears to include sensitive material`)
  }

  const parts = splitCommand(command)
  if (
    isAllowedNodeCommand(parts) ||
    isAllowedStorefrontVitestCommand(parts) ||
    isAllowedStorefrontPlaywrightCommand(parts)
  ) {
    return parts
  }

  fail(`${domainId}: unsupported or missing runtimeEvidence command: ${command}`)
}

function selectDomains(matrix, requestedDomain) {
  if (!Array.isArray(matrix.domains)) fail('risk-test-matrix domains must be an array')

  if (!requestedDomain) return matrix.domains

  const domain = matrix.domains.find((entry) => entry?.id === requestedDomain)
  if (!domain) fail(`unknown risk domain: ${requestedDomain}`)
  return [domain]
}

function buildSafeEnv() {
  const passthrough = [
    'PATH',
    'HOME',
    'SHELL',
    'USER',
    'TMPDIR',
    'CI',
    'TERM',
    'FORCE_COLOR',
    'BNS_360_BASE_URL',
    'BSWEB_ROOT',
    'TENANT_ID',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_MEDUSA_BACKEND_URL',
    'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_STORE_URL',
    'MEDUSA_BACKEND_URL',
  ]
  const env = {}

  for (const key of passthrough) {
    if (process.env[key]) env[key] = process.env[key]
  }

  env.TENANT_ID = env.TENANT_ID ?? '00000000-0000-4000-8000-000000000001'
  env.BNS_360_BASE_URL = env.BNS_360_BASE_URL ?? 'http://localhost:3000'
  env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
  env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
  env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? 'placeholder'
  env.NEXT_PUBLIC_STORE_URL = env.NEXT_PUBLIC_STORE_URL ?? 'https://placeholder.com'
  env.MEDUSA_BACKEND_URL = env.MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

  return env
}

const { domain: requestedDomain, matrixPath } = parseArgs(process.argv.slice(2))
const matrix = readMatrix(matrixPath)
const domains = selectDomains(matrix, requestedDomain)
const env = buildSafeEnv()
let executedCommands = 0

for (const domain of domains) {
  if (!domain?.id) fail('risk domain entry must define an id')
  if (!Array.isArray(domain.runtimeEvidence) || domain.runtimeEvidence.length < 1) {
    fail(`${domain.id}: runtimeEvidence must define at least one command`)
  }

  console.log(`[risk-domain-evidence] ${domain.id}`)

  for (const command of domain.runtimeEvidence) {
    const [executable, ...args] = validateCommand(command, domain.id)
    console.log(`[risk-domain-evidence] $ ${command}`)

    const result = spawnSync(executable, args, {
      cwd: ROOT_DIR,
      env,
      stdio: 'inherit',
    })

    if (result.error) {
      fail(`${domain.id}: command failed to start: ${result.error.message}`)
    }

    if (result.status !== 0) {
      fail(`${domain.id}: command exited with status ${result.status}: ${command}`)
    }

    executedCommands += 1
  }
}

console.log(`[risk-domain-evidence] OK (${executedCommands} commands)`)
