#!/usr/bin/env node

import { readFileSync, renameSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveTaskIdentity } from './lib/assurance-identity.mjs'
import {
  STOREFRONT_COVERAGE_OUTPUT,
  STOREFRONT_TESTS_OUTPUT,
  hashEvidenceFile,
  validateCoverageEvidence,
  validateStorefrontEvidenceReceipt,
} from './run-storefront-assurance.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(SCRIPT_DIR, '..')

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`${label} is missing or malformed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function writeJsonAtomic(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  renameSync(temporaryPath, filePath)
}

async function main() {
  const taskConfig = readJson(join(SCRIPT_DIR, 'assurance-tasks.json'), 'assurance task config')
  const task = taskConfig.tasks?.find((entry) => entry?.id === 'storefront-assurance')
  if (!task) throw new Error('storefront-assurance task is not declared')
  const identity = await resolveTaskIdentity(ROOT_DIR, task)
  const receipt = readJson(
    join(ROOT_DIR, '.artifacts', 'assurance', 'tasks', 'storefront-assurance.json'),
    'storefront assurance receipt',
  )
  const testsArtifact = readJson(join(ROOT_DIR, STOREFRONT_TESTS_OUTPUT), 'storefront tests artifact')
  const coverageArtifact = readJson(
    join(ROOT_DIR, STOREFRONT_COVERAGE_OUTPUT),
    'storefront coverage artifact',
  )
  const outputSha256 = {
    [STOREFRONT_TESTS_OUTPUT]: hashEvidenceFile(join(ROOT_DIR, STOREFRONT_TESTS_OUTPUT)),
    [STOREFRONT_COVERAGE_OUTPUT]: hashEvidenceFile(join(ROOT_DIR, STOREFRONT_COVERAGE_OUTPUT)),
  }

  validateStorefrontEvidenceReceipt({
    receipt,
    testsArtifact,
    currentIdentity: identity,
    outputSha256,
  })
  validateCoverageEvidence(coverageArtifact, identity, { receipt, outputSha256 })

  const compatibilityReceipt = {
    schema: 'bootandstrap.coverage-assurance/v1',
    generatedAt: new Date().toISOString(),
    ...identity,
    policyId: coverageArtifact.policyId,
    policySha256: coverageArtifact.policySha256,
    claimBoundary: coverageArtifact.claimBoundary,
    status: coverageArtifact.status,
    failures: coverageArtifact.failures,
    totals: coverageArtifact.totals,
    domains: coverageArtifact.domains,
    source: STOREFRONT_COVERAGE_OUTPUT,
  }
  const outputPath = join(ROOT_DIR, '.artifacts', 'assurance', 'coverage-assurance.json')
  writeJsonAtomic(outputPath, compatibilityReceipt)
  process.stdout.write(`[coverage-assurance] PASSED ${outputPath}\n`)
}

main().catch((error) => {
  process.stderr.write(`[coverage-assurance] FAILED: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
