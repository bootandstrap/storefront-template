import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildTaskGraph,
  nextReadyBatch,
  propagateDependencyFailures,
  topologicalBatches,
  validateReceipt,
  validateTaskConfig,
} from './lib/assurance-dag.mjs'

function task(id, dependencies = []) {
  return {
    id,
    dependencies,
    command: ['node', `${id}.mjs`],
    inputs: [],
    outputs: [],
    environmentKeys: [],
  }
}

const taskConfig = JSON.parse(
  readFileSync(new URL('./assurance-tasks.json', import.meta.url), 'utf8'),
)
const profiles = JSON.parse(
  readFileSync(new URL('./assurance-profiles.json', import.meta.url), 'utf8'),
)

test('builds deterministic topological batches and includes transitive dependencies', () => {
  const graph = buildTaskGraph({
    schemaVersion: 1,
    tasks: [task('b'), task('d', ['c']), task('a'), task('c', ['a', 'b'])],
  }, ['d'])

  assert.deepEqual(topologicalBatches(graph), [
    ['a', 'b'],
    ['c'],
    ['d'],
  ])
})

test('limits a parallel-ready batch without changing deterministic order', () => {
  const graph = buildTaskGraph({
    schemaVersion: 1,
    tasks: [task('c'), task('a'), task('b')],
  }, ['a', 'b', 'c'])

  assert.deepEqual(nextReadyBatch(graph, {}, 2), ['a', 'b'])
})

test('rejects dependency cycles', () => {
  const config = {
    schemaVersion: 1,
    tasks: [task('a', ['b']), task('b', ['a'])],
  }

  assert.throws(() => buildTaskGraph(config, ['a']), /dependency cycle.*a.*b/i)
})

test('rejects unknown dependencies', () => {
  const config = {
    schemaVersion: 1,
    tasks: [task('a', ['missing'])],
  }

  assert.throws(() => buildTaskGraph(config, ['a']), /unknown dependency missing/i)
})

test('propagates dependency failures through pending descendants', () => {
  const graph = buildTaskGraph({
    schemaVersion: 1,
    tasks: [task('a'), task('b', ['a']), task('c', ['b'])],
  }, ['c'])

  const states = propagateDependencyFailures(graph, { a: 'failed' })

  assert.deepEqual(states, {
    a: 'failed',
    b: 'blocked',
    c: 'blocked',
  })
})

test('requires commands to be non-empty argv arrays and never shell strings', () => {
  const invalid = {
    schemaVersion: 1,
    tasks: [{ ...task('unsafe'), command: 'node unsafe.mjs' }],
  }

  assert.throws(() => validateTaskConfig(invalid), /command.*argv array/i)
  assert.doesNotThrow(() => validateTaskConfig({
    schemaVersion: 1,
    tasks: [task('safe')],
  }))
})

test('rejects shell evaluation flags and paths outside the repository', () => {
  assert.throws(() => validateTaskConfig({
    schemaVersion: 1,
    tasks: [{ ...task('shell'), command: ['bash', '-c', 'node unsafe.mjs'] }],
  }), /shell evaluation/i)

  assert.throws(() => validateTaskConfig({
    schemaVersion: 1,
    tasks: [{ ...task('traversal'), inputs: ['../BOOTANDSTRAP_WEB/package.json'] }],
  }), /unsafe input path/i)

  assert.throws(() => validateTaskConfig({
    schemaVersion: 1,
    tasks: [{ ...task('output'), outputs: ['outside-receipt.json'] }],
  }), /output.*\.artifacts\/assurance/i)
})

