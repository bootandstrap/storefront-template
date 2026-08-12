import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { verifyCiAssuranceEvidence } from './lib/ci-assurance-evidence.mjs'

const REVISION = 'a'.repeat(40)
const EMPTY_TREE_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const REPOSITORY = 'bootandstrap/storefront-template'
const PROFILES = JSON.parse(readFileSync(new URL('./assurance-profiles.json', import.meta.url), 'utf8'))
const TASKS = JSON.parse(readFileSync(new URL('./assurance-tasks.json', import.meta.url), 'utf8'))
const FULL_TASKS = PROFILES.profiles.full.tasks

test('the full assurance contract task executes and hashes remote CI evidence surfaces', () => {
  const assuranceContracts = TASKS.tasks.find((entry) => entry.id === 'assurance-contracts')

  assert.ok(assuranceContracts.command.includes('scripts/ci-assurance-evidence.test.mjs'))
  for (const path of [
    'scripts/run-assurance.mjs',
    'scripts/lib/assurance-execution.mjs',
    'scripts/lib/ci-assurance-evidence.mjs',
    'scripts/verify-ci-assurance-evidence.mjs',
    'scripts/ci-assurance-evidence.test.mjs',
    '.github/workflows/governance-gate.yml',
  ]) {
    assert.ok(assuranceContracts.inputs.includes(path), `${path} must be hashed by assurance-contracts`)
  }
})

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function fixture() {
  const rootDir = mkdtempSync(join(tmpdir(), 'bns-ci-assurance-'))
  mkdirSync(join(rootDir, 'scripts'), { recursive: true })
  cpSync(new URL('./assurance-profiles.json', import.meta.url), join(rootDir, 'scripts/assurance-profiles.json'))
  cpSync(new URL('./assurance-tasks.json', import.meta.url), join(rootDir, 'scripts/assurance-tasks.json'))

  const taskStates = {}
  const receiptPaths = {}
  for (const taskId of FULL_TASKS) {
    const task = TASKS.tasks.find((entry) => entry.id === taskId)
    const receiptPath = `.artifacts/assurance/tasks/${taskId}.json`
    const outputSha256 = {}
    for (const output of task.outputs) {
      const outputPath = join(rootDir, output)
      mkdirSync(dirname(outputPath), { recursive: true })
      writeFileSync(outputPath, `${taskId}:${output}\n`)
      outputSha256[output] = sha256(readFileSync(outputPath))
    }
    writeJson(join(rootDir, receiptPath), {
      schema: 'bootandstrap.assurance-task/v1',
      profile: 'full',
      claimBoundary: 'local_runtime_assurance_without_commercial_activation',
      executionMode: 'forced_no_cache',
      taskId,
      revision: REVISION,
      workingTreeSha256: EMPTY_TREE_SHA256,
      inputsSha256: 'b'.repeat(64),
      toolchainSha256: 'c'.repeat(64),
      environmentSha256: 'd'.repeat(64),
      profileSha256: 'f'.repeat(64),
      outputs: task.outputs,
      environmentKeys: [],
      outputSha256,
      status: 'passed',
      startedAt: '2026-08-06T20:00:00.000Z',
      completedAt: '2026-08-06T20:01:00.000Z',
    })
    taskStates[taskId] = 'passed'
    receiptPaths[taskId] = receiptPath
  }

  writeJson(join(rootDir, '.artifacts/assurance/summary.json'), {
    schema: 'bootandstrap.assurance-summary/v1',
    profile: 'full',
    claimBoundary: 'local_runtime_assurance_without_commercial_activation',
    executionMode: 'forced_no_cache',
    status: 'passed',
    signal: null,
    revision: REVISION,
    workingTreeSha256: EMPTY_TREE_SHA256,
    tasks: taskStates,
    receipts: receiptPaths,
    deferred: [],
    changedFiles: [],
    impactReasons: [],
    completedAt: '2026-08-06T20:01:00.000Z',
  })

  return {
    rootDir,
    cleanup: () => rmSync(rootDir, { recursive: true, force: true }),
    readSummary: () => JSON.parse(readFileSync(join(rootDir, '.artifacts/assurance/summary.json'), 'utf8')),
    writeSummary: (value) => writeJson(join(rootDir, '.artifacts/assurance/summary.json'), value),
    readReceipt: (taskId) => JSON.parse(readFileSync(join(rootDir, `.artifacts/assurance/tasks/${taskId}.json`), 'utf8')),
    writeReceipt: (taskId, value) => writeJson(join(rootDir, `.artifacts/assurance/tasks/${taskId}.json`), value),
  }
}

