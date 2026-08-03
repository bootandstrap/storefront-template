#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluateCoverage, normalizeVitestSummary } from './lib/coverage-assurance.mjs'
import { resolveTaskIdentity } from './lib/assurance-identity.mjs'

export const STOREFRONT_TESTS_OUTPUT = '.artifacts/assurance/storefront-tests.json'
export const STOREFRONT_COVERAGE_OUTPUT = '.artifacts/assurance/storefront-coverage.json'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const DEFAULT_ROOT_DIR = resolve(dirname(SCRIPT_PATH), '..')
const EXPECTED_OUTPUTS = [STOREFRONT_TESTS_OUTPUT, STOREFRONT_COVERAGE_OUTPUT]

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

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

function repoRelativeTestPath(filePath, rootDir) {
  const normalized = filePath.replaceAll('\\', '/')
  const normalizedRoot = rootDir.replaceAll('\\', '/')
  let result = normalized.startsWith(`${normalizedRoot}/`)
    ? normalized.slice(normalizedRoot.length + 1)
    : normalized
  if (result.startsWith('src/')) result = `apps/storefront/${result}`
  if (result.startsWith('apps/storefront/')) return result
  throw new Error(`Vitest reported a test file outside storefront: ${filePath}`)
}

function assertPassedVitestRun(raw) {
  const valid = [
    raw?.success === true,
    raw?.numFailedTestSuites === 0,
    raw?.numFailedTests === 0,
    Number.isInteger(raw?.numTotalTests),
    raw?.numTotalTests > 0,
    Array.isArray(raw?.testResults),
    raw?.testResults?.length > 0,
  ].every(Boolean)
  if (!valid) throw new Error('Vitest JSON does not prove a passed non-empty test run')
}

function normalizeVitestTestFile(entry, rootDir) {
  if (entry?.status !== 'passed' || typeof entry?.name !== 'string') {
    throw new Error('Vitest JSON contains a non-passed or malformed test file')
  }
  const assertions = Array.isArray(entry.assertionResults) ? entry.assertionResults : []
  if (assertions.some((assertion) => assertion?.status === 'failed')) {
    throw new Error(`Vitest JSON contains failed assertions in ${entry.name}`)
  }
  return {
    path: repoRelativeTestPath(entry.name, rootDir),
    status: 'passed',
    tests: assertions.length,
    passedTests: assertions.filter((assertion) => assertion?.status === 'passed').length,
    pendingTests: assertions.filter((assertion) => assertion?.status === 'pending').length,
  }
}

export function normalizeVitestResults(raw, rootDir) {
  assertPassedVitestRun(raw)
  const testFiles = raw.testResults
    .map((entry) => normalizeVitestTestFile(entry, rootDir))
    .sort((left, right) => left.path.localeCompare(right.path))

  if (new Set(testFiles.map(({ path }) => path)).size !== testFiles.length) {
    throw new Error('Vitest JSON contains duplicate test file results')
  }

  return {
    summary: {
      testFiles: testFiles.length,
      totalTests: raw.numTotalTests,
      passedTests: raw.numPassedTests,
      pendingTests: raw.numPendingTests,
    },
    testFiles,
  }
}

async function currentIdentity(rootDir) {
  const tasks = readJson(join(rootDir, 'scripts', 'assurance-tasks.json'), 'assurance task config')
  const task = tasks.tasks?.find((entry) => entry?.id === 'storefront-assurance')
  if (!task) throw new Error('storefront-assurance task is not declared')
  return resolveTaskIdentity(rootDir, task)
}

function assertIdentity(value, label) {
  if (
    !value ||
    !/^[0-9a-f]{40}$/.test(value.revision) ||
    !/^[0-9a-f]{64}$/.test(value.workingTreeSha256) ||
    !/^[0-9a-f]{64}$/.test(value.inputsSha256)
  ) {
    throw new Error(`${label} has malformed revision, dirty-tree, or input hashes`)
  }
}

function hasValidReceiptIdentity(receipt) {
  return [
    receipt?.schema === 'bootandstrap.assurance-task/v1',
    receipt?.status === 'passed',
    receipt?.taskId === 'storefront-assurance',
    typeof receipt?.profile === 'string',
    typeof receipt?.claimBoundary === 'string',
  ].every(Boolean)
}

function hasValidReceiptTiming(receipt) {
  const startedAt = Date.parse(receipt?.startedAt)
  const completedAt = Date.parse(receipt?.completedAt)
  return [
    Number.isFinite(startedAt),
    Number.isFinite(completedAt),
    completedAt >= startedAt,
  ].every(Boolean)
}

