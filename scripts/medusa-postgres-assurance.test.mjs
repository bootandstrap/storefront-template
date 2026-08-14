import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  PINNED_POSTGRES_IMAGE,
  runMedusaPostgresAssurance,
} from './run-medusa-postgres-assurance.mjs'

const MEDUSA_PACKAGE = JSON.parse(readFileSync(new URL('../apps/medusa/package.json', import.meta.url), 'utf8'))

test('Medusa test commands exit naturally instead of masking open handles', () => {
  for (const script of ['test:unit', 'test:integration:http', 'test:integration:modules']) {
    assert.ok(MEDUSA_PACKAGE.scripts[script], `${script} must exist`)
    assert.doesNotMatch(MEDUSA_PACKAGE.scripts[script], /--forceExit\b/)
  }
})

function successfulSpawn(calls) {
  return (command, args, options) => {
    calls.push({ command, args, options })
    if (command === 'docker' && args[0] === 'port') {
      return { status: 0, stdout: '127.0.0.1:55432\n', stderr: '' }
    }
    if (command === 'docker' && args.includes('pg_isready')) {
      return { status: 0, stdout: '/var/run/postgresql:5432 - accepting connections\n', stderr: '' }
    }
    return { status: 0, stdout: '', stderr: '' }
  }
}

function passingJestReport() {
  const titles = [
    'persists and cleans up a complete local cash POS journey',
    'persists an authoritative idempotent sync acknowledgement and leaves zero residue',
    'persists partial refunds, exact replay and cumulative line-item authority',
    'serializes concurrent last-quantity reservations and rolls back before commit faults',
    'isolates tenant ledgers for shared operation and idempotency identifiers and leaves zero residue',
  ]
  return {
    success: true,
    numTotalTests: titles.length,
    numPassedTests: titles.length,
    numFailedTests: 0,
    numPendingTests: 0,
    testResults: [{
      assertionResults: titles.map((title) => ({ title, status: 'passed' })),
    }],
  }
}

function passingSemanticReport() {
  return {
    schema: 'bootandstrap.medusa-pos-semantic-report/v1',
    status: 'passed',
    balanceConservation: {
      currency: 'CHF', initialMinorUnits: 10_000, debitMinorUnits: 0,
      creditMinorUnits: 2_340, refundMinorUnits: 0, expectedFinalMinorUnits: 12_340,
      actualFinalMinorUnits: 12_340, conservationDeltaMinorUnits: 0,
      ledgerEntries: 1, concurrentOperations: 2,
    },
    deliverySemantics: {
      requestedEffects: 2, deliveredEffects: 2, duplicateEffects: 0,
      omittedEffects: 0, terminalEffects: 2, boundedRetries: 1,
    },
    responseLoss: {
      responseLossInjected: true, committedMutations: 1, replayedRequests: 1,
      duplicateMutations: 0, reconciledAfterResponseLoss: true,
    },
  }
}

