#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(SCRIPT_DIR, '..')
const MATRIX_PATH = join(SCRIPT_DIR, 'risk-test-matrix.json')

const REQUIRED_DOMAINS = new Set([
  'security-auth-tenant-isolation',
  'checkout-payment-simulators',
  'pos-simulator',
  'module-runtime-primary-journeys',
  'provisioning-cleanup-governance',
  'ci-release-artifacts',
])

function fail(message) {
  console.error(`[risk-test-matrix] ${message}`)
  process.exitCode = 1
}

function readMatrix() {
  try {
    return JSON.parse(readFileSync(MATRIX_PATH, 'utf8'))
  } catch (error) {
    fail(`cannot read ${MATRIX_PATH}: ${error instanceof Error ? error.message : String(error)}`)
    return { domains: [] }
  }
}

function validateTestFile(relativePath, domainId) {
  const normalized = normalize(relativePath)
  const absolutePath = resolve(ROOT_DIR, normalized)

  if (!absolutePath.startsWith(`${ROOT_DIR}/`)) {
    fail(`${domainId}: test path escapes repo root: ${relativePath}`)
    return
  }

  if (!/^apps\/storefront\/src\/.+\.test\.(ts|tsx)$/.test(normalized)) {
    fail(`${domainId}: ${relativePath} is not a storefront Vitest test path`)
    return
  }

  if (!existsSync(absolutePath)) {
    fail(`${domainId}: missing required test file ${relativePath}`)
    return
  }

  const source = readFileSync(absolutePath, 'utf8')
  if (!/\bdescribe\s*\(/.test(source) || !/\bit\s*\(/.test(source)) {
    fail(`${domainId}: ${relativePath} must contain executable describe/it tests`)
  }
}

const matrix = readMatrix()

if (matrix.schemaVersion !== 1) fail('schemaVersion must be 1')
if (!Array.isArray(matrix.domains)) fail('domains must be an array')

const seenDomains = new Set()

for (const domain of matrix.domains ?? []) {
  if (!REQUIRED_DOMAINS.has(domain.id)) fail(`unknown risk domain: ${domain.id}`)
  if (seenDomains.has(domain.id)) fail(`duplicate risk domain: ${domain.id}`)
  seenDomains.add(domain.id)

  if (!['critical', 'high'].includes(domain.severity)) {
    fail(`${domain.id}: severity must be critical or high`)
  }

  if (!Array.isArray(domain.requiredTestFiles)) {
    fail(`${domain.id}: requiredTestFiles must be an array`)
    continue
  }

  const minTestFiles = Number(domain.minTestFiles ?? 2)
  if (domain.requiredTestFiles.length < minTestFiles) {
    fail(`${domain.id}: expected at least ${minTestFiles} required test files`)
  }

  for (const testFile of domain.requiredTestFiles) {
    validateTestFile(testFile, domain.id)
  }
}

for (const requiredDomain of REQUIRED_DOMAINS) {
  if (!seenDomains.has(requiredDomain)) fail(`missing risk domain: ${requiredDomain}`)
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

console.log(`[risk-test-matrix] OK (${seenDomains.size} domains)`)
