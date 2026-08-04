import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  COMPOSE_FILES,
  PINNED_COMPOSE_LINT_VERSION,
  runComposeAssurance,
} from './run-compose-assurance.mjs'

function makeRoot({ missing = [] } = {}) {
  const rootDir = mkdtempSync(join(tmpdir(), 'bns-compose-assurance-'))
  writeFileSync(join(rootDir, '.compose-lint.yml'), 'rules: {}\n', 'utf8')

  for (const relativePath of COMPOSE_FILES) {
    if (missing.includes(relativePath)) continue
    const absolutePath = join(rootDir, relativePath)
    const parent = absolutePath.slice(0, absolutePath.lastIndexOf('/'))
    if (parent !== rootDir) mkdirSync(parent, { recursive: true })
    writeFileSync(absolutePath, 'services: {}\n', 'utf8')
  }

  return rootDir
}

function sarif({
  version = PINNED_COMPOSE_LINT_VERSION,
  severity = undefined,
  suppressed = false,
  justification = undefined,
} = {}) {
  const rules = severity ? [{
    id: 'CL-TEST',
    defaultConfiguration: { level: severity >= 7 ? 'error' : 'warning' },
    properties: { 'security-severity': String(severity) },
  }] : []
  const results = severity ? [{
    ruleId: 'CL-TEST',
    level: severity >= 7 ? 'error' : 'warning',
    message: { text: 'synthetic finding' },
    ...(suppressed ? { suppressions: [{ kind: 'external', justification }] } : {}),
  }] : []

  return {
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'compose-lint', version, rules } },
      invocations: [{ executionSuccessful: true }],
      results,
    }],
  }
}

function spawnFor(document, calls = []) {
  return (executable, args, options) => {
    calls.push({ executable, args, options })
    if (args.at(-1) === '--version') {
      return { status: 0, stdout: `compose-lint ${PINNED_COMPOSE_LINT_VERSION}\n`, stderr: '' }
    }
    return { status: 0, stdout: `${JSON.stringify(document)}\n`, stderr: '' }
  }
}

test('scans exactly the three approved Compose files with a read-only pinned command', () => {
  const rootDir = makeRoot()
  const outputPath = join(rootDir, '.artifacts', 'assurance', 'compose-lint.sarif')
  const calls = []

  const result = runComposeAssurance({ rootDir, outputPath, spawn: spawnFor(sarif(), calls) })

  assert.equal(result.status, 'passed')
  assert.equal(existsSync(outputPath), true)
  assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), sarif())
  assert.deepEqual(calls[1].args, [
    '--from', `compose-lint==${PINNED_COMPOSE_LINT_VERSION}`,
    'compose-lint', 'check', '--strict-config', '--fail-on', 'high', '--format', 'sarif',
    ...COMPOSE_FILES,
  ])
  assert.equal(calls.every(({ args }) => !args.includes('fix') && !args.includes('--apply')), true)
})

test('fails closed when any approved Compose file is missing', () => {
  const missing = COMPOSE_FILES[2]
  const rootDir = makeRoot({ missing: [missing] })

  assert.throws(
    () => runComposeAssurance({ rootDir, spawn: spawnFor(sarif()) }),
    new RegExp(`missing required Compose file: ${missing.replaceAll('.', '\\.')}`),
  )
})

test('fails closed when uvx is absent', () => {
  const rootDir = makeRoot()
  const spawn = () => ({
    status: null,
    stdout: '',
    stderr: '',
    error: Object.assign(new Error('spawnSync uvx ENOENT'), { code: 'ENOENT' }),
  })

  assert.throws(() => runComposeAssurance({ rootDir, spawn }), /uvx.*unavailable/i)
})

test('fails closed on a compose-lint version mismatch', () => {
  const rootDir = makeRoot()
  const spawn = () => ({ status: 0, stdout: 'compose-lint 0.14.0\n', stderr: '' })

  assert.throws(() => runComposeAssurance({ rootDir, spawn }), /version mismatch.*0\.14\.1.*0\.14\.0/i)
})

test('fails closed on malformed JSON or malformed SARIF', () => {
  const rootDir = makeRoot()
  const version = { status: 0, stdout: `compose-lint ${PINNED_COMPOSE_LINT_VERSION}\n`, stderr: '' }
  let call = 0
  const malformedJson = () => (++call === 1 ? version : { status: 0, stdout: '{broken', stderr: '' })

  assert.throws(() => runComposeAssurance({ rootDir, spawn: malformedJson }), /malformed SARIF JSON/i)
  assert.throws(
    () => runComposeAssurance({ rootDir, spawn: spawnFor({ version: '2.1.0', runs: [] }) }),
    /malformed SARIF document/i,
  )
  assert.throws(
    () => runComposeAssurance({ rootDir, spawn: spawnFor({ version: '2.1.0', runs: null }) }),
    /malformed SARIF document/i,
  )
})

test('fails closed on unsuppressed HIGH and CRITICAL findings', () => {
  for (const severity of [7.5, 9.5]) {
    const rootDir = makeRoot()
    assert.throws(
      () => runComposeAssurance({ rootDir, spawn: spawnFor(sarif({ severity })) }),
      /HIGH\/CRITICAL finding.*CL-TEST/i,
    )
  }
})

test('rejects suppressions without a concrete reason, owner, and review date', () => {
  const invalidJustifications = [
    undefined,
    '',
    'disabled in .compose-lint.yml',
    'Reason: local development exception',
    'Reason: local development exception; Owner: platform',
  ]

  for (const justification of invalidJustifications) {
    const rootDir = makeRoot()
    assert.throws(
      () => runComposeAssurance({
        rootDir,
        spawn: spawnFor(sarif({ severity: 7.5, suppressed: true, justification })),
      }),
      /suppression.*reason.*owner.*review date/i,
    )
  }
})

test('accepts a visible suppression only with complete review metadata', () => {
  const rootDir = makeRoot()
  const justification = 'Reason: reverse proxy exception; Owner: platform; Review: 2026-12-01'

  const result = runComposeAssurance({
    rootDir,
    spawn: spawnFor(sarif({ severity: 7.5, suppressed: true, justification })),
  })

  assert.equal(result.status, 'passed')
  assert.equal(result.findings, 1)
})
