#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PINNED_POSTGRES_IMAGE = 'postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const DEFAULT_ROOT_DIR = resolve(dirname(SCRIPT_PATH), '..')
const DEFAULT_DELAY = (milliseconds) => new Promise((resolveDelay) => {
  setTimeout(resolveDelay, milliseconds)
})
const ISOLATION_ASSERTION = 'isolates tenant ledgers for shared operation and idempotency identifiers and leaves zero residue'
const CLEANUP_ASSERTIONS = [
  'persists and cleans up a complete local cash POS journey',
  'persists an authoritative idempotent sync acknowledgement and leaves zero residue',
  'persists partial refunds, exact replay and cumulative line-item authority',
  'serializes concurrent last-quantity reservations and rolls back before commit faults',
  ISOLATION_ASSERTION,
]

function defaultReadTestReport(reportPath) {
  return JSON.parse(readFileSync(reportPath, 'utf8'))
}

function defaultReadSemanticReport(reportPath) {
  return JSON.parse(readFileSync(reportPath, 'utf8'))
}

function defaultWriteEvidence(outputPath, value) {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}

function execute(spawn, command, args, options = {}) {
  const result = spawn(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
    ...options,
  })
  if (result?.error?.code === 'ENOENT') {
    throw new Error(`${command} is unavailable; PostgreSQL assurance fails closed`)
  }
  if (result?.error) throw result.error
  return result
}

function requireSuccess(result, operation) {
  if (result.status === 0) return
  const detail = result.stderr?.trim() || result.stdout?.trim() || `exit code ${result.status}`
  throw new Error(`${operation}: ${detail}`)
}

function parseLoopbackPort(stdout) {
  const match = /^127\.0\.0\.1:(\d+)$/m.exec(stdout?.trim() ?? '')
  if (!match) throw new Error('Docker did not publish PostgreSQL on a loopback port')
  return match[1]
}

async function waitForPostgres(spawn, containerName, delay) {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const ready = execute(spawn, 'docker', [
      'exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres',
    ])
    if (ready.status === 0) return
    await delay(250)
  }
  throw new Error('PostgreSQL did not become ready within 10 seconds')
}

function assertContainerName(containerName) {
  if (!/^bns-pos-[a-z0-9-]+$/.test(containerName)) {
    throw new Error('unsafe PostgreSQL assurance container name')
  }
}

function summarizeTestReport(report) {
  if (!report || typeof report !== 'object' || report.success !== true) {
    throw new Error('PostgreSQL integration report did not pass')
  }
  const counts = {
    total: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    skipped: report.numPendingTests,
  }
  if (!Object.values(counts).every(Number.isSafeInteger)
    || counts.total <= 0
    || counts.passed !== counts.total
    || counts.failed !== 0
    || counts.skipped !== 0) {
    throw new Error('PostgreSQL integration test counts are incomplete')
  }
  const assertions = (Array.isArray(report.testResults) ? report.testResults : [])
    .flatMap((suite) => Array.isArray(suite?.assertionResults) ? suite.assertionResults : [])
  const passedTitles = new Set(assertions
    .filter((assertion) => assertion?.status === 'passed' && typeof assertion.title === 'string')
    .map((assertion) => assertion.title))
  if (!passedTitles.has(ISOLATION_ASSERTION)) {
    throw new Error('tenant isolation assertion is missing or did not pass')
  }
  const missingCleanup = CLEANUP_ASSERTIONS.filter((title) => !passedTitles.has(title))
  if (missingCleanup.length > 0) {
    throw new Error(`zero-residue assertion is missing or did not pass: ${missingCleanup.join(', ')}`)
  }
  return counts
}

function requireSafeInteger(value, label, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || (positive ? value <= 0 : value < 0)) {
    throw new Error(`${label} semantic report is invalid`)
  }
  return value
}

function summarizeSemanticReport(report) {
  if (!report || typeof report !== 'object'
    || report.schema !== 'bootandstrap.medusa-pos-semantic-report/v1'
    || report.status !== 'passed') {
    throw new Error('POS semantic report did not pass')
  }
  const balance = report.balanceConservation
  if (!balance || typeof balance !== 'object' || !/^[A-Z]{3}$/.test(balance.currency ?? '')) {
    throw new Error('balance conservation semantic report did not pass')
  }
  const initial = requireSafeInteger(balance.initialMinorUnits, 'balance initial')
  const debit = requireSafeInteger(balance.debitMinorUnits, 'balance debit')
  const credit = requireSafeInteger(balance.creditMinorUnits, 'balance credit')
  const refund = requireSafeInteger(balance.refundMinorUnits, 'balance refund')
  const expected = requireSafeInteger(balance.expectedFinalMinorUnits, 'balance expected')
  const actual = requireSafeInteger(balance.actualFinalMinorUnits, 'balance actual')
  const delta = balance.conservationDeltaMinorUnits
  if (!Number.isSafeInteger(delta)
    || expected !== initial + credit - debit - refund
    || actual !== expected
    || delta !== actual - expected
    || delta !== 0
    || requireSafeInteger(balance.ledgerEntries, 'balance ledger entries', { positive: true }) < 1
    || requireSafeInteger(balance.concurrentOperations, 'balance concurrency', { positive: true }) < 2) {
    throw new Error('balance conservation semantic report did not pass')
  }

  const delivery = report.deliverySemantics
  if (!delivery || typeof delivery !== 'object') throw new Error('delivery semantics semantic report did not pass')
  const requested = requireSafeInteger(delivery.requestedEffects, 'requested effects', { positive: true })
  const delivered = requireSafeInteger(delivery.deliveredEffects, 'delivered effects')
  const terminal = requireSafeInteger(delivery.terminalEffects, 'terminal effects')
  if (delivered !== requested
    || terminal !== requested
    || requireSafeInteger(delivery.duplicateEffects, 'duplicate effects') !== 0
    || requireSafeInteger(delivery.omittedEffects, 'omitted effects') !== 0) {
    throw new Error('delivery semantics semantic report did not pass')
  }
  requireSafeInteger(delivery.boundedRetries, 'bounded retries')

  const responseLoss = report.responseLoss
  if (!responseLoss || typeof responseLoss !== 'object'
    || responseLoss.responseLossInjected !== true
    || requireSafeInteger(responseLoss.committedMutations, 'committed mutations', { positive: true }) !== 1
    || requireSafeInteger(responseLoss.replayedRequests, 'replayed requests', { positive: true }) < 1
    || requireSafeInteger(responseLoss.duplicateMutations, 'duplicate mutations') !== 0
    || responseLoss.reconciledAfterResponseLoss !== true) {
    throw new Error('response loss semantic report did not pass')
  }
  return {
    balanceConservation: balance,
    deliverySemantics: delivery,
    responseLoss,
  }
}

