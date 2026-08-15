import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  STOREFRONT_COVERAGE_OUTPUT,
  STOREFRONT_TESTS_OUTPUT,
  runStorefrontAssurance,
  validateStorefrontEvidenceReceipt,
} from './run-storefront-assurance.mjs'
import { planRiskDomainEvidence } from './run-risk-domain-evidence.mjs'

const assuranceTasks = JSON.parse(
  readFileSync(new URL('./assurance-tasks.json', import.meta.url), 'utf8'),
)

const identity = {
  revision: 'a'.repeat(40),
  workingTreeSha256: 'b'.repeat(64),
  inputsSha256: 'c'.repeat(64),
}
const outputSha256 = {
  [STOREFRONT_TESTS_OUTPUT]: '1'.repeat(64),
  [STOREFRONT_COVERAGE_OUTPUT]: '2'.repeat(64),
}

function makeRoot() {
  const rootDir = mkdtempSync(join(tmpdir(), 'bns-storefront-assurance-'))
  mkdirSync(join(rootDir, 'apps', 'storefront'), { recursive: true })
  mkdirSync(join(rootDir, 'scripts'), { recursive: true })
  writeFileSync(join(rootDir, 'apps', 'storefront', 'vitest.config.ts'), 'export default {}\n')
  writeFileSync(join(rootDir, 'scripts', 'assurance-policy.json'), `${JSON.stringify({
    policyId: 'test-policy/v1',
    claimBoundary: 'local_runtime_assurance_without_commercial_activation',
    globalRatchet: { baseline: { lines: 0, functions: 0, branches: 0 }, maximumRegression: 0 },
    criticalDomains: [],
  })}\n`)
  return rootDir
}

function rawVitest(testFiles = ['apps/storefront/src/lib/example/__tests__/example.test.ts']) {
  return {
    success: true,
    numTotalTestSuites: testFiles.length,
    numPassedTestSuites: testFiles.length,
    numFailedTestSuites: 0,
    numTotalTests: testFiles.length,
    numPassedTests: testFiles.length,
    numFailedTests: 0,
    numPendingTests: 0,
    testResults: testFiles.map((relativePath) => ({
      name: relativePath,
      status: 'passed',
      assertionResults: [{ status: 'passed', title: 'passes' }],
    })),
  }
}

function rawCoverage() {
  const metric = { total: 1, covered: 1, skipped: 0, pct: 100 }
  return {
    total: { lines: metric, functions: metric, branches: metric, statements: metric },
    'apps/storefront/src/lib/example.ts': {
      lines: metric,
      functions: metric,
      branches: metric,
      statements: metric,
    },
  }
}

function passedReceipt(overrides = {}) {
  return {
    schema: 'bootandstrap.assurance-task/v1',
    status: 'passed',
    taskId: 'storefront-assurance',
    profile: 'full',
    claimBoundary: 'local_runtime_assurance_without_commercial_activation',
    ...identity,
    outputs: [STOREFRONT_TESTS_OUTPUT, STOREFRONT_COVERAGE_OUTPUT],
    outputSha256,
    environmentKeys: [],
    startedAt: '2026-08-03T10:00:00.000Z',
    completedAt: '2026-08-03T10:00:01.000Z',
    ...overrides,
  }
}

function passedTestsArtifact(testFiles = ['apps/storefront/src/lib/example/__tests__/example.test.ts']) {
  return {
    schema: 'bootandstrap.storefront-tests/v1',
    status: 'passed',
    ...identity,
    summary: { testFiles: testFiles.length, totalTests: testFiles.length, passedTests: testFiles.length },
    testFiles: testFiles.map((path) => ({ path, status: 'passed', tests: 1, passedTests: 1 })),
  }
}

