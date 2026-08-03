#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const policyPath = path.join(scriptDir, 'assurance-policy.json')
const riskMatrixPath = path.join(scriptDir, 'risk-test-matrix.json')
const jsonOutput = process.argv.includes('--json')

function fail(message) {
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify({ status: 'failed', error: message })}\n`)
  } else {
    process.stderr.write(`[assurance-policy] ${message}\n`)
  }
  process.exit(1)
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function matches(relativePath, selector) {
  if (selector.exact) return relativePath === selector.exact
  if (selector.prefix) return relativePath.startsWith(selector.prefix)
  if (selector.suffix) return relativePath.endsWith(selector.suffix)
  if (selector.contains) return relativePath.includes(selector.contains)
  return false
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolutePath)
    return entry.isFile() ? [absolutePath] : []
  })
}

if (!fs.existsSync(policyPath)) fail(`missing policy: ${normalize(path.relative(repoRoot, policyPath))}`)

let policy
let riskMatrix
try {
  policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'))
  riskMatrix = JSON.parse(fs.readFileSync(riskMatrixPath, 'utf8'))
} catch (error) {
  fail(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
}

if (policy.schemaVersion !== 1) fail('schemaVersion must be 1')
if (!Array.isArray(policy.sourceUniverse?.roots) || policy.sourceUniverse.roots.length === 0) {
  fail('sourceUniverse.roots must be non-empty')
}
if (!Array.isArray(policy.classificationRules) || policy.classificationRules.length === 0) {
  fail('classificationRules must be non-empty')
}

for (const exclusion of policy.sourceUniverse.exclusions ?? []) {
  if (!exclusion.selector || !exclusion.reason || !exclusion.owner) {
    fail('every exclusion requires selector, reason and owner')
  }
}

const extensions = new Set(policy.sourceUniverse.extensions)
const discovered = policy.sourceUniverse.roots.flatMap((root) => {
  const absoluteRoot = path.join(repoRoot, root)
  if (!fs.existsSync(absoluteRoot)) fail(`source root does not exist: ${root}`)
  return walk(absoluteRoot)
})
  .map((absolutePath) => normalize(path.relative(repoRoot, absolutePath)))
  .filter((relativePath) => extensions.has(path.extname(relativePath)))

const eligible = discovered.filter((relativePath) =>
  !(policy.sourceUniverse.exclusions ?? []).some((entry) => matches(relativePath, entry.selector)),
)
const classifications = new Map()
const unclassified = []

for (const relativePath of eligible) {
  const rule = policy.classificationRules.find((entry) => matches(relativePath, entry.selector))
  if (!rule) {
    unclassified.push(relativePath)
    continue
  }
  if (!rule.domain || !rule.owner || !['critical', 'high', 'medium', 'low'].includes(rule.severity)) {
    fail(`invalid classification rule for ${relativePath}`)
  }
  classifications.set(relativePath, rule)
}

const criticalDomains = policy.criticalDomains ?? []
const criticalIds = criticalDomains.map((domain) => domain.id).sort()
if (new Set(criticalIds).size !== criticalIds.length) fail('critical domain ids must be unique')

for (const domain of criticalDomains) {
  if (!Array.isArray(domain.sourceSelectors) || domain.sourceSelectors.length === 0) {
    fail(`critical domain ${domain.id} requires sourceSelectors`)
  }
  const ownedSources = eligible.filter((relativePath) =>
    domain.sourceSelectors.some((selector) => matches(relativePath, selector)),
  )
  if (ownedSources.length === 0) fail(`critical domain ${domain.id} resolves no production sources`)
  if (!domain.assuranceModes?.includes('behavioral-tests') || !domain.assuranceModes?.includes('coverage')) {
    fail(`critical domain ${domain.id} requires behavioral-tests and coverage modes`)
  }
  for (const metric of ['lines', 'functions', 'branches']) {
    const threshold = domain.targetThresholds?.[metric]
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) {
      fail(`critical domain ${domain.id} has invalid ${metric} threshold`)
    }
  }
}

const requiredCriticalIds = riskMatrix.domains
  .filter((domain) => domain.severity === 'critical')
  .map((domain) => domain.id)
  .sort()
if (JSON.stringify(criticalIds) !== JSON.stringify(requiredCriticalIds)) {
  fail(`critical domain mismatch: policy=${criticalIds.join(',')} riskMatrix=${requiredCriticalIds.join(',')}`)
}

if (unclassified.length > 0) fail(`unclassified production sources: ${unclassified.join(', ')}`)

const bySeverity = Object.fromEntries(['critical', 'high', 'medium', 'low'].map((severity) => [
  severity,
  [...classifications.values()].filter((rule) => rule.severity === severity).length,
]))
const result = {
  status: 'ok',
  policyId: policy.policyId,
  sourceUniverse: {
    discovered: discovered.length,
    excluded: discovered.length - eligible.length,
    eligible: eligible.length,
    classified: classifications.size,
    unclassified,
    bySeverity,
  },
  criticalDomains: criticalIds,
}

process.stdout.write(jsonOutput ? `${JSON.stringify(result)}\n` : `[assurance-policy] OK ${JSON.stringify(result)}\n`)
