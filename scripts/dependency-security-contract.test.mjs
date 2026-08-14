import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { parsePnpmLockPackages } from './audit-bulk-advisory.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('pins every js-yaml lock authority to the patched GHSA-5p4m-2wfm-xmqj releases', () => {
  const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const rootLock = parsePnpmLockPackages(readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8'))
  const medusaPackage = JSON.parse(readFileSync(resolve(root, 'apps/medusa/package.json'), 'utf8'))
  const medusaLock = JSON.parse(readFileSync(resolve(root, 'apps/medusa/package-lock.json'), 'utf8'))

  assert.equal(rootPackage.pnpm?.overrides?.['js-yaml@<4.0.0'], '3.15.1')
  assert.equal(rootPackage.pnpm?.overrides?.['js-yaml@>=4.0.0 <4.3.1'], '4.3.1')
  assert.deepEqual(rootLock['js-yaml'], ['3.15.1', '4.3.1'])
  assert.equal(medusaPackage.overrides?.['js-yaml'], '3.15.1')
  assert.equal(medusaLock.packages?.['node_modules/js-yaml']?.version, '3.15.1')
})

test('pins every nanoid lock authority to the patched GHSA-2v37-7h3g-55p8 release', () => {
  const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const rootLock = parsePnpmLockPackages(readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8'))
  const medusaPackage = JSON.parse(readFileSync(resolve(root, 'apps/medusa/package.json'), 'utf8'))
  const medusaLock = JSON.parse(readFileSync(resolve(root, 'apps/medusa/package-lock.json'), 'utf8'))

  assert.equal(rootPackage.pnpm?.overrides?.['nanoid@<3.3.18'], '3.3.18')
  assert.deepEqual(rootLock.nanoid, ['3.3.18'])
  assert.equal(medusaPackage.overrides?.nanoid, '3.3.18')
  assert.equal(medusaLock.packages?.['node_modules/nanoid']?.version, '3.3.18')
})