test('one Vitest invocation emits passed unit and coverage evidence', async () => {
  const rootDir = makeRoot()
  const calls = []
  const spawn = (executable, args) => {
    calls.push({ executable, args })
    const outputFile = args[args.indexOf('--outputFile') + 1]
    const coverageDir = args[args.indexOf('--coverage.reportsDirectory') + 1]
    mkdirSync(coverageDir, { recursive: true })
    writeFileSync(outputFile, `${JSON.stringify(rawVitest())}\n`)
    writeFileSync(join(coverageDir, 'coverage-summary.json'), `${JSON.stringify(rawCoverage())}\n`)
    return { status: 0, stdout: '', stderr: '' }
  }

  const result = await runStorefrontAssurance({ rootDir, identity, spawn })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].executable, 'pnpm')
  assert.ok(calls[0].args.includes('vitest'))
  assert.ok(calls[0].args.includes('--coverage'))
  assert.ok(calls[0].args.includes('--reporter=json'))
  assert.ok(calls[0].args.includes('--coverage.reporter=json-summary'))
  assert.equal(result.status, 'passed')

  const tests = JSON.parse(readFileSync(join(rootDir, STOREFRONT_TESTS_OUTPUT), 'utf8'))
  const coverage = JSON.parse(readFileSync(join(rootDir, STOREFRONT_COVERAGE_OUTPUT), 'utf8'))
  const receipt = JSON.parse(readFileSync(
    join(rootDir, '.artifacts', 'assurance', 'tasks', 'storefront-assurance.json'),
    'utf8',
  ))
  assert.equal(tests.status, 'passed')
  assert.equal(coverage.status, 'passed')
  assert.equal(receipt.status, 'passed')
  assert.deepEqual(receipt.outputs, [STOREFRONT_TESTS_OUTPUT, STOREFRONT_COVERAGE_OUTPUT])
  assert.equal(receipt.outputSha256[STOREFRONT_TESTS_OUTPUT].length, 64)
  assert.equal(receipt.outputSha256[STOREFRONT_COVERAGE_OUTPUT].length, 64)
  assert.deepEqual(
    { revision: tests.revision, workingTreeSha256: tests.workingTreeSha256, inputsSha256: tests.inputsSha256 },
    identity,
  )
})

test('replaces stale passed outputs with revision-bound failed Vitest evidence', async () => {
  const rootDir = makeRoot()
  const testsOutputPath = join(rootDir, STOREFRONT_TESTS_OUTPUT)
  const coverageOutputPath = join(rootDir, STOREFRONT_COVERAGE_OUTPUT)
  mkdirSync(join(rootDir, '.artifacts', 'assurance'), { recursive: true })
  writeFileSync(testsOutputPath, '{"status":"passed","stale":true}\n')
  writeFileSync(coverageOutputPath, '{"status":"passed","stale":true}\n')
  const spawn = (_executable, args) => {
    const outputFile = args[args.indexOf('--outputFile') + 1]
    const failed = rawVitest()
    failed.success = false
    failed.numPassedTestSuites = 0
    failed.numFailedTestSuites = 1
    failed.numPassedTests = 0
    failed.numFailedTests = 1
    failed.testResults[0].status = 'failed'
    failed.testResults[0].assertionResults[0].status = 'failed'
    writeFileSync(outputFile, `${JSON.stringify(failed)}\n`)
    return { status: 1, signal: null }
  }

  await assert.rejects(
    runStorefrontAssurance({ rootDir, identity, spawn }),
    /status=1.*tests=failed\(1\).*coverage=missing/,
  )

  const failedTests = JSON.parse(readFileSync(testsOutputPath, 'utf8'))
  assert.equal(failedTests.schema, 'bootandstrap.storefront-tests/v1')
  assert.equal(failedTests.status, 'failed')
  assert.deepEqual(
    { revision: failedTests.revision, workingTreeSha256: failedTests.workingTreeSha256, inputsSha256: failedTests.inputsSha256 },
    identity,
  )
  assert.deepEqual(failedTests.summary, {
    testFiles: 1,
    totalTests: 1,
    passedTests: 0,
    failedTests: 1,
    pendingTests: 0,
  })
  assert.deepEqual(failedTests.failures, [{
    path: 'apps/storefront/src/lib/example/__tests__/example.test.ts',
    failedTests: 1,
  }])
  assert.equal(existsSync(coverageOutputPath), false)
})

test('reuses storefront evidence only for a passed receipt with exact identity hashes', () => {
  assert.doesNotThrow(() => validateStorefrontEvidenceReceipt({
    receipt: passedReceipt(),
    testsArtifact: passedTestsArtifact(),
    currentIdentity: identity,
    outputSha256,
  }))

  const invalidCases = [
    undefined,
    {},
    passedReceipt({ status: 'failed' }),
    passedReceipt({ revision: 'd'.repeat(40) }),
    passedReceipt({ workingTreeSha256: 'e'.repeat(64) }),
    passedReceipt({ inputsSha256: 'f'.repeat(64) }),
    passedReceipt({ outputs: [STOREFRONT_TESTS_OUTPUT] }),
    passedReceipt({ completedAt: 'not-a-date' }),
    passedReceipt({ stdout: 'must not be persisted' }),
  ]
  for (const receipt of invalidCases) {
    assert.throws(() => validateStorefrontEvidenceReceipt({
      receipt,
      testsArtifact: passedTestsArtifact(),
      currentIdentity: identity,
      outputSha256,
    }), /storefront assurance receipt/i)
  }

  assert.throws(() => validateStorefrontEvidenceReceipt({
    receipt: passedReceipt(),
    testsArtifact: { ...passedTestsArtifact(), status: 'failed' },
    currentIdentity: identity,
    outputSha256,
  }), /storefront tests artifact/i)

  assert.throws(() => validateStorefrontEvidenceReceipt({
    receipt: passedReceipt(),
    testsArtifact: passedTestsArtifact(),
    currentIdentity: identity,
    outputSha256: { ...outputSha256, [STOREFRONT_TESTS_OUTPUT]: '3'.repeat(64) },
  }), /output hash/i)
})

