import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('pins the reproducible Node 20.9 and pnpm 9.15 bootstrap contract', () => {
  const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

  assert.equal(readFileSync(resolve(root, '.node-version'), 'utf8').trim(), '20.9.0')
  assert.equal(rootPackage.engines?.node, '20.9.0')
  assert.equal(rootPackage.packageManager, 'pnpm@9.15.4')
  assert.equal(rootPackage.devDependencies?.npm, '10.1.0')
  assert.equal(rootPackage.devDependencies?.tsx, '4.21.0')
})

test('keeps the storefront test toolchain executable on the bootstrap runtime', () => {
  const storefront = JSON.parse(readFileSync(resolve(root, 'apps/storefront/package.json'), 'utf8'))
  const shared = JSON.parse(readFileSync(resolve(root, 'packages/shared/package.json'), 'utf8'))
  const lock = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8')
  const assuranceTasks = readFileSync(resolve(root, 'scripts/assurance-tasks.json'), 'utf8')
  const contractTask = JSON.parse(assuranceTasks).tasks.find(task => task.id === 'assurance-contracts')

  assert.equal(storefront.devDependencies?.vitest, '3.2.6')
  assert.equal(storefront.devDependencies?.['@vitest/coverage-v8'], '3.2.6')
  assert.equal(storefront.devDependencies?.vite, '6.4.3')
  assert.equal(shared.type, 'module')
  assert.doesNotMatch(lock, /(?:vitest|std-env)@4\./)
  assert.doesNotMatch(assuranceTasks, /--experimental-strip-types/)
  assert.deepEqual(contractTask.command.slice(0, 3), ['pnpm', 'exec', 'tsx'])
  assert.ok(contractTask.command.includes('--test'))
  for (const relativePath of [
    'scripts/audit-bulk-advisory.test.mjs',
    'scripts/dependency-security-contract.test.mjs',
  ]) {
    assert.doesNotMatch(readFileSync(resolve(root, relativePath), 'utf8'), /import\.meta\.dirname/)
  }
})