test('invalidates receipts on any identity, input, toolchain, profile, or output mismatch', () => {
  const expected = {
    profile: 'fast',
    claimBoundary: 'changed_scope_feedback_only',
    taskId: 'storefront-typecheck',
    revision: 'a'.repeat(40),
    workingTreeSha256: 'b'.repeat(64),
    inputsSha256: 'c'.repeat(64),
    toolchainSha256: 'd'.repeat(64),
    environmentSha256: 'f'.repeat(64),
    profileSha256: 'e'.repeat(64),
    outputs: ['.artifacts/assurance/typecheck.json'],
    outputSha256: {
      '.artifacts/assurance/typecheck.json': '1'.repeat(64),
    },
    environmentKeys: ['CI'],
  }
  const receipt = {
    schema: 'bootandstrap.assurance-task/v1',
    ...expected,
    status: 'passed',
    startedAt: '2026-08-03T10:00:00.000Z',
    completedAt: '2026-08-03T10:00:01.000Z',
  }
  const outputExists = (output) => output === expected.outputs[0]

  assert.deepEqual(validateReceipt(receipt, expected, outputExists), { valid: true, reasons: [] })

  for (const field of [
    'profile',
    'claimBoundary',
    'taskId',
    'revision',
    'workingTreeSha256',
    'inputsSha256',
    'toolchainSha256',
    'environmentSha256',
    'profileSha256',
  ]) {
    const mismatched = { ...receipt, [field]: `${receipt[field]}-stale` }
    assert.equal(validateReceipt(mismatched, expected, outputExists).valid, false, field)
  }

  assert.equal(validateReceipt({ ...receipt, status: 'failed' }, expected, outputExists).valid, false)
  assert.equal(validateReceipt({ ...receipt, outputs: [] }, expected, outputExists).valid, false)
  assert.equal(validateReceipt({
    ...receipt,
    outputSha256: { [expected.outputs[0]]: '2'.repeat(64) },
  }, expected, outputExists).valid, false)
  assert.equal(validateReceipt(receipt, expected, () => false).valid, false)
})

test('rejects malformed receipts and environment values', () => {
  const expected = {
    profile: 'fast',
    claimBoundary: 'changed_scope_feedback_only',
    taskId: 'policy',
    revision: 'a'.repeat(40),
    workingTreeSha256: 'b'.repeat(64),
    inputsSha256: 'c'.repeat(64),
    toolchainSha256: 'd'.repeat(64),
    environmentSha256: 'f'.repeat(64),
    profileSha256: 'e'.repeat(64),
    outputs: [],
    outputSha256: {},
    environmentKeys: [],
  }

  assert.equal(validateReceipt(null, expected, () => true).valid, false)
  assert.equal(validateReceipt({
    schema: 'bootandstrap.assurance-task/v1',
    ...expected,
    status: 'passed',
    startedAt: 'not-a-date',
    completedAt: '2026-08-03T10:00:01.000Z',
    environment: { TOKEN: 'must-not-be-stored' },
  }, expected, () => true).valid, false)
})

test('declares every profile task with argv-only execution metadata', () => {
  assert.doesNotThrow(() => validateTaskConfig(taskConfig))

  const declared = new Set(taskConfig.tasks.map((entry) => entry.id))
  const profileTasks = new Set(profiles.taskCatalog.map((entry) => entry.id))
  assert.deepEqual(declared, profileTasks)
  assert.ok(taskConfig.tasks.every((entry) => Array.isArray(entry.command)))
})

test('dry-run prints deterministic batches without executing or claiming success', () => {
  const run = () => spawnSync(process.execPath, [
    'scripts/run-assurance.mjs',
    '--profile',
    'fast',
    '--dry-run',
    '--base',
    'HEAD',
  ], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })
  const result = run()
  const repeated = run()

  assert.equal(result.status, 0, result.stderr)
  assert.equal(repeated.status, 0, repeated.stderr)
  const summary = JSON.parse(result.stdout)
  const repeatedSummary = JSON.parse(repeated.stdout)
  assert.equal(summary.dryRun, true)
  assert.equal(summary.status, 'planned')
  assert.notEqual(summary.status, 'passed')
  assert.deepEqual(summary.tasks, repeatedSummary.tasks)
  assert.deepEqual(summary.batches, repeatedSummary.batches)
  for (const taskId of [
    'assurance-policy',
    'audit-policy',
    'compose-security',
    'rls-policy',
    'schema-ownership',
  ]) {
    assert.ok(summary.tasks.includes(taskId), taskId)
  }
})