test('fails closed when a required Vitest file is absent from the passed result', () => {
  const matrix = {
    domains: [{
      id: 'critical-domain',
      runtimeEvidence: [
        'pnpm --filter=storefront exec vitest run src/lib/critical/__tests__/guard.test.ts',
      ],
      requiredTestFiles: [
        'apps/storefront/src/lib/critical/__tests__/guard.test.ts',
      ],
    }],
  }

  assert.throws(
    () => planRiskDomainEvidence(matrix, passedTestsArtifact()),
    /required Vitest file.*guard\.test\.ts.*absent/i,
  )
})

test('reuses passed Vitest files but keeps Playwright as separate executable evidence', () => {
  const unitPath = 'apps/storefront/src/lib/critical/__tests__/guard.test.ts'
  const matrix = {
    domains: [{
      id: 'mixed-domain',
      runtimeEvidence: [
        'pnpm --filter=storefront exec vitest run src/lib/critical/__tests__/guard.test.ts',
        'pnpm --filter=storefront exec playwright test e2e/runtime-visual-evidence.spec.ts',
      ],
      requiredTestFiles: [
        unitPath,
        'apps/storefront/e2e/runtime-visual-evidence.spec.ts',
      ],
    }],
  }

  const plan = planRiskDomainEvidence(matrix, passedTestsArtifact([unitPath]))

  assert.deepEqual(plan.map(({ kind, status }) => ({ kind, status })), [
    { kind: 'vitest', status: 'reused' },
    { kind: 'playwright', status: 'execute' },
  ])
})

test('executes Medusa unit and PostgreSQL evidence inside the POS risk receipt', () => {
  const matrix = {
    domains: [{
      id: 'pos-simulator',
      runtimeEvidence: [
        'pnpm --dir apps/medusa test:unit -- src/api/admin/__tests__/pos-refunds-route.unit.spec.ts',
        'node scripts/run-medusa-postgres-assurance.mjs',
      ],
      requiredTestFiles: [
        'apps/medusa/src/api/admin/__tests__/pos-refunds-route.unit.spec.ts',
      ],
    }],
  }

  const plan = planRiskDomainEvidence(matrix, passedTestsArtifact())

  assert.deepEqual(plan.map(({ kind, status }) => ({ kind, status })), [
    { kind: 'medusa-unit', status: 'execute' },
    { kind: 'medusa-postgres', status: 'execute' },
  ])
})

test('risk-domain task binds its normalized summary as receipt output', () => {
  const task = assuranceTasks.tasks.find(({ id }) => id === 'risk-domain-evidence')

  assert.deepEqual(task.outputs, ['.artifacts/assurance/risk-domain-evidence.json'])
})

test('rejects missing or unsafe runtime evidence before execution', () => {
  const tests = passedTestsArtifact()
  assert.throws(
    () => planRiskDomainEvidence({
      domains: [{ id: 'missing', runtimeEvidence: [], requiredTestFiles: ['example.test.ts'] }],
    }, tests),
    /runtimeEvidence must define at least one command/i,
  )
  assert.throws(
    () => planRiskDomainEvidence({
      domains: [{
        id: 'unsafe',
        runtimeEvidence: ['node scripts/unsafe-command.mjs'],
        requiredTestFiles: ['apps/storefront/src/lib/example/__tests__/example.test.ts'],
      }],
    }, tests),
    /unsupported runtimeEvidence command/i,
  )
})

test('tenant CI produces sealed storefront evidence before consuming it', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  )
  const producer = workflow.indexOf('node scripts/run-storefront-assurance.mjs')
  const consumer = workflow.indexOf('node scripts/run-risk-domain-evidence.mjs')

  assert.notEqual(producer, -1, 'CI must run the storefront assurance producer')
  assert.notEqual(consumer, -1, 'CI must run the risk-domain evidence consumer')
  assert.ok(producer < consumer, 'CI must produce sealed storefront evidence before consuming it')
  assert.match(
    workflow,
    /path: \.artifacts\/ci\/BOOTANDSTRAP_WEB/,
    'CI must keep the canonical BSWEB checkout outside the tenant worktree identity',
  )
  assert.match(
    workflow,
    /BSWEB_ROOT: \$\{\{ github\.workspace \}\}\/\.artifacts\/ci\/BOOTANDSTRAP_WEB/,
    'CI must consume the ignored canonical BSWEB checkout',
  )
})
