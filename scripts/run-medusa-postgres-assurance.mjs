#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PINNED_POSTGRES_IMAGE = 'postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const DEFAULT_ROOT_DIR = resolve(dirname(SCRIPT_PATH), '..')
const DEFAULT_DELAY = (milliseconds) => new Promise((resolveDelay) => {
  setTimeout(resolveDelay, milliseconds)
})

function execute(spawn, command, args, options = {}) {
  const result = spawn(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
    ...options,
  })
  if (result?.error?.code === 'ENOENT') {
    throw new Error(`${command} is unavailable; PostgreSQL assurance fails closed`)
  }
  if (result?.error) throw result.error
  return result
}

function requireSuccess(result, operation) {
  if (result.status === 0) return
  const detail = result.stderr?.trim() || result.stdout?.trim() || `exit code ${result.status}`
  throw new Error(`${operation}: ${detail}`)
}

function parseLoopbackPort(stdout) {
  const match = /^127\.0\.0\.1:(\d+)$/m.exec(stdout?.trim() ?? '')
  if (!match) throw new Error('Docker did not publish PostgreSQL on a loopback port')
  return match[1]
}

async function waitForPostgres(spawn, containerName, delay) {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const ready = execute(spawn, 'docker', [
      'exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres',
    ])
    if (ready.status === 0) return
    await delay(250)
  }
  throw new Error('PostgreSQL did not become ready within 10 seconds')
}

function assertContainerName(containerName) {
  if (!/^bns-pos-[a-z0-9-]+$/.test(containerName)) {
    throw new Error('unsafe PostgreSQL assurance container name')
  }
}

export async function runMedusaPostgresAssurance({
  rootDir = DEFAULT_ROOT_DIR,
  containerName = `bns-pos-assurance-${process.pid}`,
  spawn = spawnSync,
  delay = DEFAULT_DELAY,
} = {}) {
  assertContainerName(containerName)
  let started = false
  let failure

  try {
    requireSuccess(
      execute(spawn, 'docker', ['version', '--format', '{{.Server.Version}}']),
      'Docker daemon is unavailable',
    )
    requireSuccess(execute(spawn, 'docker', [
      'run', '-d', '--name', containerName,
      '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
      '-p', '127.0.0.1::5432',
      PINNED_POSTGRES_IMAGE,
    ]), 'PostgreSQL container could not start')
    started = true

    const portResult = execute(spawn, 'docker', ['port', containerName, '5432/tcp'])
    requireSuccess(portResult, 'PostgreSQL port lookup failed')
    const port = parseLoopbackPort(portResult.stdout)
    await waitForPostgres(spawn, containerName, delay)

    const integration = execute(spawn, 'pnpm', [
      '-C', 'apps/medusa', 'test:integration:modules',
    ], {
      cwd: rootDir,
      env: {
        ...process.env,
        DB_HOST: '127.0.0.1',
        DB_PORT: port,
        DB_USERNAME: 'postgres',
      },
    })
    requireSuccess(integration, 'Medusa POS PostgreSQL integration failed')
    if (integration.stdout) process.stdout.write(integration.stdout)
    if (integration.stderr) process.stderr.write(integration.stderr)
  } catch (error) {
    failure = error instanceof Error ? error : new Error(String(error))
  } finally {
    if (started) {
      const cleanup = execute(spawn, 'docker', ['rm', '-f', containerName])
      if (cleanup.status !== 0) {
        const cleanupFailure = new Error('PostgreSQL assurance container cleanup failed')
        failure = failure
          ? new Error(`${failure.message}; ${cleanupFailure.message}`)
          : cleanupFailure
      }
    }
  }

  if (failure) throw failure
  return {
    status: 'passed',
    image: PINNED_POSTGRES_IMAGE,
    integrationTests: 'passed',
    cleanup: 'removed',
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runMedusaPostgresAssurance()
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(`[medusa-postgres-assurance] ${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
