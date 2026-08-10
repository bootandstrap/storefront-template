import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  PINNED_POSTGRES_IMAGE,
  runMedusaPostgresAssurance,
} from './run-medusa-postgres-assurance.mjs'

const MEDUSA_PACKAGE = JSON.parse(readFileSync(new URL('../apps/medusa/package.json', import.meta.url), 'utf8'))

test('Medusa test commands exit naturally instead of masking open handles', () => {
  for (const script of ['test:unit', 'test:integration:http', 'test:integration:modules']) {
    assert.ok(MEDUSA_PACKAGE.scripts[script], `${script} must exist`)
    assert.doesNotMatch(MEDUSA_PACKAGE.scripts[script], /--forceExit\b/)
  }
})

function successfulSpawn(calls) {
  return (command, args, options) => {
    calls.push({ command, args, options })
    if (command === 'docker' && args[0] === 'port') {
      return { status: 0, stdout: '127.0.0.1:55432\n', stderr: '' }
    }
    if (command === 'docker' && args.includes('pg_isready')) {
      return { status: 0, stdout: '/var/run/postgresql:5432 - accepting connections\n', stderr: '' }
    }
    return { status: 0, stdout: '', stderr: '' }
  }
}

test('runs Medusa integration against pinned loopback PostgreSQL and removes its exact container', async () => {
  const calls = []
  const result = await runMedusaPostgresAssurance({
    rootDir: '/repo',
    containerName: 'bns-pos-test-123',
    spawn: successfulSpawn(calls),
    delay: async () => {},
  })

  assert.deepEqual(result, {
    status: 'passed',
    image: PINNED_POSTGRES_IMAGE,
    integrationTests: 'passed',
    cleanup: 'removed',
  })
  assert.ok(calls.some(({ command, args }) => command === 'docker' && args.join(' ').includes(
    `run -d --name bns-pos-test-123 -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1::5432 ${PINNED_POSTGRES_IMAGE}`,
  )))
  const integration = calls.find(({ command }) => command === 'pnpm')
  assert.deepEqual(integration.args, ['-C', 'apps/medusa', 'test:integration:modules'])
  assert.equal(integration.options.env.DB_HOST, '127.0.0.1')
  assert.equal(integration.options.env.DB_PORT, '55432')
  assert.equal(integration.options.env.DB_USERNAME, 'postgres')
  assert.ok(calls.some(({ command, args }) => command === 'docker'
    && args.join(' ') === 'rm -f bns-pos-test-123'))
})

test('fails closed on integration failure and still removes the exact container', async () => {
  const calls = []
  const spawn = successfulSpawn(calls)

  await assert.rejects(
    runMedusaPostgresAssurance({
      rootDir: '/repo',
      containerName: 'bns-pos-test-failure',
      spawn(command, args, options) {
        if (command === 'pnpm') {
          calls.push({ command, args, options })
          return { status: 1, stdout: '', stderr: 'integration failed' }
        }
        return spawn(command, args, options)
      },
      delay: async () => {},
    }),
    /integration failed/i,
  )
  assert.ok(calls.some(({ command, args }) => command === 'docker'
    && args.join(' ') === 'rm -f bns-pos-test-failure'))
})
