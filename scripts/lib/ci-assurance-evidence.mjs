import { createHash } from 'node:crypto'
import { lstatSync, readFileSync } from 'node:fs'
import { isAbsolute, join, normalize } from 'node:path'

const EMPTY_TREE_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const LOCAL_CLAIM = 'local_runtime_assurance_without_commercial_activation'
const REMOTE_CLAIM = 'remote_read_only_ci_assurance_without_deployment'
const FORCED_EXECUTION_MODE = 'forced_no_cache'
const HASH_PATTERN = /^[0-9a-f]{64}$/
const REVISION_PATTERN = /^[0-9a-f]{40}$/
const SENSITIVE_FIELD_PATTERN = /(^|_)(secret|token|password|passwd|authorization|cookie|private_key)($|_)/i

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function readJsonFile(rootDir, relativePath, label) {
  const source = readRegularFile(rootDir, relativePath, label)
  try {
    return { source, value: JSON.parse(source.toString('utf8')) }
  } catch (error) {
    throw new Error(`${label} is malformed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assertSafeRelativePath(relativePath, label) {
  if (typeof relativePath !== 'string' || relativePath.length === 0 || isAbsolute(relativePath)) {
    throw new Error(`${label} path is unsafe`)
  }
  const normalized = normalize(relativePath).replaceAll('\\', '/')
  if (normalized.startsWith('../') || normalized.includes('/../') || normalized !== relativePath) {
    throw new Error(`${label} path is unsafe`)
  }
  return normalized
}

function readRegularFile(rootDir, relativePath, label) {
  const safePath = assertSafeRelativePath(relativePath, label)
  const path = join(rootDir, safePath)
  let stat
  try {
    stat = lstatSync(path)
  } catch {
    throw new Error(`${label} is missing`)
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`)
  }
  return readFileSync(path)
}

function sortedKeys(value) {
  return Object.keys(value ?? {}).sort()
}

