#!/usr/bin/env node

import { lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runGit } from './lib/assurance-identity.mjs'
import { buildAssuranceProfileSetReceipt } from './lib/assurance-profile-receipts.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

function main() {
  const receiptPath = path.join(repoRoot, '.artifacts/assurance/profile-set.json')
  const stat = lstatSync(receiptPath)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('profile set must be a regular non-symlink file')
  const stored = JSON.parse(readFileSync(receiptPath, 'utf8'))
  const revision = runGit(repoRoot, ['rev-parse', 'HEAD']).toString('utf8').trim()
  const expected = buildAssuranceProfileSetReceipt({
    rootDir: repoRoot,
    expectedRevision: revision,
    generatedAt: stored.generatedAt,
  })
  if (JSON.stringify(stored) !== JSON.stringify(expected)) throw new Error('profile set content mismatch')
  process.stdout.write(`${JSON.stringify(stored)}\n`)
}

try {
  main()
} catch (error) {
  process.stderr.write(`[assurance:verify-profiles] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