function hasValidReceiptShape(receipt) {
  return [
    hasValidReceiptIdentity(receipt),
    hasValidReceiptTiming(receipt),
    Array.isArray(receipt?.environmentKeys),
    receipt?.outputSha256 && typeof receipt.outputSha256 === 'object' && !Array.isArray(receipt.outputSha256),
    JSON.stringify(receipt?.outputs) === JSON.stringify(EXPECTED_OUTPUTS),
    ['command', 'environment', 'stdout', 'stderr', 'output']
      .every((field) => receipt?.[field] === undefined),
  ].every(Boolean)
}

function assertOutputHash(receipt, outputSha256, outputPath) {
  const receiptHash = receipt?.outputSha256?.[outputPath]
  const actualHash = outputSha256?.[outputPath]
  if (!/^[0-9a-f]{64}$/.test(receiptHash) || receiptHash !== actualHash) {
    throw new Error(`storefront assurance output hash mismatch: ${outputPath}`)
  }
}

export function hashEvidenceFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function assertMatchingIdentity(source, expected, label, additionalSource) {
  for (const field of ['revision', 'workingTreeSha256', 'inputsSha256']) {
    const matchesExpected = source[field] === expected[field]
    const matchesAdditional = additionalSource === undefined || source[field] === additionalSource[field]
    if (!matchesExpected || !matchesAdditional) throw new Error(`${label} ${field} mismatch`)
  }
}

function isValidTestsArtifact(testsArtifact) {
  return [
    testsArtifact?.schema === 'bootandstrap.storefront-tests/v1',
    testsArtifact?.status === 'passed',
    Array.isArray(testsArtifact?.testFiles),
    testsArtifact?.testFiles?.length > 0,
    testsArtifact?.testFiles?.every((entry) =>
      entry?.status === 'passed' && typeof entry?.path === 'string',
    ),
  ].every(Boolean)
}

export function validateStorefrontEvidenceReceipt({
  receipt,
  testsArtifact,
  currentIdentity,
  outputSha256,
}) {
  if (!hasValidReceiptShape(receipt)) {
    throw new Error('storefront assurance receipt is missing, malformed, or failed')
  }

  assertIdentity(currentIdentity, 'current storefront identity')
  assertMatchingIdentity(receipt, currentIdentity, 'storefront assurance receipt')
  for (const outputPath of EXPECTED_OUTPUTS) assertOutputHash(receipt, outputSha256, outputPath)

  if (!isValidTestsArtifact(testsArtifact)) {
    throw new Error('storefront tests artifact is missing, malformed, or failed')
  }
  assertMatchingIdentity(testsArtifact, currentIdentity, 'storefront tests artifact', receipt)
}

function hasValidCoverageArtifact(coverageArtifact) {
  return [
    coverageArtifact?.schema !== 'bootandstrap.storefront-coverage/v1' ||
    coverageArtifact?.status !== 'passed',
    !Array.isArray(coverageArtifact?.failures),
    coverageArtifact?.failures?.length !== 0,
  ].every((invalid) => invalid === false)
}

function assertCoverageIdentity(coverageArtifact, expectedIdentity) {
  for (const field of ['revision', 'workingTreeSha256', 'inputsSha256']) {
    if (coverageArtifact[field] !== expectedIdentity[field]) {
      throw new Error(`storefront coverage artifact ${field} mismatch`)
    }
  }
}

export function validateCoverageEvidence(coverageArtifact, expectedIdentity, integrity) {
  if (!hasValidCoverageArtifact(coverageArtifact)) {
    throw new Error('storefront coverage artifact is missing, malformed, or failed')
  }
  assertIdentity(expectedIdentity, 'current storefront identity')
  assertCoverageIdentity(coverageArtifact, expectedIdentity)
  assertOutputHash(integrity?.receipt, integrity?.outputSha256, STOREFRONT_COVERAGE_OUTPUT)
}

function executeStorefrontVitest(spawn, rootDir, args, rawTestsPath, coverageSummaryPath) {
  const result = spawn('pnpm', args, {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
  })
  if (result?.error) throw result.error
  if (result?.status !== 0) throw new Error(`storefront Vitest assurance exited ${result?.status}`)
  if (!existsSync(rawTestsPath)) throw new Error('Vitest JSON result was not generated')
  if (!existsSync(coverageSummaryPath)) throw new Error('V8 coverage summary was not generated')
}

