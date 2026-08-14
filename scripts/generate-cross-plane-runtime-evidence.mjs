import { createHash } from 'node:crypto'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  correlationHeaders,
  createInMemoryEvidenceSink,
} from '../packages/shared/dist/observability/evidence-event.js'

const RECEIPT_SCHEMA = 'bootandstrap.cross-plane-runtime-observability/v1'

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function deterministicSequence(values) {
  let index = 0
  return () => {
    const value = values[index]
    if (value === undefined) throw new Error('deterministic evidence sequence exhausted')
    index += 1
    return value
  }
}

function timestampSequence(startedAt) {
  const start = Date.parse(startedAt)
  if (!Number.isFinite(start)) throw new Error('startedAt must be an ISO timestamp')
  return deterministicSequence([1, 2, 3].map((offset) => new Date(start + offset).toISOString()))
}

function eventIdSequence(context) {
  return deterministicSequence([
    'storefront.synthetic.forwarded',
    'medusa.synthetic.failure',
    'storefront.synthetic.failure',
  ].map((eventName) => `event-${sha256(`${context.trace_id}:${context.operation_id}:${eventName}`).slice(0, 32)}`))
}

function assertRuntimeChain(events, context, revision) {
  const expected = [
    ['storefront', 'storefront.synthetic.forwarded', 'forwarded', 'none'],
    ['medusa', 'medusa.synthetic.failure', 'failure', 'synthetic_medusa_failure'],
    ['storefront', 'storefront.synthetic.failure', 'failure', 'synthetic_medusa_failure'],
  ]
  if (events.length !== expected.length) throw new Error(`expected ${expected.length} runtime events, received ${events.length}`)
  for (const [index, event] of events.entries()) {
    const [service, eventName, outcome, errorCode] = expected[index]
    if (event.service !== service || event.event_name !== eventName
      || event.outcome !== outcome || event.error_code !== errorCode) {
      throw new Error(`runtime event ${index} does not match the synthetic failure contract`)
    }
    for (const field of ['trace_id', 'request_id', 'tenant_id', 'principal_id', 'operation_id']) {
      if (event[field] !== context[field]) throw new Error(`runtime event ${index} ${field} mismatch`)
    }
    if (event.revision !== revision) throw new Error(`runtime event ${index} revision mismatch`)
  }
}

function writeJsonAtomic(outputPath, receipt) {
  const absolute = resolve(outputPath)
  mkdirSync(dirname(absolute), { recursive: true })
  const temporary = `${absolute}.tmp-${process.pid}`
  writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  renameSync(temporary, absolute)
}

export async function generateRuntimeEvidence({
  context,
  revision,
  outputPath,
  authorityTenantId = context?.tenant_id,
  authorityPrincipalId = context?.principal_id,
  startedAt = new Date().toISOString(),
}) {
  if (!/^[0-9a-f]{40}$/.test(revision ?? '')) throw new Error('revision must be an exact 40-character commit SHA')
  if (!outputPath) throw new Error('outputPath is required')

  const [{ runStorefrontSyntheticFailure }, { runMedusaSyntheticFailure }] = await Promise.all([
    import('../apps/storefront/src/lib/observability/synthetic-failure.ts'),
    import('../apps/medusa/src/lib/observability/synthetic-failure.ts'),
  ])
  const sink = createInMemoryEvidenceSink()
  const now = timestampSequence(startedAt)
  const eventId = eventIdSequence(context)
  let controlledFailureObserved = false

  try {
    await runStorefrontSyntheticFailure({
      headers: correlationHeaders(context),
      tenant_id: authorityTenantId,
      principal_id: authorityPrincipalId,
      revision,
      sink,
      now,
      eventId,
      callMedusa: (headers) => runMedusaSyntheticFailure({
        headers,
        tenant_id: authorityTenantId,
        principal_id: authorityPrincipalId,
        revision,
        sink,
        now,
        eventId,
      }),
    })
  } catch (error) {
    controlledFailureObserved = error?.error_code === 'synthetic_medusa_failure'
    if (!controlledFailureObserved) throw error
  }
  if (!controlledFailureObserved) throw new Error('synthetic Medusa failure was not observed')

  const observedEvents = sink.query({ operation_id: context.operation_id })
  assertRuntimeChain(observedEvents, context, revision)
  const events = JSON.parse(JSON.stringify(observedEvents))
  const eventSha256 = Object.fromEntries(events.map((event) => [event.event_id, sha256(JSON.stringify(event))]))
  if (Object.keys(eventSha256).length !== events.length) throw new Error('event_id collision in runtime evidence')

  const receipt = {
    schema: RECEIPT_SCHEMA,
    status: 'passed',
    claimBoundary: 'local_cross_plane_observability_without_deployment',
    generatedAt: events.at(-1).occurred_at,
    producerRevisions: { storefront: revision, medusa: revision },
    redactionPolicy: events[0].redaction_policy,
    query: {
      trace_id: context.trace_id,
      operation_id: context.operation_id,
      event_ids: events.map((event) => event.event_id),
    },
    eventSha256,
    events,
    restrictions: {
      externalNetwork: 'not_used',
      providerMutation: 'prohibited_not_executed',
      deployment: 'not_claimed',
    },
  }
  writeJsonAtomic(outputPath, receipt)
  return receipt
}

function parseArgs(argv) {
  const values = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || value === undefined) throw new Error(`invalid CLI argument ${key ?? ''}`)
    values[key.slice(2)] = value
  }
  return values
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await generateRuntimeEvidence({
    context: {
      trace_id: args['trace-id'],
      request_id: args['request-id'],
      tenant_id: args['tenant-id'],
      principal_id: args['principal-id'],
      operation_id: args['operation-id'],
    },
    authorityTenantId: args['authority-tenant-id'] ?? args['tenant-id'],
    authorityPrincipalId: args['authority-principal-id'] ?? args['principal-id'],
    revision: args.revision,
    outputPath: args.output,
    startedAt: args['started-at'],
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[cross-plane-runtime-evidence] failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
