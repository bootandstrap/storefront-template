#!/usr/bin/env node
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const PINNED_COMPOSE_LINT_VERSION = '0.14.1'
export const COMPOSE_FILES = Object.freeze([
  'docker-compose.yml',
  'docker-compose.dev.yml',
  'scripts/templates/docker-compose.client.yml',
])

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const DEFAULT_ROOT_DIR = resolve(dirname(SCRIPT_PATH), '..')
const VERSION_ARGS = Object.freeze([
  '--from',
  `compose-lint==${PINNED_COMPOSE_LINT_VERSION}`,
  'compose-lint',
  '--version',
])
const CHECK_ARGS = Object.freeze([
  '--from',
  `compose-lint==${PINNED_COMPOSE_LINT_VERSION}`,
  'compose-lint',
  'check',
  '--strict-config',
  '--fail-on',
  'high',
  '--format',
  'sarif',
  ...COMPOSE_FILES,
])

function assertRequiredFiles(rootDir) {
  for (const relativePath of ['.compose-lint.yml', ...COMPOSE_FILES]) {
    if (!existsSync(join(rootDir, relativePath))) {
      const kind = relativePath === '.compose-lint.yml' ? 'config file' : 'Compose file'
      throw new Error(`missing required ${kind}: ${relativePath}`)
    }
  }
}

function execute(spawn, args, rootDir) {
  const result = spawn('uvx', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  })

  if (result?.error?.code === 'ENOENT') {
    throw new Error('uvx is unavailable; Compose assurance fails closed')
  }
  if (result?.error) {
    throw new Error(`uvx could not execute: ${result.error.message}`)
  }
  return result
}

function assertPinnedVersion(spawn, rootDir) {
  const result = execute(spawn, VERSION_ARGS, rootDir)
  if (result.status !== 0) {
    throw new Error(`compose-lint version check failed with exit code ${result.status}`)
  }

  const match = /^compose-lint\s+([^\s]+)\s*$/.exec(result.stdout ?? '')
  const actual = match?.[1] ?? '<malformed>'
  if (actual !== PINNED_COMPOSE_LINT_VERSION) {
    throw new Error(
      `compose-lint version mismatch: expected ${PINNED_COMPOSE_LINT_VERSION}, received ${actual}`,
    )
  }
}

function parseSarifJson(stdout) {
  try {
    return JSON.parse(stdout)
  } catch {
    throw new Error('compose-lint returned malformed SARIF JSON')
  }
}

function singleSarifRun(document) {
  if (document?.version !== '2.1.0' || !Array.isArray(document?.runs) || document.runs.length !== 1) {
    throw new Error('compose-lint returned a malformed SARIF document')
  }
  return document.runs[0]
}

function assertSarifDriver(run) {
  const driver = run?.tool?.driver
  const valid = [
    driver?.name === 'compose-lint',
    driver?.version === PINNED_COMPOSE_LINT_VERSION,
    Array.isArray(driver?.rules),
  ].every(Boolean)
  if (!valid) throw new Error('compose-lint returned a malformed SARIF document')
}

function assertSarifExecution(run) {
  const valid = [
    Array.isArray(run?.results),
    Array.isArray(run?.invocations),
    run?.invocations?.length === 1,
    run?.invocations?.[0]?.executionSuccessful === true,
  ].every(Boolean)
  if (!valid) throw new Error('compose-lint returned a malformed SARIF document')
}

function parseSarif(stdout) {
  const document = parseSarifJson(stdout)
  const run = singleSarifRun(document)
  assertSarifDriver(run)
  assertSarifExecution(run)
  return { document, run }
}

function assertSuppressionMetadata(suppression) {
  const justification = suppression?.justification
  const hasReason = typeof justification === 'string' && /\breason\s*:\s*\S+/i.test(justification)
  const hasOwner = typeof justification === 'string' && /\bowner\s*:\s*\S+/i.test(justification)
  const hasReviewDate = typeof justification === 'string' &&
    /\breview(?:\s+date)?\s*:\s*\d{4}-\d{2}-\d{2}\b/i.test(justification)

  if (!hasReason || !hasOwner || !hasReviewDate) {
    throw new Error('suppression must include a non-empty reason, owner, and ISO review date')
  }
}

function assertSarifResult(result) {
  if (!result || typeof result.ruleId !== 'string') {
    throw new Error('compose-lint returned a malformed SARIF result')
  }
}

function hasValidSuppressions(result) {
  if (result.suppressions === undefined) return false
  if (!Array.isArray(result.suppressions) || result.suppressions.length === 0) {
    throw new Error('compose-lint returned a malformed SARIF suppression')
  }
  result.suppressions.forEach(assertSuppressionMetadata)
  return true
}

function isHighOrCriticalResult(result, severities) {
  const securitySeverity = severities.get(result.ruleId)
  return Number.isFinite(securitySeverity) && securitySeverity >= 7
    ? true
    : result.level === 'error'
}

function collectHighOrCriticalFindings(run) {
  const severities = new Map(run.tool.driver.rules.map((rule) => [
    rule?.id,
    Number(rule?.properties?.['security-severity']),
  ]))
  const findings = []

  for (const result of run.results) {
    assertSarifResult(result)
    if (hasValidSuppressions(result)) continue
    if (isHighOrCriticalResult(result, severities)) findings.push(result.ruleId)
  }

  return findings
}

function writeSarifAtomically(outputPath, document) {
  mkdirSync(dirname(outputPath), { recursive: true })
  const temporaryPath = `${outputPath}.${process.pid}.tmp`
  writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
  renameSync(temporaryPath, outputPath)
}

export function runComposeAssurance({
  rootDir = DEFAULT_ROOT_DIR,
  outputPath = join(rootDir, '.artifacts', 'assurance', 'compose-lint.sarif'),
  spawn = spawnSync,
} = {}) {
  assertRequiredFiles(rootDir)
  assertPinnedVersion(spawn, rootDir)

  const result = execute(spawn, CHECK_ARGS, rootDir)
  if (![0, 1].includes(result.status)) {
    throw new Error(`compose-lint check failed with exit code ${result.status}`)
  }

  const { document, run } = parseSarif(result.stdout ?? '')
  const highOrCritical = collectHighOrCriticalFindings(run)
  writeSarifAtomically(outputPath, document)

  if (highOrCritical.length > 0) {
    throw new Error(`HIGH/CRITICAL finding(s): ${[...new Set(highOrCritical)].join(', ')}`)
  }
  if (result.status !== 0) {
    throw new Error('compose-lint exited 1 without a valid HIGH/CRITICAL finding')
  }

  return {
    status: 'passed',
    tool: `compose-lint ${PINNED_COMPOSE_LINT_VERSION}`,
    files: [...COMPOSE_FILES],
    findings: run.results.length,
    output: outputPath,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    const summary = runComposeAssurance()
    console.log(JSON.stringify(summary))
  } catch (error) {
    console.error(`[compose-assurance] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
