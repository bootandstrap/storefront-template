import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  duplicates,
  providedCapabilities,
  resolveProfile,
} from './lib/assurance-profile.mjs'

const profiles = JSON.parse(
  readFileSync(new URL('./assurance-profiles.json', import.meta.url), 'utf8'),
)
const policy = JSON.parse(
  readFileSync(new URL('./assurance-policy.json', import.meta.url), 'utf8'),
)

const CURRENT_RELEASE_GATES = [
  'rls-policy',
  'audit-policy',
  'schema-ownership',
  'storefront-lint',
  'storefront-unit',
  'risk-test-matrix',
  'risk-domain-evidence',
  'medusa-unit',
  'coverage-assurance',
  'storefront-typecheck',
  'storefront-build',
]

test('fast never claims full functional assurance', () => {
  const result = resolveProfile(profiles, 'fast', [])

  assert.equal(result.claimBoundary, 'changed_scope_feedback_only')
  assert.ok(result.deferred.includes('full-storefront-assurance'))
  assert.ok(result.deferred.includes('medusa-pos-postgres'))
  assert.notEqual(result.claimBoundary, 'functional_system_without_commercial_activation')
})

test('fast always selects policy and static security checks', () => {
  const result = resolveProfile(profiles, 'fast', [])

  assert.deepEqual(result.tasks.slice(0, 5), [
    'assurance-policy',
    'rls-policy',
    'audit-policy',
    'schema-ownership',
    'compose-security',
  ])
})

test('critical POS changes select POS behavioral evidence', () => {
  const result = resolveProfile(profiles, 'fast', [
    'apps/storefront/src/lib/pos/offline/offline-store.ts',
  ])

  assert.ok(result.tasks.includes('pos-unit'))
  assert.ok(result.tasks.includes('pos-conformance'))
  assert.ok(result.tasks.includes('pos-mutation-canary'))
  assert.ok(result.tasks.includes('storefront-lint'))
  assert.ok(result.tasks.includes('storefront-typecheck'))
})

test('critical POS sale actions select their scoped behavioral evidence', () => {
  const result = resolveProfile(profiles, 'fast', [
    'apps/storefront/src/app/[lang]/(panel)/panel/pos/actions.ts',
  ])

  assert.ok(result.tasks.includes('pos-unit'))
  assert.ok(result.tasks.includes('pos-conformance'))
  assert.ok(result.tasks.includes('pos-mutation-canary'))
})

test('fast selects type checks for each affected package', () => {
  const result = resolveProfile(profiles, 'fast', [
    'apps/medusa/src/modules/pos/service.ts',
    'packages/shared/src/index.ts',
    'packages/platform-contract/src/index.ts',
  ])

  assert.ok(result.tasks.includes('medusa-typecheck'))
  assert.ok(result.tasks.includes('shared-typecheck'))
  assert.ok(result.tasks.includes('platform-contract-typecheck'))
})

test('observability contract changes select sink and redaction evidence', () => {
  const result = resolveProfile(profiles, 'fast', [
    'apps/storefront/src/lib/observability/evidence-event.ts',
  ])

  assert.ok(result.tasks.includes('observability-unit'))
  assert.ok(result.tasks.includes('storefront-lint'))
  assert.ok(result.tasks.includes('storefront-typecheck'))
})

test('full profile provides every current release gate exactly once', () => {
  const result = resolveProfile(profiles, 'full', [])
  const capabilities = providedCapabilities(profiles, result.tasks)

  assert.deepEqual(duplicates(result.tasks), [])
  assert.deepEqual(duplicates(capabilities), [])
  assert.ok(CURRENT_RELEASE_GATES.every((gate) => capabilities.includes(gate)))
  assert.ok(result.tasks.includes('pos-conformance'))
  assert.ok(result.tasks.includes('pos-mutation-canary'))
  assert.ok(result.tasks.includes('medusa-pos-postgres'))
  assert.equal(result.claimBoundary, 'functional_system_without_commercial_activation')
})

test('profile claim boundaries match the assurance policy', () => {
  assert.deepEqual(policy.claimBoundaries, {
    fast: 'changed_scope_feedback_only',
    full: 'functional_system_without_commercial_activation',
  })
})

test('fast critical selectors stay identical to the assurance policy', () => {
  const policySelectors = policy.criticalDomains.flatMap((domain) => domain.sourceSelectors)

  assert.deepEqual(profiles.criticalSourceSelectors, policySelectors)
})

test('rejects unknown profiles and unknown task references', () => {
  assert.throws(() => resolveProfile(profiles, 'preview', []), /unknown profile/i)

  const invalid = structuredClone(profiles)
  invalid.profiles.fast.alwaysTasks.push('invented-task')
  assert.throws(() => resolveProfile(invalid, 'fast', []), /unknown task.*invented-task/i)
})

test('rejects absolute and traversing changed paths', () => {
  assert.throws(
    () => resolveProfile(profiles, 'fast', ['../BOOTANDSTRAP_WEB/package.json']),
    /unsafe changed path/i,
  )
  assert.throws(
    () => resolveProfile(profiles, 'fast', ['/tmp/tenant/package.json']),
    /unsafe changed path/i,
  )
})

test('rejects overlapping selector rules with contradictory claims', () => {
  const invalid = structuredClone(profiles)
  invalid.profiles.fast.selectorRules.push({
    id: 'contradict-pos-claim',
    selector: { prefix: 'apps/storefront/src/lib/pos/' },
    tasks: ['pos-unit'],
    claimBoundary: 'functional_system_without_commercial_activation',
  })

  assert.throws(
    () => resolveProfile(invalid, 'fast', [
      'apps/storefront/src/lib/pos/offline/offline-store.ts',
    ]),
    /contradictory claim boundaries/i,
  )
})

test('rejects a critical selector that supplies no behavioral task', () => {
  const invalid = structuredClone(profiles)
  const posRule = invalid.profiles.fast.selectorRules.find((rule) => rule.id === 'pos-critical')
  posRule.tasks = ['storefront-typecheck']

  assert.throws(
    () => resolveProfile(invalid, 'fast', [
      'apps/storefront/src/lib/pos/offline/offline-store.ts',
    ]),
    /critical change.*pos-critical.*behavioral task/i,
  )
})
