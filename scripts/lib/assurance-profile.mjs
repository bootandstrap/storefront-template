import path from 'node:path'

const SELECTOR_KEYS = ['exact', 'prefix', 'suffix', 'contains']
const TASK_KINDS = new Set(['static', 'behavioral', 'build'])

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.length === 0)) {
    throw new Error(`${label} must be an array of non-empty strings`)
  }
}

function validateSelector(selector, label) {
  requireObject(selector, label)
  const populatedKeys = SELECTOR_KEYS.filter((key) => selector[key] !== undefined)
  if (populatedKeys.length !== 1) {
    throw new Error(`${label} must define exactly one selector operation`)
  }
  requireString(selector[populatedKeys[0]], `${label}.${populatedKeys[0]}`)
}

function matches(relativePath, selector) {
  if (selector.exact !== undefined) return relativePath === selector.exact
  if (selector.prefix !== undefined) return relativePath.startsWith(selector.prefix)
  if (selector.suffix !== undefined) return relativePath.endsWith(selector.suffix)
  return relativePath.includes(selector.contains)
}

function assertSafeChangedPath(changedPath) {
  if (
    typeof changedPath !== 'string'
    || changedPath.length === 0
    || changedPath.includes('\0')
    || changedPath.includes('\\')
    || path.posix.isAbsolute(changedPath)
    || path.win32.isAbsolute(changedPath)
    || changedPath.split('/').some((segment) => segment === '..' || segment === '.')
  ) {
    throw new Error(`unsafe changed path: ${String(changedPath)}`)
  }
}

function taskMapFor(config) {
  return new Map(config.taskCatalog.map((task) => [task.id, task]))
}

function validateTaskReferences(taskIds, knownTasks, label) {
  requireStringArray(taskIds, label)
  for (const taskId of taskIds) {
    if (!knownTasks.has(taskId)) throw new Error(`unknown task ${taskId} in ${label}`)
  }
}

export function duplicates(values) {
  const seen = new Set()
  const repeated = new Set()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return [...repeated]
}

function validateTaskCatalog(config) {
  if (!Array.isArray(config.taskCatalog) || config.taskCatalog.length === 0) {
    throw new Error('taskCatalog must be a non-empty array')
  }
  for (const [index, task] of config.taskCatalog.entries()) {
    requireObject(task, `taskCatalog[${index}]`)
    requireString(task.id, `taskCatalog[${index}].id`)
    if (!TASK_KINDS.has(task.kind)) throw new Error(`invalid task kind for ${task.id}`)
    if (task.provides !== undefined) requireStringArray(task.provides, `${task.id}.provides`)
  }
  const taskIds = config.taskCatalog.map((task) => task.id)
  const duplicateTaskIds = duplicates(taskIds)
  if (duplicateTaskIds.length > 0) throw new Error(`duplicate task ids: ${duplicateTaskIds.join(', ')}`)
  return new Set(taskIds)
}

function validateCriticalSelectors(config) {
  if (!Array.isArray(config.criticalSourceSelectors) || config.criticalSourceSelectors.length === 0) {
    throw new Error('criticalSourceSelectors must be a non-empty array')
  }
  config.criticalSourceSelectors.forEach((selector, index) => {
    validateSelector(selector, `criticalSourceSelectors[${index}]`)
  })
}

function validateProfileRule(rule, index, knownTasks) {
  requireObject(rule, `selector rule ${index}`)
  requireString(rule.id, `selector rule ${index}.id`)
  validateSelector(rule.selector, `selector rule ${rule.id}`)
  validateTaskReferences(rule.tasks, knownTasks, `selector rule ${rule.id}`)
  if (rule.claimBoundary !== undefined) requireString(rule.claimBoundary, `selector rule ${rule.id}.claimBoundary`)
  if (rule.critical !== undefined && typeof rule.critical !== 'boolean') {
    throw new Error(`selector rule ${rule.id}.critical must be boolean`)
  }
}

