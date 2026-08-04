import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateCoverage } from './lib/coverage-assurance.mjs'
import {
  STOREFRONT_COVERAGE_OUTPUT,
  validateCoverageEvidence,
} from './run-storefront-assurance.mjs'

const policy = {
  globalRatchet: {
    baseline: { lines: 40, functions: 35, branches: 30 },
    maximumRegression: 0,
  },
  criticalDomains: [
    {
      id: 'critical-domain',
      sourceSelectors: [{ prefix: 'apps/storefront/src/lib/critical/' }],
      ratchetThresholds: { lines: 60, functions: 50, branches: 40 },
      maxZeroCoverageFiles: 0,
    },
  ],
}

const passingCoverage = {
  totals: { lines: 50, functions: 45, branches: 35 },
  files: {
    'apps/storefront/src/lib/critical/guard.ts': {
      lines: 80,
      functions: 70,
      branches: 60,
      executableLines: 10,
    },
  },
}

test('accepts coverage that satisfies global and critical ratchets', () => {
  const result = evaluateCoverage(policy, passingCoverage)
  assert.equal(result.status, 'passed')
  assert.deepEqual(result.failures, [])
})

test('fails when global coverage regresses', () => {
  const result = evaluateCoverage(policy, {
    ...passingCoverage,
    totals: { lines: 39.99, functions: 45, branches: 35 },
  })
  assert.equal(result.status, 'failed')
  assert.match(result.failures.join('\n'), /global lines.*39\.99.*40/)
})

test('fails when a critical source is absent from the coverage report', () => {
  const result = evaluateCoverage(policy, {
    ...passingCoverage,
    files: {},
  })
  assert.equal(result.status, 'failed')
  assert.match(result.failures.join('\n'), /critical-domain.*no source coverage records/)
})

test('fails when a critical domain exceeds its zero-coverage allowance', () => {
  const result = evaluateCoverage(policy, {
    ...passingCoverage,
    files: {
      'apps/storefront/src/lib/critical/guard.ts': {
        lines: 0,
        functions: 0,
        branches: 0,
        executableLines: 10,
      },
    },
  })
  assert.equal(result.status, 'failed')
  assert.match(result.failures.join('\n'), /zero-coverage files.*1.*allowed 0/)
})

test('ignores type-only files with no executable runtime in domain percentages', () => {
  const result = evaluateCoverage(policy, {
    ...passingCoverage,
    files: {
      ...passingCoverage.files,
      'apps/storefront/src/lib/critical/types.ts': {
        lines: 0,
        functions: 0,
        branches: 0,
        executableLines: 0,
      },
    },
  })

  assert.deepEqual(result.domains[0].totals, {
    lines: 80,
    functions: 70,
    branches: 60,
  })
})

test('fails closed when a critical domain only matches type-only files', () => {
  const result = evaluateCoverage(policy, {
    ...passingCoverage,
    files: {
      'apps/storefront/src/lib/critical/types.ts': {
        lines: 0,
        functions: 0,
        branches: 0,
        executableLines: 0,
      },
    },
  })

  assert.equal(result.status, 'failed')
  assert.match(result.failures.join('\n'), /critical-domain.*no executable runtime/)
})

test('excludes absent per-file metrics instead of weighting them as uncovered', () => {
  const result = evaluateCoverage(policy, {
    totals: { lines: 50, functions: 45, branches: 35 },
    files: {
      'apps/storefront/src/lib/critical/guard.ts': {
        lines: { total: 10, covered: 8, pct: 80 },
        functions: { total: 10, covered: 7, pct: 70 },
        branches: { total: 10, covered: 6, pct: 60 },
        executableLines: 10,
      },
      'apps/storefront/src/lib/critical/constants.ts': {
        lines: { total: 10, covered: 10, pct: 100 },
        functions: { total: 0, covered: 0, pct: 100 },
        branches: { total: 0, covered: 0, pct: 100 },
        executableLines: 10,
      },
    },
  })

  assert.deepEqual(result.domains[0].totals, {
    lines: 90,
    functions: 70,
    branches: 60,
  })
})

test('coverage reuse fails closed unless the passed artifact matches exact task identity', () => {
  const identity = {
    revision: 'a'.repeat(40),
    workingTreeSha256: 'b'.repeat(64),
    inputsSha256: 'c'.repeat(64),
  }
  const artifact = {
    schema: 'bootandstrap.storefront-coverage/v1',
    status: 'passed',
    failures: [],
    ...identity,
  }
  const outputSha256 = { [STOREFRONT_COVERAGE_OUTPUT]: '2'.repeat(64) }
  const receipt = { outputSha256 }
  const integrity = { receipt, outputSha256 }

  assert.doesNotThrow(() => validateCoverageEvidence(artifact, identity, integrity))
  assert.throws(() => validateCoverageEvidence(undefined, identity, integrity), /coverage artifact/i)
  assert.throws(
    () => validateCoverageEvidence({ ...artifact, status: 'failed' }, identity, integrity),
    /coverage artifact/i,
  )
  for (const field of ['revision', 'workingTreeSha256', 'inputsSha256']) {
    assert.throws(
      () => validateCoverageEvidence(
        { ...artifact, [field]: 'd'.repeat(artifact[field].length) },
        identity,
        integrity,
      ),
      new RegExp(`${field} mismatch`, 'i'),
    )
  }
  assert.throws(
    () => validateCoverageEvidence(artifact, identity, {
      receipt,
      outputSha256: { [STOREFRONT_COVERAGE_OUTPUT]: '3'.repeat(64) },
    }),
    /output hash/i,
  )
})