function assertExactKeys(value, expected, label) {
  if (JSON.stringify(sortedKeys(value)) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} task set mismatch`)
  }
}

function assertNoSensitiveFields(value, path = 'evidence') {
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

function assertSummary(summary, expectedRevision, fullTasks) {
  if (summary?.schema !== 'bootandstrap.assurance-summary/v1') throw new Error('summary schema mismatch')
  if (summary?.profile !== 'full' || summary?.claimBoundary !== LOCAL_CLAIM) {
    throw new Error('summary profile or claim mismatch')
  }
  if (summary?.executionMode !== FORCED_EXECUTION_MODE) {
    throw new Error('summary does not prove forced no-cache execution')
  }
  if (summary?.status !== 'passed' || summary?.signal !== null) throw new Error('summary is not passed')
  if (summary?.revision !== expectedRevision) throw new Error('summary revision mismatch')
  if (summary?.workingTreeSha256 !== EMPTY_TREE_SHA256) throw new Error('summary does not prove a clean tree')
  if (!Array.isArray(summary?.deferred) || summary.deferred.length !== 0) {
    throw new Error('summary contains deferred work')
  }
  if (!Array.isArray(summary?.changedFiles) || summary.changedFiles.length !== 0) {
    throw new Error('full summary changedFiles must be empty')
  }
  assertExactKeys(summary.tasks, fullTasks, 'summary')
  assertExactKeys(summary.receipts, fullTasks, 'summary receipts')
  for (const taskId of fullTasks) {
    if (summary.tasks[taskId] !== 'passed') throw new Error(`${taskId} must be passed, not cached or skipped`)
  }
}

function assertReceiptIdentity(receipt, taskId, expectedRevision) {
  if (receipt?.schema !== 'bootandstrap.assurance-task/v1') throw new Error(`${taskId} receipt schema mismatch`)
  if (receipt?.profile !== 'full' || receipt?.claimBoundary !== LOCAL_CLAIM) {
    throw new Error(`${taskId} receipt profile or claim mismatch`)
  }
  if (receipt?.executionMode !== FORCED_EXECUTION_MODE) {
    throw new Error(`${taskId} receipt does not prove forced no-cache execution`)
  }
  if (receipt?.taskId !== taskId) throw new Error(`${taskId} receipt task identity mismatch`)
  if (receipt?.revision !== expectedRevision) throw new Error(`${taskId} receipt revision mismatch`)
  if (receipt?.workingTreeSha256 !== EMPTY_TREE_SHA256) throw new Error(`${taskId} receipt clean tree mismatch`)
  if (receipt?.status !== 'passed') throw new Error(`${taskId} receipt must be passed`)
}

function assertReceiptHashes(receipt, taskId) {
  for (const field of ['inputsSha256', 'toolchainSha256', 'environmentSha256', 'profileSha256']) {
    if (!HASH_PATTERN.test(receipt?.[field] ?? '')) throw new Error(`${taskId} receipt ${field} is malformed`)
  }
}

function assertReceiptEnvironment(receipt, taskId) {
  if (!Array.isArray(receipt?.environmentKeys)) throw new Error(`${taskId} receipt environment keys are malformed`)
  if (receipt.environmentKeys.some((key) => SENSITIVE_FIELD_PATTERN.test(key))) {
    throw new Error(`${taskId} receipt contains a sensitive environment key`)
  }
}

function assertReceiptOutputs(receipt, taskId, task) {
  if (JSON.stringify(receipt?.outputs) !== JSON.stringify(task.outputs)) {
    throw new Error(`${taskId} receipt output declaration mismatch`)
  }
  if (JSON.stringify(sortedKeys(receipt?.outputSha256)) !== JSON.stringify([...task.outputs].sort())) {
    throw new Error(`${taskId} receipt output hash set mismatch`)
  }
}

function assertReceiptNoEmbeddedOutput(receipt, taskId) {
  for (const prohibited of ['command', 'stdout', 'stderr', 'output']) {
    if (receipt[prohibited] !== undefined) throw new Error(`${taskId} receipt embeds prohibited ${prohibited}`)
  }
}

function assertReceipt(receipt, { taskId, task, expectedRevision }) {
  assertReceiptIdentity(receipt, taskId, expectedRevision)
  assertReceiptHashes(receipt, taskId)
  assertReceiptEnvironment(receipt, taskId)
  assertReceiptOutputs(receipt, taskId, task)
  assertReceiptNoEmbeddedOutput(receipt, taskId)
  assertNoSensitiveFields(receipt, `receipt.${taskId}`)
}

function assertRunIdentity({ expectedRevision, repository, runId, runAttempt, workflowRef }) {
  if (!REVISION_PATTERN.test(expectedRevision ?? '')) throw new Error('expected revision is malformed')
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) throw new Error('repository is malformed')
  if (!/^[1-9][0-9]*$/.test(String(runId ?? ''))) throw new Error('run id is malformed')
  if (!/^[1-9][0-9]*$/.test(String(runAttempt ?? ''))) throw new Error('run attempt is malformed')
  const workflowPrefix = `${repository}/.github/workflows/`
  if (typeof workflowRef !== 'string' || !workflowRef.startsWith(workflowPrefix) || !workflowRef.includes('@refs/')) {
    throw new Error('workflow ref is malformed')
  }
}

export function verifyCiAssuranceEvidence({
  rootDir,
  expectedRevision,
  repository,
  runId,
  runAttempt,
  workflowRef,
  generatedAt = new Date().toISOString(),
}) {
  assertRunIdentity({ expectedRevision, repository, runId, runAttempt, workflowRef })
  const profiles = readJsonFile(rootDir, 'scripts/assurance-profiles.json', 'assurance profiles').value
  const taskCatalog = readJsonFile(rootDir, 'scripts/assurance-tasks.json', 'assurance tasks').value
  const fullTasks = profiles?.profiles?.full?.tasks
  if (!Array.isArray(fullTasks) || fullTasks.length !== 17 || new Set(fullTasks).size !== fullTasks.length) {
    throw new Error('full assurance profile must contain exactly 17 unique tasks')
  }
  const taskById = new Map((taskCatalog?.tasks ?? []).map((task) => [task.id, task]))
  if (fullTasks.some((taskId) => !taskById.has(taskId))) throw new Error('full assurance task catalog is incomplete')

  const summaryFile = readJsonFile(rootDir, '.artifacts/assurance/summary.json', 'assurance summary')
  const summary = summaryFile.value
  assertSummary(summary, expectedRevision, fullTasks)

  const taskReceiptsSha256 = {}
  const evidenceOutputsSha256 = {}
  for (const taskId of fullTasks) {
    const expectedReceiptPath = `.artifacts/assurance/tasks/${taskId}.json`
    if (summary.receipts[taskId] !== expectedReceiptPath) {
      throw new Error(`${taskId} receipt path mismatch`)
    }
    const receiptFile = readJsonFile(rootDir, expectedReceiptPath, `${taskId} receipt`)
    const receipt = receiptFile.value
    const task = taskById.get(taskId)
    assertReceipt(receipt, { taskId, task, expectedRevision })
    taskReceiptsSha256[taskId] = sha256(receiptFile.source)
    for (const output of task.outputs) {
      const outputSource = readRegularFile(rootDir, output, `${taskId} output ${output}`)
      const outputHash = sha256(outputSource)
      if (receipt.outputSha256[output] !== outputHash) {
        throw new Error(`${taskId} output hash mismatch: ${output}`)
      }
      const existing = evidenceOutputsSha256[output]
      if (existing !== undefined && existing !== outputHash) throw new Error(`conflicting output hash: ${output}`)
      evidenceOutputsSha256[output] = outputHash
    }
  }

  const evidence = {
    schema: 'bootandstrap.ci-assurance-evidence/v1',
    status: 'passed',
    claimBoundary: REMOTE_CLAIM,
    generatedAt,
    repository,
    revision: expectedRevision,
    workflowRef,
    runId: String(runId),
    runAttempt: String(runAttempt),
    sourceClaimBoundary: LOCAL_CLAIM,
    sourceExecutionMode: FORCED_EXECUTION_MODE,
    tasks: [...fullTasks],
    summarySha256: sha256(summaryFile.source),
    taskReceiptsSha256,
    evidenceOutputsSha256,
    restrictions: {
      deployment: 'not_claimed',
      commercialActivation: 'not_claimed',
      providerMutation: 'prohibited_not_executed',
    },
  }
  assertNoSensitiveFields(evidence)
  return evidence
}
