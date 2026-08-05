import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveAssuranceWorkerCount } from './lib/assurance-workers.mjs'

test('defaults local assurance to two workers', () => {
  assert.equal(resolveAssuranceWorkerCount(undefined), 2)
})

test('accepts an explicit positive worker override', () => {
  assert.equal(resolveAssuranceWorkerCount('3'), 3)
})

test('rejects invalid worker overrides', () => {
  for (const value of ['0', '-1', '1.5', 'many']) {
    assert.throws(() => resolveAssuranceWorkerCount(value), /positive integer/)
  }
})
