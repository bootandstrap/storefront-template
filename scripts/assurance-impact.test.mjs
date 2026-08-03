import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  discoverChangedFiles,
  selectImpact,
} from './lib/assurance-impact.mjs'

const impactConfig = JSON.parse(
  await fs.readFile(new URL('./assurance-impact.json', import.meta.url), 'utf8'),
)
const profiles = JSON.parse(
  await fs.readFile(new URL('./assurance-profiles.json', import.meta.url), 'utf8'),
)
const policy = JSON.parse(
  await fs.readFile(new URL('./assurance-policy.json', import.meta.url), 'utf8'),
)
const taskConfig = JSON.parse(
  await fs.readFile(new URL('./assurance-tasks.json', import.meta.url), 'utf8'),
)

function git(repoRoot, ...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

async function createRepository(context) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'assurance-impact-'))
  context.after(() => fs.rm(repoRoot, { recursive: true, force: true }))
  git(repoRoot, 'init', '--quiet')
  git(repoRoot, 'config', 'user.email', 'assurance@example.invalid')
  git(repoRoot, 'config', 'user.name', 'Assurance Test')
  await fs.writeFile(path.join(repoRoot, 'tracked.ts'), 'export const tracked = 1\n')
  await fs.writeFile(path.join(repoRoot, 'unstaged.ts'), 'export const unstaged = 1\n')
  git(repoRoot, 'add', '.')
  git(repoRoot, 'commit', '--quiet', '-m', 'base')
  return { repoRoot, base: git(repoRoot, 'rev-parse', 'HEAD') }
}

test('discovers committed, staged, unstaged, and untracked changes from an explicit base', async (context) => {
  const { repoRoot, base } = await createRepository(context)
  await fs.writeFile(path.join(repoRoot, 'committed.ts'), 'export const committed = true\n')
  git(repoRoot, 'add', 'committed.ts')
  git(repoRoot, 'commit', '--quiet', '-m', 'committed change')
  await fs.writeFile(path.join(repoRoot, 'staged.ts'), 'export const staged = true\n')
  git(repoRoot, 'add', 'staged.ts')
  await fs.writeFile(path.join(repoRoot, 'unstaged.ts'), 'export const unstaged = 2\n')
  await fs.writeFile(path.join(repoRoot, 'untracked.ts'), 'export const untracked = true\n')

  assert.deepEqual(await discoverChangedFiles(repoRoot, { base }), [
    'committed.ts',
    'staged.ts',
    'unstaged.ts',
    'untracked.ts',
  ])
})

test('uses the configured base ref and rejects option-like base values', async (context) => {
  const { repoRoot, base } = await createRepository(context)
  await fs.writeFile(path.join(repoRoot, 'changed.ts'), 'export const changed = true\n')
  git(repoRoot, 'add', 'changed.ts')
  git(repoRoot, 'commit', '--quiet', '-m', 'changed')

  assert.deepEqual(await discoverChangedFiles(repoRoot, { defaultBaseRef: base }), ['changed.ts'])
  await assert.rejects(
    discoverChangedFiles(repoRoot, { base: '--upload-pack=unsafe' }),
    /unsafe base/i,
  )
})

test('maps critical POS, security, and backup changes to scoped behavioral and static evidence', () => {
  const result = selectImpact(impactConfig, [
    'apps/storefront/src/lib/pos/offline/offline-store.ts',
    'apps/storefront/src/lib/security/rate-limit.ts',
    'apps/storefront/src/lib/backup/backup-restore.ts',
  ], { profiles, policy })

  for (const taskId of [
    'pos-unit',
    'pos-conformance',
    'pos-mutation-canary',
    'security-unit',
    'backup-unit',
    'storefront-lint',
    'storefront-typecheck',
  ]) {
    assert.ok(result.tasks.includes(taskId), taskId)
  }
  assert.ok(result.reasons.every((reason) => reason.paths.length > 0))

  const backupTask = taskConfig.tasks.find((task) => task.id === 'backup-unit')
  assert.ok(backupTask.command.includes('src/lib/backup'))
  assert.ok(backupTask.command.includes('src/lib/__tests__/provisioning-schema-completeness.test.ts'))
  assert.ok(backupTask.command.includes('src/lib/__tests__/delete-tenant-rpc-contract.test.ts'))
})

test('maps the POS sale action to the task that executes its behavioral test', () => {
  const changedPath = 'apps/storefront/src/app/[lang]/(panel)/panel/pos/actions.ts'
  const result = selectImpact(impactConfig, [changedPath], { profiles, policy })

  for (const taskId of ['pos-unit', 'pos-conformance', 'pos-mutation-canary']) {
    assert.ok(result.tasks.includes(taskId), taskId)
  }
  const posTask = taskConfig.tasks.find((task) => task.id === 'pos-unit')
  assert.ok(posTask.command.includes('src/app/[lang]/(panel)/panel/pos/__tests__/actions.test.ts'))
})

