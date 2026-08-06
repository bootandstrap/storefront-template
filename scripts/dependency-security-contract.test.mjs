import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import { parsePnpmLockPackages } from './audit-bulk-advisory.mjs'

test('pins every js-yaml lock authority to the patched GHSA-5p4m-2wfm-xmqj releases', () => {
  const root = resolve(import.meta.dirname, '..')
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
