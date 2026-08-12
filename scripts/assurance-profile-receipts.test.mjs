import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  buildAssuranceProfileSetReceipt,
  snapshotAssuranceProfile,
  verifyAssuranceProfileSnapshot,
} from './lib/assurance-profile-receipts.mjs'

const EMPTY_TREE_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const REVISION = 'a'.repeat(40)

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function write(rootDir, relativePath, source) {
  const target = join(rootDir, relativePath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, source)
}

function writeJson(rootDir, relativePath, value) {
  write(rootDir, relativePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeCanonicalRun(rootDir, profile, {
  revision = REVISION,
  workingTreeSha256 = EMPTY_TREE_SHA256,
  executionMode = 'forced_no_cache',
  startedAt = '2026-08-12T18:00:00.000Z',
  completedAt = '2026-08-12T18:00:01.250Z',
} = {}) {
  const outputPath = '.artifacts/assurance/example.json'
  const outputBytes = Buffer.from(`${profile}-output\n`)
  const receiptPath = '.artifacts/assurance/tasks/example.json'
  write(rootDir, outputPath, outputBytes)
  writeJson(rootDir, receiptPath, {
    schema: 'bootandstrap.assurance-task/v1',
    profile,
    claimBoundary: profile === 'full'
      ? 'local_runtime_assurance_without_commercial_activation'
      : 'changed_scope_feedback_only',
    executionMode,
    taskId: 'example',
    revision,
    workingTreeSha256,
    inputsSha256: 'b'.repeat(64),
    toolchainSha256: 'c'.repeat(64),
    environmentSha256: 'd'.repeat(64),
    profileSha256: 'e'.repeat(64),
    outputs: [outputPath],
    environmentKeys: [],
    outputSha256: { [outputPath]: sha256(outputBytes) },
    status: 'passed',
    startedAt,
    completedAt,
  })
  writeJson(rootDir, '.artifacts/assurance/summary.json', {
    schema: 'bootandstrap.assurance-summary/v1',
    profile,
    claimBoundary: profile === 'full'
      ? 'local_runtime_assurance_without_commercial_activation'
      : 'changed_scope_feedback_only',
    executionMode,
    status: 'passed',
    signal: null,
    revision,
    workingTreeSha256,
    tasks: { example: 'passed' },
    receipts: { example: receiptPath },
    deferred: profile === 'fast' ? [{ taskId: 'full-only', status: 'deferred' }] : [],
    changedFiles: [],
    impactReasons: [],
    completedAt,
  })
}

function fixture() {
  const rootDir = mkdtempSync(join(tmpdir(), 'bns-assurance-profiles-'))
  return {
    rootDir,
    cleanup: () => rmSync(rootDir, { recursive: true, force: true }),
  }
}

test('preserves fast and full authoritative bytes and seals one exact clean revision', async () => {
  const current = fixture()
  try {
    writeCanonicalRun(current.rootDir, 'fast')
    const fast = await snapshotAssuranceProfile({ rootDir: current.rootDir })
    const fastOutput = readFileSync(join(current.rootDir, fast.outputs['.artifacts/assurance/example.json'].path))

    writeCanonicalRun(current.rootDir, 'full', {
      startedAt: '2026-08-12T18:01:00.000Z',
      completedAt: '2026-08-12T18:01:02.500Z',
    })
    const full = await snapshotAssuranceProfile({ rootDir: current.rootDir })
    const receipt = buildAssuranceProfileSetReceipt({
      rootDir: current.rootDir,
      expectedRevision: REVISION,
      generatedAt: '2026-08-12T18:02:00.000Z',
    })

    assert.equal(fast.profile, 'fast')
    assert.equal(full.profile, 'full')
    assert.equal(fast.tasks.example.durationMs, 1250)
    assert.equal(full.tasks.example.durationMs, 2500)
    assert.equal(fastOutput.toString('utf8'), 'fast-output\n')
    assert.equal(receipt.schema, 'bootandstrap.assurance-profile-set/v1')
    assert.equal(receipt.status, 'passed')
    assert.equal(receipt.revision, REVISION)
    assert.equal(receipt.workingTreeSha256, EMPTY_TREE_SHA256)
    assert.deepEqual(Object.keys(receipt.profiles), ['fast', 'full'])
    assert.equal(receipt.profiles.fast.taskTimingCount, 1)
    assert.equal(receipt.profiles.full.taskTimingCount, 1)
    assert.deepEqual(receipt.residuals, [])
  } finally {
    current.cleanup()
  }
})

test('rejects dirty, reusable, cross-revision and invalid timing evidence', async () => {
  for (const [name, options, expected] of [
    ['dirty tree', { workingTreeSha256: 'f'.repeat(64) }, /clean working tree/],
    ['reusable mode', { executionMode: 'receipt_reuse_allowed' }, /forced no-cache/],
    ['wrong revision', { revision: '1'.repeat(40) }, /revision mismatch/],
    ['negative duration', {
      startedAt: '2026-08-12T18:00:02.000Z',
      completedAt: '2026-08-12T18:00:01.000Z',
    }, /task timing/],
  ]) {
    const current = fixture()
    try {
      writeCanonicalRun(current.rootDir, 'fast', options)
      if (name === 'wrong revision') {
        const snapshot = await snapshotAssuranceProfile({ rootDir: current.rootDir })
        assert.throws(
          () => verifyAssuranceProfileSnapshot({
            rootDir: current.rootDir,
            pointerPath: snapshot.pointerPath,
            expectedProfile: 'fast',
            expectedRevision: REVISION,
          }),
          expected,
        )
      } else {
        await assert.rejects(() => snapshotAssuranceProfile({ rootDir: current.rootDir }), expected)
      }
    } finally {
      current.cleanup()
    }
  }
})

test('rejects archived byte tampering and symlink substitution', async () => {
  const current = fixture()
  try {
    writeCanonicalRun(current.rootDir, 'fast')
    const snapshot = await snapshotAssuranceProfile({ rootDir: current.rootDir })
    const archivedOutput = join(current.rootDir, snapshot.outputs['.artifacts/assurance/example.json'].path)
    writeFileSync(archivedOutput, 'tampered\n')
    assert.throws(() => verifyAssuranceProfileSnapshot({
      rootDir: current.rootDir,
      pointerPath: snapshot.pointerPath,
      expectedProfile: 'fast',
      expectedRevision: REVISION,
    }), /output hash mismatch/)

    writeFileSync(archivedOutput, 'fast-output\n')
    const archivedReceipt = join(current.rootDir, snapshot.tasks.example.path)
    const replacement = `${archivedReceipt}.replacement`
    writeFileSync(replacement, readFileSync(archivedReceipt))
    unlinkSync(archivedReceipt)
    symlinkSync(replacement, archivedReceipt)
    assert.throws(() => verifyAssuranceProfileSnapshot({
      rootDir: current.rootDir,
      pointerPath: snapshot.pointerPath,
      expectedProfile: 'fast',
      expectedRevision: REVISION,
    }), /regular non-symlink/)
  } finally {
    current.cleanup()
  }
})

test('binds the profile snapshot producer, verifier and sequential wrapper into assurance contracts', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const taskConfig = JSON.parse(readFileSync(new URL('./assurance-tasks.json', import.meta.url), 'utf8'))
  const assuranceContracts = taskConfig.tasks.find(task => task.id === 'assurance-contracts')
  const runAssuranceSource = readFileSync(new URL('./run-assurance.mjs', import.meta.url), 'utf8')

  assert.equal(packageJson.scripts['assurance:profiles'], 'node scripts/run-assurance-profiles.mjs')
  assert.equal(packageJson.scripts['assurance:verify-profiles'], 'node scripts/verify-assurance-profiles.mjs')
  for (const requiredInput of [
    'scripts/lib/assurance-profile-receipts.mjs',
    'scripts/assurance-profile-receipts.test.mjs',
    'scripts/run-assurance-profiles.mjs',
    'scripts/verify-assurance-profiles.mjs',
  ]) {
    assert.ok(assuranceContracts.inputs.includes(requiredInput), requiredInput)
  }
  assert.ok(assuranceContracts.command.includes('scripts/assurance-profile-receipts.test.mjs'))
  assert.match(runAssuranceSource, /snapshotAssuranceProfile/)
})

test('sequential profile command fails closed unless cache bypass is explicit', () => {
  const result = spawnSync(process.execPath, ['scripts/run-assurance-profiles.mjs'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /--no-cache is required/)
})