export async function runMedusaPostgresAssurance({
  rootDir = DEFAULT_ROOT_DIR,
  containerName = `bns-pos-assurance-${process.pid}`,
  spawn = spawnSync,
  delay = DEFAULT_DELAY,
  readTestReport = defaultReadTestReport,
  readSemanticReport = defaultReadSemanticReport,
  writeEvidence = defaultWriteEvidence,
  removeTestReport = (reportPath) => rmSync(reportPath, { force: true }),
  removeSemanticReport = (reportPath) => rmSync(reportPath, { force: true }),
  evidencePath = join(rootDir, '.artifacts/assurance/medusa-pos-postgres.json'),
  testReportPath = join(rootDir, `.artifacts/assurance/.medusa-pos-postgres-jest-${process.pid}.json`),
  semanticReportPath = join(rootDir, `.artifacts/assurance/.medusa-pos-semantic-${process.pid}.json`),
} = {}) {
  assertContainerName(containerName)
  let started = false
  let failure
  let testCounts
  let semanticChecks

  try {
    requireSuccess(
      execute(spawn, 'docker', ['version', '--format', '{{.Server.Version}}']),
      'Docker daemon is unavailable',
    )
    requireSuccess(execute(spawn, 'docker', [
      'run', '-d', '--name', containerName,
      '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
      '-p', '127.0.0.1::5432',
      PINNED_POSTGRES_IMAGE,
    ]), 'PostgreSQL container could not start')
    started = true

    const portResult = execute(spawn, 'docker', ['port', containerName, '5432/tcp'])
    requireSuccess(portResult, 'PostgreSQL port lookup failed')
    const port = parseLoopbackPort(portResult.stdout)
    await waitForPostgres(spawn, containerName, delay)

    const integration = execute(spawn, 'pnpm', [
      '-C', 'apps/medusa', 'test:integration:modules',
      '--json', `--outputFile=${testReportPath}`,
    ], {
      cwd: rootDir,
      env: {
        ...process.env,
        DB_HOST: '127.0.0.1',
        DB_PORT: port,
        DB_USERNAME: 'postgres',
        BNS_POS_SEMANTIC_REPORT_PATH: semanticReportPath,
      },
    })
    requireSuccess(integration, 'Medusa POS PostgreSQL integration failed')
    if (integration.stdout) process.stdout.write(integration.stdout)
    if (integration.stderr) process.stderr.write(integration.stderr)
    testCounts = summarizeTestReport(readTestReport(testReportPath))
    semanticChecks = summarizeSemanticReport(readSemanticReport(semanticReportPath))
  } catch (error) {
    failure = error instanceof Error ? error : new Error(String(error))
  } finally {
    try {
      removeTestReport(testReportPath)
    } catch (error) {
      const reportCleanupFailure = error instanceof Error ? error : new Error(String(error))
      failure = failure
        ? new Error(`${failure.message}; ${reportCleanupFailure.message}`)
        : reportCleanupFailure
    }
    try {
      removeSemanticReport(semanticReportPath)
    } catch (error) {
      const semanticCleanupFailure = error instanceof Error ? error : new Error(String(error))
      failure = failure
        ? new Error(`${failure.message}; ${semanticCleanupFailure.message}`)
        : semanticCleanupFailure
    }
    if (started) {
      const cleanup = execute(spawn, 'docker', ['rm', '-f', containerName])
      if (cleanup.status !== 0) {
        const cleanupFailure = new Error('PostgreSQL assurance container cleanup failed')
        failure = failure
          ? new Error(`${failure.message}; ${cleanupFailure.message}`)
          : cleanupFailure
      }
    }
  }

  if (failure) throw failure
  const result = {
    schema: 'bootandstrap.medusa-pos-postgres-assurance/v2',
    status: 'passed',
    database: 'postgresql',
    image: PINNED_POSTGRES_IMAGE,
    tests: testCounts,
    semanticChecks: {
      tenantIsolation: {
        status: 'passed',
        crossTenantRowsObserved: 0,
        idempotencyScopeCollisions: 0,
      },
      cleanup: { status: 'passed', rowsAfterCleanup: 0, container: 'removed' },
      ...semanticChecks,
    },
  }
  writeEvidence(evidencePath, result)
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runMedusaPostgresAssurance()
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(`[medusa-postgres-assurance] ${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
