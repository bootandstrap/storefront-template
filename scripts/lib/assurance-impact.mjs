import { spawnSync } from 'node:child_process'
import path from 'node:path'

const SELECTOR_KEYS = ['exact', 'prefix', 'suffix', 'contains']

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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
  if (!isObject(selector)) throw new Error(`${label} must be an object`)
  const operations = SELECTOR_KEYS.filter((key) => selector[key] !== undefined)
  if (operations.length !== 1) throw new Error(`${label} must define exactly one selector operation`)
  requireString(selector[operations[0]], `${label}.${operations[0]}`)
}

function matches(relativePath, selector) {
  if (selector.exact !== undefined) return relativePath === selector.exact
  if (selector.prefix !== undefined) return relativePath.startsWith(selector.prefix)
  if (selector.suffix !== undefined) return relativePath.endsWith(selector.suffix)
  return relativePath.includes(selector.contains)
}

function assertSafePath(relativePath) {
  if (
    typeof relativePath !== 'string'
    || relativePath.length === 0
    || relativePath.includes('\0')
    || relativePath.includes('\\')
    || path.posix.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error(`unsafe changed path: ${String(relativePath)}`)
  }
}

function runGit(repoRoot, args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  })
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed with exit ${result.status}`)
  }
  return result.stdout
}

function nulPaths(output) {
  return output.split('\0').filter(Boolean)
}

function validateBase(base) {
  requireString(base, 'assurance base')
  if (base.startsWith('-') || !/^[A-Za-z0-9][A-Za-z0-9._/@{}+~^-]*$/.test(base)) {
    throw new Error(`unsafe base ref: ${base}`)
  }
  return base
}

export async function discoverChangedFiles(repoRoot, { base, defaultBaseRef } = {}) {
  const resolvedBase = validateBase(base ?? defaultBaseRef)
  const mergeBase = runGit(repoRoot, ['merge-base', resolvedBase, 'HEAD']).trim()
  const changed = new Set([
    ...nulPaths(runGit(repoRoot, ['diff', '--name-only', '-z', mergeBase, 'HEAD', '--'])),
    ...nulPaths(runGit(repoRoot, ['diff', '--cached', '--name-only', '-z', '--'])),
    ...nulPaths(runGit(repoRoot, ['diff', '--name-only', '-z', '--'])),
    ...nulPaths(runGit(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z', '--'])),
  ])
  const files = [...changed].sort()
  files.forEach(assertSafePath)
  return files
}

function validateImpactRuleFlags(rule) {
  if (rule.critical !== undefined && typeof rule.critical !== 'boolean') {
    throw new Error(`impact rule ${rule.id}.critical must be boolean`)
  }
  if (rule.fullProfileDryRun !== undefined && typeof rule.fullProfileDryRun !== 'boolean') {
    throw new Error(`impact rule ${rule.id}.fullProfileDryRun must be boolean`)
  }
}

function validateImpactRuleTasks(rule, knownTasks) {
  requireStringArray(rule.tasks, `impact rule ${rule.id}.tasks`)
  for (const taskId of rule.tasks) {
    if (!knownTasks.has(taskId)) throw new Error(`unknown task ${taskId} in impact rule ${rule.id}`)
  }
}

function validateImpactRule(rule, index, ids, knownTasks) {
  if (!isObject(rule)) throw new Error(`impact rule ${index} must be an object`)
  requireString(rule.id, `impact rule ${index}.id`)
  if (ids.has(rule.id)) throw new Error(`duplicate impact rule ${rule.id}`)
  ids.add(rule.id)
  if (!Array.isArray(rule.selectors) || rule.selectors.length === 0) {
    throw new Error(`impact rule ${rule.id}.selectors must be non-empty`)
  }
  rule.selectors.forEach((selector, selectorIndex) => {
    validateSelector(selector, `impact rule ${rule.id}.selectors[${selectorIndex}]`)
  })
  validateImpactRuleTasks(rule, knownTasks)
  requireString(rule.reason, `impact rule ${rule.id}.reason`)
  validateImpactRuleFlags(rule)
}

export function validateImpactConfig(config, knownTasks) {
  if (!isObject(config) || config.schemaVersion !== 1 || !Array.isArray(config.rules)) {
    throw new Error('assurance impact config must use schemaVersion 1 and contain rules')
  }
  validateBase(config.defaultBaseRef)
  const ids = new Set()
  for (const [index, rule] of config.rules.entries()) {
    validateImpactRule(rule, index, ids, knownTasks)
  }
  return config
}

export function selectImpact(config, changedFiles, { profiles, policy }) {
  if (!Array.isArray(changedFiles)) throw new Error('changedFiles must be an array')
  changedFiles.forEach(assertSafePath)
  const catalog = new Map(profiles.taskCatalog.map((task) => [task.id, task]))
  validateImpactConfig(config, new Set(catalog.keys()))

  const matchedRules = config.rules.flatMap((rule) => {
    const paths = changedFiles.filter((changedPath) =>
      rule.selectors.some((selector) => matches(changedPath, selector)),
    )
    return paths.length > 0 ? [{ ...rule, paths }] : []
  })
  const tasks = []
  const selected = new Set()
  for (const rule of matchedRules) {
    for (const taskId of rule.tasks) {
      if (selected.has(taskId)) continue
      selected.add(taskId)
      tasks.push(taskId)
    }
  }

  for (const changedPath of changedFiles) {
    const classification = policy.classificationRules.find((rule) => matches(changedPath, rule.selector))
    if (classification?.severity !== 'critical') continue
    const hasBehavioralMapping = matchedRules.some((rule) =>
      rule.critical
      && rule.paths.includes(changedPath)
      && rule.tasks.some((taskId) => catalog.get(taskId)?.kind === 'behavioral'),
    )
    if (!hasBehavioralMapping) {
      throw new Error(`critical source ${changedPath} has no behavioral impact mapping`)
    }
  }

  return {
    tasks,
    reasons: matchedRules.map((rule) => ({
      ruleId: rule.id,
      reason: rule.reason,
      paths: rule.paths,
      tasks: rule.tasks,
    })),
    matchedRules: matchedRules.map((rule) => rule.id),
    fullProfileDryRun: matchedRules.some((rule) => rule.fullProfileDryRun),
  }
}
