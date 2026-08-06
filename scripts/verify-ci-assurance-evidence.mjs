#!/usr/bin/env node

import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { verifyCiAssuranceEvidence } from './lib/ci-assurance-evidence.mjs'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const ROOT_DIR = resolve(dirname(SCRIPT_PATH), '..')
const OUTPUT_PATH = resolve(ROOT_DIR, '.artifacts/assurance/ci-assurance-evidence.json')

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
    renameSync(temporaryPath, path)
  } finally {
    rmSync(temporaryPath, { force: true })
  }
}

function main() {
  const evidence = verifyCiAssuranceEvidence({
    rootDir: ROOT_DIR,
    expectedRevision: process.env.GITHUB_SHA,
    repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    workflowRef: process.env.GITHUB_WORKFLOW_REF,
  })
  writeJsonAtomic(OUTPUT_PATH, evidence)
  process.stdout.write(`${JSON.stringify({
    schema: evidence.schema,
    status: evidence.status,
    repository: evidence.repository,
    revision: evidence.revision,
    runId: evidence.runId,
    taskCount: evidence.tasks.length,
  })}\n`)
}

try {
  main()
} catch (error) {
  process.stderr.write(`[ci-assurance-evidence] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
