#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluateCoverage, normalizeVitestSummary } from './lib/coverage-assurance.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const policyPath = path.join(scriptDir, 'assurance-policy.json')
const summaryPath = path.join(repoRoot, 'apps/storefront/coverage/coverage-summary.json')
const artifactDir = path.join(repoRoot, '.artifacts/assurance')
const receiptPath = path.join(artifactDir, 'coverage-assurance.json')
const startedAt = new Date()

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited ${result.status}`)
  }
}

function gitState() {
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (revision.status !== 0) throw new Error('unable to resolve git revision')

  const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (status.status !== 0) throw new Error('unable to resolve git working tree state')

  return {
    revision: revision.stdout.trim(),
    workingTreeDirty: status.stdout.trim().length > 0,
  }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

try {
  run(process.execPath, [path.join(scriptDir, 'check-assurance-policy.mjs')])
  fs.rmSync(summaryPath, { force: true })
  run('pnpm', [
    '--filter=storefront',
    'test:run',
    '--coverage',
    '--coverage.reporter=text',
    '--coverage.reporter=html',
    '--coverage.reporter=lcov',
    '--coverage.reporter=json-summary',
    '--no-file-parallelism',
    '--maxWorkers=1',
  ])

  if (!fs.existsSync(summaryPath)) throw new Error('coverage summary was not generated')
  const summaryStat = fs.statSync(summaryPath)
  if (summaryStat.mtimeMs < startedAt.getTime()) throw new Error('coverage summary is stale')

  const policySource = fs.readFileSync(policyPath, 'utf8')
  const policy = JSON.parse(policySource)
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  const evaluation = evaluateCoverage(policy, normalizeVitestSummary(summary, repoRoot))
  const receipt = {
    schema: 'bootandstrap.coverage-assurance/v1',
    generatedAt: new Date().toISOString(),
    ...gitState(),
    policyId: policy.policyId,
    policySha256: sha256(policySource),
    claimBoundary: policy.claimBoundary,
    ...evaluation,
  }

  fs.mkdirSync(artifactDir, { recursive: true })
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  process.stdout.write(`[coverage-assurance] ${evaluation.status.toUpperCase()} ${receiptPath}\n`)
  if (evaluation.failures.length > 0) {
    for (const failure of evaluation.failures) process.stderr.write(`[coverage-assurance] ${failure}\n`)
    process.exit(1)
  }
} catch (error) {
  process.stderr.write(`[coverage-assurance] FAILED: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
