import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { generateRuntimeEvidence } from './generate-cross-plane-runtime-evidence.mjs'

const revision = 'a'.repeat(40)
const context = {
  trace_id: '0123456789abcdef0123456789abcdef',
  request_id: 'request-cross-plane-proof',
  tenant_id: 'tenant-cross-plane-proof',
  principal_id: 'principal-cross-plane-proof',
  operation_id: 'operation-cross-plane-proof',
}

test('writes a queryable, ordered and redacted storefront to Medusa receipt', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bns-observability-proof-'))
  const outputPath = join(directory, 'runtime.json')

  try {
    const receipt = await generateRuntimeEvidence({
      context,
      revision,
      outputPath,
      startedAt: '2026-08-06T20:00:00.000Z',
    })
    assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), receipt)
    assert.equal(receipt.schema, 'bootandstrap.cross-plane-runtime-observability/v1')
    assert.equal(receipt.status, 'passed')
    assert.deepEqual(receipt.producerRevisions, { storefront: revision, medusa: revision })
    assert.deepEqual(receipt.events.map(({ service, event_name }) => ({ service, event_name })), [
      { service: 'storefront', event_name: 'storefront.synthetic.forwarded' },
      { service: 'medusa', event_name: 'medusa.synthetic.failure' },
      { service: 'storefront', event_name: 'storefront.synthetic.failure' },
    ])
    assert.deepEqual(receipt.query, {
      trace_id: context.trace_id,
      tenant_id: context.tenant_id,
      principal_id: context.principal_id,
      operation_id: context.operation_id,
      event_ids: receipt.events.map((event) => event.event_id),
    })
    assert.equal(Object.keys(receipt.eventSha256).length, 3)
    assert.match(Object.values(receipt.eventSha256)[0], /^[0-9a-f]{64}$/)
    assert.doesNotMatch(JSON.stringify(receipt), /authorization|cookie|Bearer|sk_live|raw provider body/i)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('fails closed on tenant mismatch before writing a receipt', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bns-observability-proof-'))
  const outputPath = join(directory, 'runtime.json')

  try {
    await assert.rejects(generateRuntimeEvidence({
      context: { ...context, tenant_id: 'tenant-other' },
      authorityTenantId: context.tenant_id,
      revision,
      outputPath,
      startedAt: '2026-08-06T20:00:00.000Z',
    }), /tenant_mismatch/)
    assert.throws(() => readFileSync(outputPath), /ENOENT/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('fails closed on principal mismatch before writing a receipt', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bns-observability-proof-'))
  const outputPath = join(directory, 'runtime.json')

  try {
    await assert.rejects(generateRuntimeEvidence({
      context: { ...context, principal_id: 'principal-other' },
      authorityPrincipalId: context.principal_id,
      revision,
      outputPath,
      startedAt: '2026-08-06T20:00:00.000Z',
    }), /principal_mismatch/)
    assert.throws(() => readFileSync(outputPath), /ENOENT/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