function verify(rootDir) {
  return verifyCiAssuranceEvidence({
    rootDir,
    expectedRevision: REVISION,
    repository: REPOSITORY,
    runId: '123456789',
    runAttempt: '1',
    workflowRef: `${REPOSITORY}/.github/workflows/governance-gate.yml@refs/heads/fix/local-assurance-claim-integrity`,
    generatedAt: '2026-08-06T20:02:00.000Z',
  })
}

test('seals the exact passed full profile and every receipt/output hash', () => {
  const current = fixture()
  try {
    const result = verify(current.rootDir)

    assert.equal(result.schema, 'bootandstrap.ci-assurance-evidence/v1')
    assert.equal(result.status, 'passed')
    assert.equal(result.revision, REVISION)
    assert.equal(result.sourceExecutionMode, 'forced_no_cache')
    assert.deepEqual(result.tasks, FULL_TASKS)
    assert.equal(Object.keys(result.taskReceiptsSha256).length, 17)
    assert.match(result.summarySha256, /^[0-9a-f]{64}$/)
    assert.deepEqual(result.restrictions, {
      deployment: 'not_claimed',
      commercialActivation: 'not_claimed',
      providerMutation: 'prohibited_not_executed',
    })
  } finally {
    current.cleanup()
  }
})

const summaryCases = [
  ['reusable execution mode', (summary) => { summary.executionMode = 'receipt_reuse_allowed' }, /forced no-cache execution/],
  ['wrong revision', (summary) => { summary.revision = '1'.repeat(40) }, /revision mismatch/],
  ['dirty tree', (summary) => { summary.workingTreeSha256 = '2'.repeat(64) }, /clean tree/],
  ['cached task', (summary) => { summary.tasks[FULL_TASKS[0]] = 'cached' }, /must be passed/],
  ['missing task', (summary) => { delete summary.tasks[FULL_TASKS[0]] }, /task set mismatch/],
  ['extra task', (summary) => { summary.tasks.invented = 'passed' }, /task set mismatch/],
  ['deferred task', (summary) => { summary.deferred = [{ taskId: 'invented', status: 'deferred' }] }, /deferred/],
  ['traversing receipt', (summary) => { summary.receipts[FULL_TASKS[0]] = '../summary.json' }, /receipt path mismatch/],
]

for (const [name, mutate, expected] of summaryCases) {
  test(`rejects ${name}`, () => {
    const current = fixture()
    try {
      const summary = current.readSummary()
      mutate(summary)
      current.writeSummary(summary)
      assert.throws(() => verify(current.rootDir), expected)
    } finally {
      current.cleanup()
    }
  })
}

test('rejects receipt identity mismatch and sensitive fields', () => {
  const current = fixture()
  try {
    const taskId = FULL_TASKS[0]
    const receipt = current.readReceipt(taskId)
    receipt.revision = '3'.repeat(40)
    current.writeReceipt(taskId, receipt)
    assert.throws(() => verify(current.rootDir), /receipt revision mismatch/)

    receipt.revision = REVISION
    receipt.api_token = 'must-never-be-sealed'
    current.writeReceipt(taskId, receipt)
    assert.throws(() => verify(current.rootDir), /sensitive field/i)
  } finally {
    current.cleanup()
  }
})

test('rejects a receipt that does not prove forced no-cache execution', () => {
  const current = fixture()
  try {
    const taskId = FULL_TASKS[0]
    const receipt = current.readReceipt(taskId)
    receipt.executionMode = 'receipt_reuse_allowed'
    current.writeReceipt(taskId, receipt)
    assert.throws(() => verify(current.rootDir), /receipt does not prove forced no-cache execution/)
  } finally {
    current.cleanup()
  }
})

test('rejects output byte mismatch', () => {
  const current = fixture()
  try {
    writeFileSync(join(current.rootDir, '.artifacts/assurance/compose-lint.sarif'), 'tampered\n')
    assert.throws(() => verify(current.rootDir), /output hash mismatch/)
  } finally {
    current.cleanup()
  }
})

test('rejects symlinked task receipts', () => {
  const current = fixture()
  try {
    const taskId = FULL_TASKS[0]
    const receiptPath = join(current.rootDir, `.artifacts/assurance/tasks/${taskId}.json`)
    const targetPath = join(current.rootDir, '.artifacts/assurance/tasks/target.json')
    writeFileSync(targetPath, readFileSync(receiptPath))
    rmSync(receiptPath)
    symlinkSync(targetPath, receiptPath)
    assert.throws(() => verify(current.rootDir), /regular non-symlink/)
  } finally {
    current.cleanup()
  }
})
