const SUCCESS_STATES = new Set(['passed', 'cached'])
const FAILURE_STATES = new Set(['failed', 'blocked', 'interrupted'])

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requireStringArray(value, label, { nonEmpty = false } = {}) {
  if (
    !Array.isArray(value)
    || (nonEmpty && value.length === 0)
    || value.some((entry) => typeof entry !== 'string' || entry.length === 0)
  ) {
    throw new Error(`${label} must be ${nonEmpty ? 'a non-empty' : 'an'} argv array of strings`)
  }
}

function taskMap(config) {
  return new Map(config.tasks.map((task) => [task.id, task]))
}

function isUnsafeRepositoryPath(relativePath) {
  return relativePath.includes('\0')
    || relativePath.includes('\\')
    || relativePath.startsWith('/')
    || /^[A-Za-z]:/.test(relativePath)
    || relativePath.split('/').some((segment) => segment === '.' || segment === '..')
}

function validateTaskShape(task, index, ids) {
  if (!isObject(task) || typeof task.id !== 'string' || task.id.length === 0) {
    throw new Error(`tasks[${index}] requires a non-empty id`)
  }
  if (ids.has(task.id)) throw new Error(`duplicate task id ${task.id}`)
  ids.add(task.id)
  requireStringArray(task.command, `task ${task.id} command`, { nonEmpty: true })
  for (const field of ['dependencies', 'inputs', 'outputs', 'environmentKeys']) {
    requireStringArray(task[field], `task ${task.id} ${field}`)
  }
}

function validateTaskCommand(task) {
  const executable = task.command[0].split('/').at(-1)
  if (['bash', 'dash', 'ksh', 'sh', 'zsh'].includes(executable) && task.command.includes('-c')) {
    throw new Error(`task ${task.id} uses forbidden shell evaluation`)
  }
}

function validateTaskPaths(task) {
  for (const input of task.inputs) {
    if (isUnsafeRepositoryPath(input)) throw new Error(`task ${task.id} has unsafe input path ${input}`)
  }
  for (const output of task.outputs) {
    if (isUnsafeRepositoryPath(output) || !output.startsWith('.artifacts/assurance/')) {
      throw new Error(`task ${task.id} output must be under .artifacts/assurance`)
    }
  }
}

function validateEnvironmentKeys(task) {
  for (const key of task.environmentKeys) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      throw new Error(`task ${task.id} has invalid environment key ${key}`)
    }
  }
}

function validateDependencies(tasks, ids) {
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      if (!ids.has(dependency)) throw new Error(`unknown dependency ${dependency} for task ${task.id}`)
    }
  }
}

export function validateTaskConfig(config) {
  if (!isObject(config) || config.schemaVersion !== 1 || !Array.isArray(config.tasks)) {
    throw new Error('task config must use schemaVersion 1 and contain tasks')
  }

  const ids = new Set()
  for (const [index, task] of config.tasks.entries()) {
    validateTaskShape(task, index, ids)
    validateTaskCommand(task)
    validateTaskPaths(task)
    validateEnvironmentKeys(task)
  }
  validateDependencies(config.tasks, ids)
  return config
}

export function buildTaskGraph(config, selectedTaskIds) {
  validateTaskConfig(config)
  requireStringArray(selectedTaskIds, 'selected task ids')
  const tasks = taskMap(config)
  const included = new Set()

  function include(taskId) {
    const task = tasks.get(taskId)
    if (!task) throw new Error(`unknown selected task ${taskId}`)
    if (included.has(taskId)) return
    included.add(taskId)
    task.dependencies.forEach(include)
  }
  selectedTaskIds.forEach(include)

  const visiting = new Set()
  const visited = new Set()
  const stack = []
  function visit(taskId) {
    if (visiting.has(taskId)) {
      const cycleStart = stack.indexOf(taskId)
      const cycle = [...stack.slice(cycleStart), taskId]
      throw new Error(`dependency cycle detected: ${cycle.join(' -> ')}`)
    }
    if (visited.has(taskId)) return
    visiting.add(taskId)
    stack.push(taskId)
    for (const dependency of tasks.get(taskId).dependencies) {
      if (included.has(dependency)) visit(dependency)
    }
    stack.pop()
    visiting.delete(taskId)
    visited.add(taskId)
  }
  [...included].sort().forEach(visit)

  return {
    ids: [...included].sort(),
    tasks,
  }
}