test('runs Medusa integration against pinned loopback PostgreSQL and removes its exact container', async () => {
  const calls = []
  let evidence
  const result = await runMedusaPostgresAssurance({
    rootDir: '/repo',
    containerName: 'bns-pos-test-123',
    spawn: successfulSpawn(calls),
    delay: async () => {},
    readTestReport: () => passingJestReport(),
    readSemanticReport: () => passingSemanticReport(),
    writeEvidence: (_path, value) => { evidence = value },
    removeTestReport: () => {},
  })

  assert.deepEqual(result, {
    schema: 'bootandstrap.medusa-pos-postgres-assurance/v2',
    status: 'passed',
    database: 'postgresql',
    image: PINNED_POSTGRES_IMAGE,
    tests: { total: 5, passed: 5, failed: 0, skipped: 0 },
    semanticChecks: {
      tenantIsolation: {
        status: 'passed',
        crossTenantRowsObserved: 0,
        idempotencyScopeCollisions: 0,
      },
      cleanup: { status: 'passed', rowsAfterCleanup: 0, container: 'removed' },
      balanceConservation: passingSemanticReport().balanceConservation,
      deliverySemantics: passingSemanticReport().deliverySemantics,
      responseLoss: passingSemanticReport().responseLoss,
    },
  })
  assert.deepEqual(evidence, result)
  assert.ok(calls.some(({ command, args }) => command === 'docker' && args.join(' ').includes(
    `run -d --name bns-pos-test-123 -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1::5432 ${PINNED_POSTGRES_IMAGE}`,
  )))
  const integration = calls.find(({ command }) => command === 'pnpm')
  assert.equal(integration.args.slice(0, 3).join(' '), '-C apps/medusa test:integration:modules')
  assert.equal(integration.args.includes('--'), false)
  assert.ok(integration.args.includes('--json'))
  assert.ok(integration.args.some((arg) => arg.startsWith('--outputFile=')))
  assert.equal(integration.options.env.DB_HOST, '127.0.0.1')
  assert.equal(integration.options.env.DB_PORT, '55432')
  assert.equal(integration.options.env.DB_USERNAME, 'postgres')
  assert.match(integration.options.env.BNS_POS_SEMANTIC_REPORT_PATH, /\.medusa-pos-semantic-\d+\.json$/)
  assert.ok(calls.some(({ command, args }) => command === 'docker'
    && args.join(' ') === 'rm -f bns-pos-test-123'))
})

test('fails closed on integration failure and still removes the exact container', async () => {
  const calls = []
  const spawn = successfulSpawn(calls)

  await assert.rejects(
    runMedusaPostgresAssurance({
      rootDir: '/repo',
      containerName: 'bns-pos-test-failure',
      spawn(command, args, options) {
        if (command === 'pnpm') {
          calls.push({ command, args, options })
          return { status: 1, stdout: '', stderr: 'integration failed' }
        }
        return spawn(command, args, options)
      },
      delay: async () => {},
      readTestReport: () => passingJestReport(),
      readSemanticReport: () => passingSemanticReport(),
      writeEvidence: () => {},
      removeTestReport: () => {},
    }),
    /integration failed/i,
  )
  assert.ok(calls.some(({ command, args }) => command === 'docker'
    && args.join(' ') === 'rm -f bns-pos-test-failure'))
})

test('fails closed when PostgreSQL passes without the exact isolation behavior', async () => {
  const calls = []
  const report = passingJestReport()
  report.testResults[0].assertionResults = report.testResults[0].assertionResults
    .filter(({ title }) => !title.startsWith('isolates tenant ledgers'))

  await assert.rejects(runMedusaPostgresAssurance({
    rootDir: '/repo',
    containerName: 'bns-pos-test-missing-isolation',
    spawn: successfulSpawn(calls),
    delay: async () => {},
    readTestReport: () => report,
    readSemanticReport: () => passingSemanticReport(),
    writeEvidence: () => {},
    removeTestReport: () => {},
  }), /tenant isolation assertion is missing or did not pass/)
  assert.ok(calls.some(({ command, args }) => command === 'docker'
    && args.join(' ') === 'rm -f bns-pos-test-missing-isolation'))
})

test('fails closed when semantic measurements are missing or non-conserving', async () => {
  const calls = []
  await assert.rejects(runMedusaPostgresAssurance({
    rootDir: '/repo',
    containerName: 'bns-pos-test-missing-semantic',
    spawn: successfulSpawn(calls),
    delay: async () => {},
    readTestReport: () => passingJestReport(),
    readSemanticReport: () => ({
      ...passingSemanticReport(),
      balanceConservation: {
        ...passingSemanticReport().balanceConservation,
        conservationDeltaMinorUnits: 1,
      },
    }),
    writeEvidence: () => {},
    removeTestReport: () => {},
    removeSemanticReport: () => {},
  }), /balance conservation semantic report did not pass/)
  assert.ok(calls.some(({ command, args }) => command === 'docker'
    && args.join(' ') === 'rm -f bns-pos-test-missing-semantic'))
})
