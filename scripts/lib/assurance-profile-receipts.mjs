import { createHash } from 'node:crypto'
import { lstatSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import { dirname, isAbsolute, join, normalize } from 'node:path'

const EMPTY_TREE_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const HASH_PATTERN = /^[0-9a-f]{64}$/
const REVISION_PATTERN = /^[0-9a-f]{40}$/
const TASK_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const SENSITIVE_FIELD_PATTERN = /(^|_)(secret|token|password|passwd|authorization|cookie|private_key)($|_)/i
const PROFILES = ['fast', 'full']

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function safeRelativePath(value, label) {
  if (typeof value !== 'string' || value.length === 0 || isAbsolute(value)) {
    throw new Error(`${label} path is unsafe`)
  }
  const normalized = normalize(value).replaceAll('\\', '/')
  if (normalized !== value || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`${label} path is unsafe`)
  }
  return normalized
}

function readRegular(rootDir, relativePath, label) {
  const safePath = safeRelativePath(relativePath, label)
  const absolutePath = join(rootDir, safePath)
  let stat
  try {
    stat = lstatSync(absolutePath)
  } catch {
    throw new Error(`${label} is missing`)
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`)
  }
  return readFileSync(absolutePath)
}

function parseJson(source, label) {
  try {
    return JSON.parse(source.toString('utf8'))
  } catch (error) {
    throw new Error(`${label} is malformed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assertNoSensitiveFields(value, path = 'receipt') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSensitiveFields(entry, `${path}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_FIELD_PATTERN.test(key)) throw new Error(`sensitive field is prohibited: ${path}.${key}`)
    assertNoSensitiveFields(entry, `${path}.${key}`)
  }
}

function assertSummaryIdentity(summary) {
  if (summary?.schema !== 'bootandstrap.assurance-summary/v1') throw new Error('summary schema mismatch')
  if (!PROFILES.includes(summary?.profile)) throw new Error('summary profile mismatch')
  if (summary?.status !== 'passed' || summary?.signal !== null) throw new Error('summary is not passed')
  if (summary?.executionMode !== 'forced_no_cache') throw new Error('summary must prove forced no-cache execution')
  if (!REVISION_PATTERN.test(summary?.revision ?? '')) throw new Error('summary revision is malformed')
  if (summary?.workingTreeSha256 !== EMPTY_TREE_SHA256) throw new Error('summary must prove a clean working tree')
}

function summaryTaskIds(summary) {
  if (!summary.tasks || typeof summary.tasks !== 'object' || Array.isArray(summary.tasks)) {
    throw new Error('summary tasks are malformed')
  }
  if (!summary.receipts || typeof summary.receipts !== 'object' || Array.isArray(summary.receipts)) {
    throw new Error('summary receipts are malformed')
  }
  const taskIds = Object.keys(summary.tasks).sort()
  if (taskIds.length === 0 || JSON.stringify(taskIds) !== JSON.stringify(Object.keys(summary.receipts).sort())) {
    throw new Error('summary task receipt set mismatch')
  }
  return taskIds
}

function assertSummaryTask(summary, taskId) {
  if (!TASK_ID_PATTERN.test(taskId)) throw new Error(`invalid task id: ${taskId}`)
  if (summary.tasks[taskId] !== 'passed') throw new Error(`${taskId} must be passed, not cached or skipped`)
}

function assertSummary(summary) {
  assertSummaryIdentity(summary)
  const taskIds = summaryTaskIds(summary)
  taskIds.forEach(taskId => assertSummaryTask(summary, taskId))
  if (!Array.isArray(summary.deferred)) throw new Error('summary deferred tasks are malformed')
  assertNoSensitiveFields(summary, 'summary')
  return taskIds
}

function assertReceipt(receipt, summary, taskId) {
  if (receipt?.schema !== 'bootandstrap.assurance-task/v1') throw new Error(`${taskId} receipt schema mismatch`)
  for (const field of ['profile', 'claimBoundary', 'executionMode', 'revision', 'workingTreeSha256']) {
    if (receipt[field] !== summary[field]) throw new Error(`${taskId} receipt ${field} mismatch`)
  }
  if (receipt.taskId !== taskId || receipt.status !== 'passed') throw new Error(`${taskId} receipt identity mismatch`)
  if (!Array.isArray(receipt.outputs) || !receipt.outputSha256 || typeof receipt.outputSha256 !== 'object') {
    throw new Error(`${taskId} receipt outputs are malformed`)
  }
  if (JSON.stringify([...receipt.outputs].sort()) !== JSON.stringify(Object.keys(receipt.outputSha256).sort())) {
    throw new Error(`${taskId} receipt output hash set mismatch`)
  }
  const startedAt = Date.parse(receipt.startedAt)
  const completedAt = Date.parse(receipt.completedAt)
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    throw new Error(`${taskId} task timing is invalid`)
  }
  assertNoSensitiveFields(receipt, `receipt.${taskId}`)
  return { startedAt: receipt.startedAt, completedAt: receipt.completedAt, durationMs: completedAt - startedAt }
}

async function writeImmutable(filePath, source) {
  await fs.mkdir(dirname(filePath), { recursive: true })
  try {
    const existing = await fs.readFile(filePath)
    if (!existing.equals(source)) throw new Error(`immutable artifact collision: ${filePath}`)
    return
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await fs.writeFile(filePath, source, { flag: 'wx', mode: 0o600 })
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(dirname(filePath), { recursive: true })
  const source = Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  await fs.writeFile(temporaryPath, source, { mode: 0o600 })
  await fs.rename(temporaryPath, filePath)
  return source
}

function archivedPath(runRoot, relativePath) {
  return `${runRoot}/files/${safeRelativePath(relativePath, 'archived source')}`
}

async function archiveOutput({ rootDir, runRoot, taskId, receipt, outputPath, outputs }) {
  const outputSource = readRegular(rootDir, outputPath, `${taskId} output ${outputPath}`)
  const outputHash = sha256(outputSource)
  if (!HASH_PATTERN.test(receipt.outputSha256[outputPath] ?? '') || receipt.outputSha256[outputPath] !== outputHash) {
    throw new Error(`${taskId} output hash mismatch: ${outputPath}`)
  }
  if (outputs[outputPath] && outputs[outputPath].sha256 !== outputHash) {
    throw new Error(`conflicting output hash: ${outputPath}`)
  }
  const outputArchivePath = archivedPath(runRoot, outputPath)
  await writeImmutable(join(rootDir, outputArchivePath), outputSource)
  outputs[outputPath] = { path: outputArchivePath, sha256: outputHash }
}

async function archiveTask({ rootDir, runRoot, summary, taskId, tasks, outputs }) {
  const receiptPath = safeRelativePath(summary.receipts[taskId], `${taskId} receipt`)
  const receiptSource = readRegular(rootDir, receiptPath, `${taskId} receipt`)
  const receipt = parseJson(receiptSource, `${taskId} receipt`)
  const timing = assertReceipt(receipt, summary, taskId)
  const archivedReceiptPath = `${runRoot}/tasks/${taskId}.json`
  await writeImmutable(join(rootDir, archivedReceiptPath), receiptSource)
  tasks[taskId] = {
    path: archivedReceiptPath,
    sha256: sha256(receiptSource),
    ...timing,
  }
  for (const outputPath of [...receipt.outputs].sort()) {
    await archiveOutput({ rootDir, runRoot, taskId, receipt, outputPath, outputs })
  }
}

function buildSnapshotManifest(summary, summarySha256, runRoot, tasks, outputs) {
  return {
    schema: 'bootandstrap.assurance-profile-snapshot/v1',
    profile: summary.profile,
    claimBoundary: summary.claimBoundary,
    executionMode: summary.executionMode,
    status: 'passed',
    revision: summary.revision,
    workingTreeSha256: summary.workingTreeSha256,
    summary: { path: `${runRoot}/summary.json`, sha256: summarySha256 },
    tasks,
    outputs,
    deferred: summary.deferred,
    completedAt: summary.completedAt,
  }
}

export async function snapshotAssuranceProfile({ rootDir }) {
  const summarySource = readRegular(rootDir, '.artifacts/assurance/summary.json', 'assurance summary')
  const summary = parseJson(summarySource, 'assurance summary')
  const taskIds = assertSummary(summary)
  const summarySha256 = sha256(summarySource)
  const runRoot = `.artifacts/assurance/runs/${summary.profile}/${summary.revision}-${summarySha256.slice(0, 16)}`
  const tasks = {}
  const outputs = {}

  await writeImmutable(join(rootDir, runRoot, 'summary.json'), summarySource)
  for (const taskId of taskIds) {
    await archiveTask({ rootDir, runRoot, summary, taskId, tasks, outputs })
  }

  const manifest = buildSnapshotManifest(summary, summarySha256, runRoot, tasks, outputs)
  const manifestPath = `${runRoot}/manifest.json`
  const manifestSource = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)
  await writeImmutable(join(rootDir, manifestPath), manifestSource)
  const pointerPath = `.artifacts/assurance/profiles/${summary.profile}.json`
  await writeJsonAtomic(join(rootDir, pointerPath), {
    schema: 'bootandstrap.assurance-profile-pointer/v1',
    profile: summary.profile,
    revision: summary.revision,
    manifestPath,
    manifestSha256: sha256(manifestSource),
  })
  return { ...manifest, pointerPath, manifestPath, manifestSha256: sha256(manifestSource) }
}

function assertSnapshotIdentity({ manifest, expectedProfile, expectedRevision }) {
  if (manifest?.schema !== 'bootandstrap.assurance-profile-snapshot/v1') throw new Error('profile manifest schema mismatch')
  if (manifest.profile !== expectedProfile || manifest.revision !== expectedRevision) throw new Error('profile manifest identity mismatch')
  if (manifest.executionMode !== 'forced_no_cache') throw new Error('profile must prove forced no-cache execution')
  if (manifest.status !== 'passed' || manifest.workingTreeSha256 !== EMPTY_TREE_SHA256) {
    throw new Error('profile must prove a passed clean working tree')
  }
}

function verifyArchivedOutput({ rootDir, taskId, receipt, outputPath, manifest }) {
  const archived = manifest.outputs[outputPath]
  if (!archived) throw new Error(`${taskId} archived output missing: ${outputPath}`)
  const outputSource = readRegular(rootDir, archived.path, `${taskId} archived output ${outputPath}`)
  const outputHash = sha256(outputSource)
  if (outputHash !== archived.sha256 || outputHash !== receipt.outputSha256[outputPath]) {
    throw new Error(`${taskId} output hash mismatch: ${outputPath}`)
  }
}

function verifyArchivedTask({ rootDir, taskId, task, manifest, summary }) {
  const receiptSource = readRegular(rootDir, task.path, `${taskId} archived receipt`)
  if (sha256(receiptSource) !== task.sha256) throw new Error(`${taskId} receipt hash mismatch`)
  const receipt = parseJson(receiptSource, `${taskId} archived receipt`)
  const timing = assertReceipt(receipt, summary, taskId)
  const archivedTiming = {
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    durationMs: task.durationMs,
  }
  if (JSON.stringify(timing) !== JSON.stringify(archivedTiming)) {
    throw new Error(`${taskId} task timing mismatch`)
  }
  for (const outputPath of receipt.outputs) {
    verifyArchivedOutput({ rootDir, taskId, receipt, outputPath, manifest })
  }
}

function readProfileSnapshot({ rootDir, pointerPath, expectedProfile, expectedRevision }) {
  const pointerSource = readRegular(rootDir, pointerPath, `${expectedProfile} profile pointer`)
  const pointer = parseJson(pointerSource, `${expectedProfile} profile pointer`)
  if (pointer?.schema !== 'bootandstrap.assurance-profile-pointer/v1') throw new Error('profile pointer schema mismatch')
  if (pointer.profile !== expectedProfile) throw new Error('profile pointer identity mismatch')
  if (pointer.revision !== expectedRevision) throw new Error('profile revision mismatch')
  const manifestSource = readRegular(rootDir, pointer.manifestPath, `${expectedProfile} profile manifest`)
  if (sha256(manifestSource) !== pointer.manifestSha256) throw new Error('profile manifest hash mismatch')
  const manifest = parseJson(manifestSource, `${expectedProfile} profile manifest`)
  assertSnapshotIdentity({ manifest, expectedProfile, expectedRevision })
  return { pointer, manifest }
}

function readArchivedSummary({ rootDir, manifest, expectedProfile, expectedRevision }) {
  const summarySource = readRegular(rootDir, manifest.summary.path, `${expectedProfile} archived summary`)
  if (sha256(summarySource) !== manifest.summary.sha256) throw new Error('profile summary hash mismatch')
  const summary = parseJson(summarySource, `${expectedProfile} archived summary`)
  const taskIds = assertSummary(summary)
  if (summary.profile !== expectedProfile || summary.revision !== expectedRevision) {
    throw new Error('archived summary identity mismatch')
  }
  if (JSON.stringify(taskIds) !== JSON.stringify(Object.keys(manifest.tasks).sort())) {
    throw new Error('profile task set mismatch')
  }
  return { summary, taskIds }
}

export function verifyAssuranceProfileSnapshot({ rootDir, pointerPath, expectedProfile, expectedRevision }) {
  const { pointer, manifest } = readProfileSnapshot({
    rootDir, pointerPath, expectedProfile, expectedRevision,
  })
  const { summary, taskIds } = readArchivedSummary({
    rootDir, manifest, expectedProfile, expectedRevision,
  })
  for (const taskId of taskIds) {
    verifyArchivedTask({ rootDir, taskId, task: manifest.tasks[taskId], manifest, summary })
  }
  assertNoSensitiveFields(manifest, `${expectedProfile} manifest`)
  return { pointer, pointerPath, manifest, manifestPath: pointer.manifestPath, manifestSha256: pointer.manifestSha256 }
}

export function buildAssuranceProfileSetReceipt({ rootDir, expectedRevision, generatedAt = new Date().toISOString() }) {
  if (!REVISION_PATTERN.test(expectedRevision ?? '')) throw new Error('expected revision is malformed')
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error('generatedAt is malformed')
  const profiles = {}
  for (const profile of PROFILES) {
    const verified = verifyAssuranceProfileSnapshot({
      rootDir,
      pointerPath: `.artifacts/assurance/profiles/${profile}.json`,
      expectedProfile: profile,
      expectedRevision,
    })
    profiles[profile] = {
      pointerPath: verified.pointerPath,
      manifestPath: verified.manifestPath,
      manifestSha256: verified.manifestSha256,
      summarySha256: verified.manifest.summary.sha256,
      taskTimingCount: Object.keys(verified.manifest.tasks).length,
      totalTaskDurationMs: Object.values(verified.manifest.tasks)
        .reduce((total, task) => total + task.durationMs, 0),
      deferredCount: verified.manifest.deferred.length,
    }
  }
  return {
    schema: 'bootandstrap.assurance-profile-set/v1',
    status: 'passed',
    claimBoundary: 'developer_feedback_profiles_without_deployment',
    revision: expectedRevision,
    workingTreeSha256: EMPTY_TREE_SHA256,
    executionMode: 'forced_no_cache',
    generatedAt,
    profiles,
    residuals: [],
    restrictions: {
      deployment: 'not_claimed',
      commercialActivation: 'not_claimed',
    },
  }
}

export async function writeAssuranceProfileSetReceipt({ rootDir, expectedRevision, generatedAt }) {
  const receipt = buildAssuranceProfileSetReceipt({ rootDir, expectedRevision, generatedAt })
  await writeJsonAtomic(join(rootDir, '.artifacts/assurance/profile-set.json'), receipt)
  return receipt
}
