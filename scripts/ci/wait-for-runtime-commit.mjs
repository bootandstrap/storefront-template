#!/usr/bin/env node

import { setTimeout as delay } from 'node:timers/promises'

const healthUrl = process.env.BNS_RUNTIME_HEALTH_URL
const expectedCommit = process.env.BNS_RUNTIME_EXPECTED_COMMIT
const maxWaitSeconds = Number(process.env.BNS_RUNTIME_WAIT_SECONDS ?? '360')
const pollIntervalSeconds = Number(process.env.BNS_RUNTIME_POLL_SECONDS ?? '5')

function fail(message) {
  console.error(`[runtime-commit] FAIL-CLOSED: ${message}`)
  process.exit(1)
}

if (!healthUrl) fail('BNS_RUNTIME_HEALTH_URL is required')
if (!expectedCommit || !/^[0-9a-f]{40}$/i.test(expectedCommit)) {
  fail('BNS_RUNTIME_EXPECTED_COMMIT must be a full 40-character Git commit SHA')
}
if (!Number.isInteger(maxWaitSeconds) || maxWaitSeconds < 1 || maxWaitSeconds > 900) {
  fail('BNS_RUNTIME_WAIT_SECONDS must be an integer between 1 and 900')
}
if (!Number.isInteger(pollIntervalSeconds) || pollIntervalSeconds < 1 || pollIntervalSeconds > 30) {
  fail('BNS_RUNTIME_POLL_SECONDS must be an integer between 1 and 30')
}

let parsedHealthUrl
try {
  parsedHealthUrl = new URL(healthUrl)
} catch {
  fail('BNS_RUNTIME_HEALTH_URL must be a valid URL')
}

if (!['http:', 'https:'].includes(parsedHealthUrl.protocol)) {
  fail('BNS_RUNTIME_HEALTH_URL must use http or https')
}

const deadline = Date.now() + maxWaitSeconds * 1000
let attempt = 0
let lastObservedCommit = 'unavailable'
let lastStatus = 'unavailable'

console.log(
  `[runtime-commit] waiting up to ${maxWaitSeconds}s for ${parsedHealthUrl.origin} to serve ${expectedCommit.slice(0, 8)}`
)

while (Date.now() < deadline) {
  attempt += 1

  try {
    const response = await fetch(parsedHealthUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    lastStatus = String(response.status)

    if (response.ok) {
      const health = await response.json()
      const deployedCommit = health?.build?.commitSha
      lastObservedCommit =
        typeof deployedCommit === 'string' && deployedCommit.length > 0
          ? deployedCommit.slice(0, 8)
          : 'missing'

      if (deployedCommit === expectedCommit) {
        console.log(
          `[runtime-commit] exact commit ${expectedCommit.slice(0, 8)} confirmed after ${attempt} attempt(s)`
        )
        process.exit(0)
      }
    }
  } catch {
    lastStatus = 'request-error'
  }

  if (Date.now() < deadline) {
    await delay(pollIntervalSeconds * 1000)
  }
}

fail(
  `expected ${expectedCommit.slice(0, 8)}, last observed ${lastObservedCommit} (status ${lastStatus}) after ${attempt} attempt(s)`
)
