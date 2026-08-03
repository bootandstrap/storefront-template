import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { hashInputs } from './lib/assurance-identity.mjs'

test('hashes tracked and non-ignored inputs but excludes generated Git-ignored files', async (context) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'assurance-identity-'))
  context.after(() => fs.rm(repoRoot, { recursive: true, force: true }))

  execFileSync('git', ['init', '--quiet'], { cwd: repoRoot })
  execFileSync('git', ['config', 'user.email', 'assurance@example.invalid'], { cwd: repoRoot })
  execFileSync('git', ['config', 'user.name', 'Assurance Test'], { cwd: repoRoot })
  await fs.mkdir(path.join(repoRoot, 'source'))
  await fs.writeFile(path.join(repoRoot, '.gitignore'), 'source/generated.bin\n')
  await fs.writeFile(path.join(repoRoot, 'source', 'main.ts'), 'export const value = 1\n')
  execFileSync('git', ['add', '.'], { cwd: repoRoot })
  execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], { cwd: repoRoot })

  const baseline = await hashInputs(repoRoot, ['source'])

  await fs.writeFile(path.join(repoRoot, 'source', 'generated.bin'), 'first build\n')
  assert.equal(await hashInputs(repoRoot, ['source']), baseline)
  await fs.writeFile(path.join(repoRoot, 'source', 'generated.bin'), 'second build\n')
  assert.equal(await hashInputs(repoRoot, ['source']), baseline)

  await fs.writeFile(path.join(repoRoot, 'source', 'new.ts'), 'export const added = true\n')
  assert.notEqual(await hashInputs(repoRoot, ['source']), baseline)
  await fs.rm(path.join(repoRoot, 'source', 'new.ts'))

  await fs.writeFile(path.join(repoRoot, 'source', 'main.ts'), 'export const value = 2\n')
  assert.notEqual(await hashInputs(repoRoot, ['source']), baseline)
})