function generateStorefrontArtifacts({
  rootDir,
  policyPath,
  rawTestsPath,
  coverageSummaryPath,
  resolvedIdentity,
  testsOutputPath,
  coverageOutputPath,
}) {
  const policySource = readFileSync(policyPath, 'utf8')
  const policy = JSON.parse(policySource)
  const normalizedTests = normalizeVitestResults(readJson(rawTestsPath, 'Vitest JSON result'), rootDir)
  const normalizedCoverage = normalizeVitestSummary(
    readJson(coverageSummaryPath, 'V8 coverage summary'),
    rootDir,
  )
  const evaluation = evaluateCoverage(policy, normalizedCoverage)
  const generatedAt = new Date().toISOString()
  writeJsonAtomic(testsOutputPath, {
    schema: 'bootandstrap.storefront-tests/v1',
    status: 'passed',
    generatedAt,
    ...resolvedIdentity,
    ...normalizedTests,
  })
  writeJsonAtomic(coverageOutputPath, {
    schema: 'bootandstrap.storefront-coverage/v1',
    generatedAt,
    ...resolvedIdentity,
    policyId: policy.policyId,
    policySha256: sha256(policySource),
    claimBoundary: policy.claimBoundary,
    ...evaluation,
  })
  if (evaluation.status !== 'passed') {
    throw new Error(`coverage assurance failed: ${evaluation.failures.join('; ')}`)
  }
  return { normalizedTests, evaluation }
}

export async function runStorefrontAssurance({
  rootDir = DEFAULT_ROOT_DIR,
  identity,
  spawn = spawnSync,
} = {}) {
  const policyPath = join(rootDir, 'scripts', 'assurance-policy.json')
  const configPath = join(rootDir, 'apps', 'storefront', 'vitest.config.ts')
  if (!existsSync(policyPath)) throw new Error('assurance policy is missing')
  if (!existsSync(configPath)) throw new Error('storefront Vitest config is missing')

  const resolvedIdentity = identity ?? await currentIdentity(rootDir)
  assertIdentity(resolvedIdentity, 'storefront assurance identity')
  const startedAt = new Date().toISOString()
  const artifactDir = join(rootDir, '.artifacts', 'assurance')
  const receiptPath = join(artifactDir, 'tasks', 'storefront-assurance.json')
  const rawTestsPath = join(artifactDir, `.storefront-tests.raw.${process.pid}.json`)
  const coverageDir = join(rootDir, 'apps', 'storefront', 'coverage')
  const coverageSummaryPath = join(coverageDir, 'coverage-summary.json')
  const testsOutputPath = join(rootDir, STOREFRONT_TESTS_OUTPUT)
  const coverageOutputPath = join(rootDir, STOREFRONT_COVERAGE_OUTPUT)
  mkdirSync(artifactDir, { recursive: true })
  rmSync(rawTestsPath, { force: true })
  rmSync(coverageSummaryPath, { force: true })

  const args = [
    '--filter=storefront',
    'exec',
    'vitest',
    'run',
    '--coverage',
    '--reporter=json',
    '--outputFile', rawTestsPath,
    '--coverage.reportsDirectory', coverageDir,
    '--coverage.reporter=text',
    '--coverage.reporter=html',
    '--coverage.reporter=lcov',
    '--coverage.reporter=json-summary',
    '--no-file-parallelism',
    '--maxWorkers=1',
  ]
  try {
    executeStorefrontVitest(spawn, rootDir, args, rawTestsPath, coverageSummaryPath)
    const { normalizedTests, evaluation } = generateStorefrontArtifacts({
      rootDir,
      policyPath,
      rawTestsPath,
      coverageSummaryPath,
      resolvedIdentity,
      testsOutputPath,
      coverageOutputPath,
    })
    const policy = readJson(policyPath, 'assurance policy')
    writeJsonAtomic(receiptPath, {
      schema: 'bootandstrap.assurance-task/v1',
      profile: 'full',
      claimBoundary: policy.claimBoundary,
      taskId: 'storefront-assurance',
      ...resolvedIdentity,
      outputs: EXPECTED_OUTPUTS,
      outputSha256: Object.fromEntries(EXPECTED_OUTPUTS.map((relativePath) => [
        relativePath,
        sha256(readFileSync(join(rootDir, relativePath))),
      ])),
      environmentKeys: process.env.CI === undefined ? [] : ['CI'],
      status: 'passed',
      startedAt,
      completedAt: new Date().toISOString(),
    })
    return {
      status: 'passed',
      tests: normalizedTests.summary,
      coverage: evaluation.totals,
      outputs: EXPECTED_OUTPUTS,
    }
  } finally {
    rmSync(rawTestsPath, { force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runStorefrontAssurance()
    .then((summary) => process.stdout.write(`${JSON.stringify(summary)}\n`))
    .catch((error) => {
      process.stderr.write(`[storefront-assurance] ${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