export function nextReadyBatch(graph, states, workers = Number.POSITIVE_INFINITY) {
  if (!Number.isInteger(workers) && workers !== Number.POSITIVE_INFINITY) {
    throw new Error('workers must be a positive integer')
  }
  if (workers <= 0) throw new Error('workers must be a positive integer')

  return graph.ids.filter((taskId) => {
    if (states[taskId] !== undefined) return false
    return graph.tasks.get(taskId).dependencies.every((dependency) =>
      SUCCESS_STATES.has(states[dependency]),
    )
  }).slice(0, workers)
}

export function propagateDependencyFailures(graph, currentStates) {
  const states = { ...currentStates }
  let changed = true
  while (changed) {
    changed = false
    for (const taskId of graph.ids) {
      if (states[taskId] !== undefined) continue
      const blocked = graph.tasks.get(taskId).dependencies.some((dependency) =>
        FAILURE_STATES.has(states[dependency]),
      )
      if (blocked) {
        states[taskId] = 'blocked'
        changed = true
      }
    }
  }
  return states
}

export function topologicalBatches(graph) {
  const states = {}
  const batches = []
  while (Object.keys(states).length < graph.ids.length) {
    const ready = nextReadyBatch(graph, states)
    if (ready.length === 0) throw new Error('dependency graph has no ready tasks')
    batches.push(ready)
    for (const taskId of ready) states[taskId] = 'passed'
  }
  return batches
}

function collectFieldMismatches(receipt, expected, fields, reasons) {
  for (const field of fields) {
    if (receipt[field] !== expected[field]) reasons.push(`${field} mismatch`)
  }
}

function collectArrayMismatches(receipt, expected, reasons) {
  for (const field of ['outputs', 'environmentKeys']) {
    const matches = Array.isArray(receipt[field])
      && JSON.stringify(receipt[field]) === JSON.stringify(expected[field])
    if (!matches) reasons.push(`${field} mismatch`)
  }
}

function collectOutputHashMismatch(receipt, expected, reasons) {
  const matches = isObject(receipt.outputSha256)
    && JSON.stringify(receipt.outputSha256) === JSON.stringify(expected.outputSha256)
  if (!matches) reasons.push('outputSha256 mismatch')
}

function collectTimestampFailure(receipt, reasons) {
  const startedAt = Date.parse(receipt.startedAt)
  const completedAt = Date.parse(receipt.completedAt)
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    reasons.push('invalid timestamps')
  }
}

function collectForbiddenFields(receipt, reasons) {
  for (const field of ['command', 'environment', 'stdout', 'stderr', 'output']) {
    if (receipt[field] !== undefined) reasons.push(`forbidden receipt field ${field}`)
  }
}

function collectMissingOutputs(receipt, outputExists, reasons) {
  if (!Array.isArray(receipt.outputs)) return
  for (const output of receipt.outputs) {
    if (!outputExists(output)) reasons.push(`declared output missing: ${output}`)
  }
}

export function validateReceipt(receipt, expected, outputExists) {
  const reasons = []
  if (!isObject(receipt)) return { valid: false, reasons: ['receipt must be an object'] }
  if (receipt.schema !== 'bootandstrap.assurance-task/v1') reasons.push('schema mismatch')
  if (receipt.status !== 'passed') reasons.push('status is not passed')

  const identityFields = [
    'profile',
    'claimBoundary',
    'taskId',
    'revision',
    'workingTreeSha256',
    'inputsSha256',
    'toolchainSha256',
    'environmentSha256',
    'profileSha256',
    'executionMode',
  ]
  collectFieldMismatches(receipt, expected, identityFields, reasons)
  collectArrayMismatches(receipt, expected, reasons)
  collectOutputHashMismatch(receipt, expected, reasons)
  collectTimestampFailure(receipt, reasons)
  collectForbiddenFields(receipt, reasons)
  collectMissingOutputs(receipt, outputExists, reasons)

  return { valid: reasons.length === 0, reasons }
}
