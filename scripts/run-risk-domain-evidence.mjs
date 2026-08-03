#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveTaskIdentity } from './lib/assurance-identity.mjs'
import {
  STOREFRONT_COVERAGE_OUTPUT,
  STOREFRONT_TESTS_OUTPUT,
  validateStorefrontEvidenceReceipt,
} from './run-storefront-assurance.mjs'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIR = dirname(SCRIPT_PATH)
const ROOT_DIR = resolve(SCRIPT_DIR, '..')
const DEFAULT_MATRIX_PATH = join(SCRIPT_DIR, 'risk-test-matrix.json')
const DEFAULT_SUMMARY_PATH = join(ROOT_DIR, '.artifacts', 'risk-domain-evidence', 'summary.json')
const DEFAULT_TASK_RECEIPT_PATH = join(
  ROOT_DIR,
  '.artifacts',
  'assurance',
  'tasks',
  'storefront-assurance.json',
)
const SENSITIVE_TOKEN_PATTERN = /\b(secret|token|password|passwd|private_key|sk_live|stripe_live)\b/i

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`${label} is missing or malformed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function writeJsonAtomic(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  renameSync(temporaryPath, filePath)
}

function parseArgs(argv) {
  const parsed = { domain: undefined, matrixPath: DEFAULT_MATRIX_PATH }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]
    if (arg === '--domain') {
      if (!value) throw new Error('--domain requires a value')
      parsed.domain = value
      index += 1
    } else if (arg === '--matrix') {
      if (!value) throw new Error('--matrix requires a value')
      parsed.matrixPath = resolve(value)
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  return parsed
}

function splitCommand(command) {
  return command.trim().split(/\s+/).filter(Boolean)
}

function assertSafeRelativePath(relativePath, suffixPattern) {
  if (isAbsolute(relativePath)) throw new Error(`unsafe absolute evidence path: ${relativePath}`)
  const normalized = normalize(relativePath).replaceAll('\\', '/')
  if (normalized.startsWith('../') || normalized.includes('/../') || !suffixPattern.test(normalized)) {
    throw new Error(`unsafe or unsupported evidence path: ${relativePath}`)
  }
  return normalized
}

function classifyCommand(command) {
  if (typeof command !== 'string' || command.trim().length === 0) {
    throw new Error('runtimeEvidence command must be a non-empty string')
  }
  if (SENSITIVE_TOKEN_PATTERN.test(command)) {
    throw new Error('runtimeEvidence command appears to include sensitive material')
  }

  const parts = splitCommand(command)
  if (
    parts.length === 2 &&
    parts[0] === 'node' &&
    parts[1] === 'scripts/check-risk-test-matrix.mjs'
  ) {
    return { kind: 'dependency', parts, paths: [] }
  }

  const storefrontPrefix = ['pnpm', '--filter=storefront', 'exec']
  if (!storefrontPrefix.every((part, index) => parts[index] === part)) {
    throw new Error(`unsupported runtimeEvidence command: ${command}`)
  }
  if (parts[3] === 'vitest' && parts[4] === 'run' && parts.length > 5) {
    const paths = parts.slice(5).map((path) =>
      assertSafeRelativePath(path, /^src\/.+\.test\.(ts|tsx)$/),
    )
    return { kind: 'vitest', parts, paths }
  }
  if (parts[3] === 'playwright' && parts[4] === 'test' && parts.length > 5) {
    const paths = parts.slice(5).map((path) =>
      assertSafeRelativePath(path, /^e2e\/.+\.spec\.ts$/),
    )
    return { kind: 'playwright', parts, paths }
  }
  throw new Error(`unsupported runtimeEvidence command: ${command}`)
}

function selectedDomains(matrix, requestedDomain) {
  if (!Array.isArray(matrix?.domains)) throw new Error('risk-test-matrix domains must be an array')
  if (!requestedDomain) return matrix.domains
  const domain = matrix.domains.find((entry) => entry?.id === requestedDomain)
  if (!domain) throw new Error(`unknown risk domain: ${requestedDomain}`)
  return [domain]
}

export function planRiskDomainEvidence(matrix, testsArtifact) {
  if (
    testsArtifact?.schema !== 'bootandstrap.storefront-tests/v1' ||
    testsArtifact?.status !== 'passed' ||
    !Array.isArray(testsArtifact?.testFiles)
  ) {
    throw new Error('storefront tests artifact cannot supply risk evidence')
  }
  const passedFiles = new Set(testsArtifact.testFiles
    .filter((entry) => entry?.status === 'passed')
    .map((entry) => entry.path))
  const plan = []

  for (const domain of matrix.domains ?? []) {
    if (!domain?.id) throw new Error('risk domain entry must define an id')
    if (!Array.isArray(domain.runtimeEvidence) || domain.runtimeEvidence.length < 1) {
      throw new Error(`${domain.id}: runtimeEvidence must define at least one command`)
    }
    if (!Array.isArray(domain.requiredTestFiles) || domain.requiredTestFiles.length < 1) {
      throw new Error(`${domain.id}: requiredTestFiles must define at least one path`)
    }

    for (const requiredPath of domain.requiredTestFiles) {
      if (/\.test\.(ts|tsx)$/.test(requiredPath) && !passedFiles.has(requiredPath)) {
        throw new Error(`${domain.id}: required Vitest file ${requiredPath} is absent from passed evidence`)
      }
    }

    for (const command of domain.runtimeEvidence) {
      const classified = classifyCommand(command)
      if (classified.kind === 'vitest') {
        for (const testPath of classified.paths) {
          const repositoryPath = `apps/storefront/${testPath}`
          if (!passedFiles.has(repositoryPath)) {
            throw new Error(`${domain.id}: required Vitest file ${repositoryPath} is absent from passed evidence`)
          }
        }
      }
      plan.push({
        domainId: domain.id,
        command,
        kind: classified.kind,
        status: classified.kind === 'playwright' ? 'execute' : 'reused',
        parts: classified.parts,
      })
    }
  }
  return plan
}

function buildSafeEnv() {
  const passthrough = [
    'PATH', 'HOME', 'SHELL', 'USER', 'TMPDIR', 'CI', 'TERM', 'FORCE_COLOR',
    'BNS_360_BASE_URL', 'BNS_RUNTIME_REQUIRE_ORDER_LOOKUP_STATES',
    'BNS_RUNTIME_REQUIRE_CHECKOUT_STATES', 'BNS_RUNTIME_REQUIRE_CART_STATES',
    'BSWEB_ROOT', 'TENANT_ID', 'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_MEDUSA_BACKEND_URL',
    'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STORE_URL', 'MEDUSA_BACKEND_URL',
  ]
  const env = {}
  for (const key of passthrough) if (process.env[key]) env[key] = process.env[key]

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

function buildSummary({ domains, executedCommands, reusedCommands, matrixPath, startedAt, status }) {
  return {
    schema: 'bootandstrap.risk-domain-evidence.summary/v1',
    version: 1,
    status,
    generatedAt: new Date().toISOString(),
    startedAt,
    completedAt: new Date().toISOString(),
    matrixPath: normalize(matrixPath).replace(`${ROOT_DIR}/`, ''),
    domains,
    executedCommands,
    reusedCommands,
  }
}

async function storefrontIdentity(rootDir) {
  const config = readJson(join(rootDir, 'scripts', 'assurance-tasks.json'), 'assurance task config')
  const task = config.tasks?.find((entry) => entry?.id === 'storefront-assurance')
  if (!task) throw new Error('storefront-assurance task is not declared')
  return resolveTaskIdentity(rootDir, task)
}

export async function runRiskDomainEvidence({
  rootDir = ROOT_DIR,
  matrixPath = DEFAULT_MATRIX_PATH,
  requestedDomain,
  summaryPath = process.env.RISK_DOMAIN_EVIDENCE_SUMMARY_PATH || DEFAULT_SUMMARY_PATH,
  taskReceiptPath = DEFAULT_TASK_RECEIPT_PATH,
  spawn = spawnSync,
} = {}) {
  const matrix = readJson(matrixPath, 'risk-test-matrix')
  const domains = selectedDomains(matrix, requestedDomain)
  const testsPath = join(rootDir, STOREFRONT_TESTS_OUTPUT)
  const coveragePath = join(rootDir, STOREFRONT_COVERAGE_OUTPUT)
  if (!existsSync(testsPath) || !existsSync(coveragePath)) {
    throw new Error('storefront assurance outputs are missing')
  }
  const testsArtifact = readJson(testsPath, 'storefront tests artifact')
  const receipt = readJson(taskReceiptPath, 'storefront assurance receipt')
  const currentIdentity = await storefrontIdentity(rootDir)
  validateStorefrontEvidenceReceipt({ receipt, testsArtifact, currentIdentity })

  const plan = planRiskDomainEvidence({ ...matrix, domains }, testsArtifact)
  const env = buildSafeEnv()
  const startedAt = new Date().toISOString()
  const summaryDomains = domains.map((domain) => ({
    id: domain.id,
    severity: domain.severity ?? 'unknown',
    owner: domain.owner ?? 'unknown',
    commands: [],
  }))
  const summaries = new Map(summaryDomains.map((domain) => [domain.id, domain]))
  let executedCommands = 0
  let reusedCommands = 0

  for (const entry of plan) {
    const commandStartedAt = new Date().toISOString()
    const commandSummary = {
      command: entry.command,
      evidenceKind: entry.kind,
      status: entry.status,
      startedAt: commandStartedAt,
      completedAt: new Date().toISOString(),
    }
    summaries.get(entry.domainId).commands.push(commandSummary)

    if (entry.status === 'reused') {
      reusedCommands += 1
      continue
    }

    const [executable, ...args] = entry.parts
    const result = spawn(executable, args, { cwd: rootDir, env, stdio: 'inherit', shell: false })
    commandSummary.completedAt = new Date().toISOString()
    commandSummary.exitCode = result.status
    if (result.error || result.status !== 0) {
      commandSummary.status = result.error ? 'failed_to_start' : 'failed'
      writeJsonAtomic(summaryPath, buildSummary({
        domains: summaryDomains,
        executedCommands,
        reusedCommands,
        matrixPath,
        startedAt,
        status: 'failed',
      }))
      throw new Error(`${entry.domainId}: Playwright evidence failed`)
    }
    commandSummary.status = 'passed'
    executedCommands += 1
  }

  const summary = buildSummary({
    domains: summaryDomains,
    executedCommands,
    reusedCommands,
    matrixPath,
    startedAt,
    status: 'passed',
  })
  writeJsonAtomic(summaryPath, summary)
  return summary
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    const options = parseArgs(process.argv.slice(2))
    if (options.help) {
      process.stdout.write('Usage: node scripts/run-risk-domain-evidence.mjs [--domain <id>] [--matrix <path>]\n')
    } else {
      runRiskDomainEvidence({ matrixPath: options.matrixPath, requestedDomain: options.domain })
        .then((summary) => process.stdout.write(
          `[risk-domain-evidence] OK (${summary.executedCommands} executed, ${summary.reusedCommands} reused)\n`,
        ))
        .catch((error) => {
          process.stderr.write(`[risk-domain-evidence] ${error instanceof Error ? error.message : String(error)}\n`)
          process.exitCode = 1
        })
    }
  } catch (error) {
    process.stderr.write(`[risk-domain-evidence] ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