function validateProfile(profileName, profile, knownTasks) {
  requireObject(profile, `profile ${profileName}`)
  requireString(profile.claimBoundary, `profile ${profileName}.claimBoundary`)
  requireStringArray(profile.deferred, `profile ${profileName}.deferred`)
  validateTaskReferences(profile.tasks ?? [], knownTasks, `profile ${profileName}.tasks`)
  validateTaskReferences(profile.alwaysTasks ?? [], knownTasks, `profile ${profileName}.alwaysTasks`)
  if (!Array.isArray(profile.selectorRules)) throw new Error(`profile ${profileName}.selectorRules must be an array`)

  profile.selectorRules.forEach((rule, index) => validateProfileRule(rule, index, knownTasks))
  const duplicateRuleIds = duplicates(profile.selectorRules.map((rule) => rule.id))
  if (duplicateRuleIds.length > 0) {
    throw new Error(`duplicate selector rule ids in ${profileName}: ${duplicateRuleIds.join(', ')}`)
  }
}

export function validateProfiles(config) {
  requireObject(config, 'assurance profiles')
  if (config.schemaVersion !== 1) throw new Error('assurance profiles schemaVersion must be 1')
  const knownTasks = validateTaskCatalog(config)
  validateCriticalSelectors(config)

  requireObject(config.profiles, 'profiles')
  for (const [profileName, profile] of Object.entries(config.profiles)) {
    validateProfile(profileName, profile, knownTasks)
  }

  return config
}

export function providedCapabilities(config, taskIds) {
  validateProfiles(config)
  const tasks = taskMapFor(config)
  return taskIds.flatMap((taskId) => {
    const task = tasks.get(taskId)
    if (!task) throw new Error(`unknown task ${taskId}`)
    return task.provides ?? [task.id]
  })
}

function selectedTasksForProfile(profile, matchedRules) {
  const tasks = []
  const selected = new Set()
  const add = (taskIds) => {
    for (const taskId of taskIds) {
      if (selected.has(taskId)) continue
      selected.add(taskId)
      tasks.push(taskId)
    }
  }
  add(profile.tasks ?? [])
  add(profile.alwaysTasks ?? [])
  matchedRules.forEach((rule) => add(rule.tasks))
  return tasks
}

function assertCompatibleClaims(profile, matchedRules) {
  const claims = new Set([
    profile.claimBoundary,
    ...matchedRules.flatMap((rule) => rule.claimBoundary ? [rule.claimBoundary] : []),
  ])
  if (claims.size > 1) {
    throw new Error(`contradictory claim boundaries selected: ${[...claims].join(', ')}`)
  }
}

function assertCriticalBehavioralMappings(config, catalog, changedFiles, matchedRules) {
  for (const changedPath of changedFiles) {
    const critical = config.criticalSourceSelectors.some((selector) => matches(changedPath, selector))
    if (!critical) continue
    const behavioralRules = matchedRules.filter((rule) =>
      rule.critical
      && matches(changedPath, rule.selector)
      && rule.tasks.some((taskId) => catalog.get(taskId).kind === 'behavioral'),
    )
    if (behavioralRules.length > 0) continue
    const criticalRule = matchedRules.find((rule) => rule.critical && matches(changedPath, rule.selector))
    throw new Error(`critical change ${criticalRule?.id ?? changedPath} selects no behavioral task`)
  }
}

export function resolveProfile(config, profileName, changedFiles) {
  validateProfiles(config)
  const profile = config.profiles[profileName]
  if (!profile) throw new Error(`unknown profile: ${profileName}`)
  if (!Array.isArray(changedFiles)) throw new Error('changedFiles must be an array')
  changedFiles.forEach(assertSafeChangedPath)

  const catalog = taskMapFor(config)
  const matchedRules = profile.selectorRules.filter((rule) =>
    changedFiles.some((changedPath) => matches(changedPath, rule.selector)),
  )
  const selectedTasks = selectedTasksForProfile(profile, matchedRules)
  assertCompatibleClaims(profile, matchedRules)
  assertCriticalBehavioralMappings(config, catalog, changedFiles, matchedRules)

  return {
    profile: profileName,
    claimBoundary: profile.claimBoundary,
    tasks: selectedTasks,
    deferred: [...profile.deferred],
    changedFiles: [...changedFiles],
    matchedRules: matchedRules.map((rule) => rule.id),
  }
}
