#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runGit } from './lib/assurance-identity.mjs'
import { writeAssuranceProfileSetReceipt } from './lib/assurance-profile-receipts.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

function requireForcedExecution(argv) {
  const args = argv.filter(argument => argument !== '--')
  if (args.length !== 1 || args[0] !== '--no-cache') {
    throw new Error('--no-cache is required and is the only supported option')
  }
}

function runProfile(profile) {
  const result = spawnSync(process.execPath, [
    'scripts/run-assurance.mjs',
    '--profile',
    profile,
    '--no-cache',
  ], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${profile} assurance failed with status ${result.status}`)
}

async function main() {
  requireForcedExecution(process.argv.slice(2))
  const revision = runGit(repoRoot, ['rev-parse', 'HEAD']).toString('utf8').trim()
  runProfile('fast')
  runProfile('full')
  const receipt = await writeAssuranceProfileSetReceipt({ rootDir: repoRoot, expectedRevision: revision })
  process.stdout.write(`${JSON.stringify(receipt)}\n`)
}

main().catch(error => {
  process.stderr.write(`[assurance:profiles] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