test('maps Compose, manifests, and assurance definitions to their required evidence', () => {
  const compose = selectImpact(impactConfig, ['scripts/templates/docker-compose.client.yml'], {
    profiles,
    policy,
  })
  assert.ok(compose.tasks.includes('compose-security'))

  const manifest = selectImpact(impactConfig, ['pnpm-lock.yaml'], { profiles, policy })
  for (const taskId of [
    'audit-policy',
    'storefront-lint',
    'storefront-typecheck',
    'medusa-typecheck',
    'shared-typecheck',
    'platform-contract-typecheck',
    'medusa-unit',
    'storefront-build',
  ]) {
    assert.ok(manifest.tasks.includes(taskId), taskId)
  }

  const assurance = selectImpact(impactConfig, ['scripts/run-assurance.mjs'], { profiles, policy })
  assert.ok(assurance.tasks.includes('assurance-contracts'))
  assert.equal(assurance.fullProfileDryRun, true)
})

test('maps every assurance wrapper and contract test to assurance contracts and full planning', () => {
  for (const changedPath of [
    'scripts/run-storefront-assurance.mjs',
    'scripts/run-compose-assurance.mjs',
    'scripts/run-risk-domain-evidence.mjs',
    'scripts/run-medusa-postgres-assurance.mjs',
    'scripts/storefront-assurance.test.mjs',
    'scripts/compose-assurance.test.mjs',
    'scripts/coverage-assurance.test.mjs',
    'scripts/medusa-postgres-assurance.test.mjs',
  ]) {
    const result = selectImpact(impactConfig, [changedPath], { profiles, policy })
    assert.ok(result.tasks.includes('assurance-contracts'), changedPath)
    assert.equal(result.fullProfileDryRun, true, changedPath)
  }
})

test('maps observability boundaries to normalized evidence contract tests', () => {
  const result = selectImpact(impactConfig, [
    'apps/storefront/src/lib/observability/evidence-event.ts',
    'apps/storefront/src/instrumentation.ts',
    'apps/medusa/instrumentation.ts',
  ], { profiles, policy })

  assert.ok(result.tasks.includes('observability-unit'))
  assert.ok(result.tasks.includes('storefront-typecheck'))
  assert.ok(result.tasks.includes('medusa-typecheck'))
})

test('fails closed when a policy-critical source has no behavioral impact mapping', () => {
  const modifiedPolicy = structuredClone(policy)
  modifiedPolicy.classificationRules.unshift({
    selector: { prefix: 'apps/storefront/src/lib/new-critical/' },
    domain: 'new-critical-domain',
    severity: 'critical',
    owner: 'test-owner',
  })

  assert.throws(
    () => selectImpact(impactConfig, [
      'apps/storefront/src/lib/new-critical/decision.ts',
    ], { profiles, policy: modifiedPolicy }),
    /critical.*no behavioral impact mapping/i,
  )
})

test('fast dry-run prints selected tasks, changed files, reasons, and full-profile planning', async () => {
  const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
  const probePath = path.join(repoRoot, 'scripts', 'lib', 'assurance-impact-probe.mjs')
  await fs.writeFile(probePath, 'export const probe = true\n')
  let result
  try {
    result = spawnSync(process.execPath, [
      'scripts/run-assurance.mjs',
      '--profile',
      'fast',
      '--dry-run',
      '--base',
      'HEAD',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: false,
    })
  } finally {
    await fs.rm(probePath, { force: true })
  }

  assert.equal(result.status, 0, result.stderr)
  const plan = JSON.parse(result.stdout.trim())
  assert.ok(plan.changedFiles.includes('scripts/lib/assurance-impact-probe.mjs'))
  assert.ok(plan.tasks.includes('assurance-contracts'))
  assert.ok(plan.impact.reasons.some((reason) => reason.ruleId === 'assurance-definitions'))
  assert.equal(plan.impact.fullProfileDryRun.status, 'planned')
  assert.equal(plan.impact.fullProfileDryRun.profile, 'full')
})

test('fast evidence selected by manifest impact is not simultaneously reported deferred', async () => {
  const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
  const probeDirectory = path.join(repoRoot, 'apps', 'assurance-impact-probe')
  const probePath = path.join(probeDirectory, 'package.json')
  await fs.mkdir(probeDirectory)
  await fs.writeFile(probePath, '{"private":true}\n')
  let result
  try {
    result = spawnSync(process.execPath, [
      'scripts/run-assurance.mjs',
      '--profile',
      'fast',
      '--dry-run',
      '--base',
      'HEAD',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: false,
    })
  } finally {
    await fs.rm(probeDirectory, { recursive: true, force: true })
  }

  assert.equal(result.status, 0, result.stderr)
  const plan = JSON.parse(result.stdout.trim())
  assert.ok(plan.tasks.includes('medusa-unit'))
  assert.ok(plan.tasks.includes('storefront-build'))
  const deferred = plan.deferred.map((entry) => entry.taskId)
  assert.ok(!deferred.includes('medusa-unit'))
  assert.ok(!deferred.includes('storefront-build'))
})
