import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createLocalRuntimeFixtureServer,
  parseLocalRuntimeFixtureArgs,
} from './local-runtime-fixture-server.mjs'

const running = []
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

afterEach(async () => {
  while (running.length > 0) {
    await running.pop().close()
  }
})

async function fixture() {
  const instance = await createLocalRuntimeFixtureServer({ port: 0 })
  running.push(instance)
  return instance
}

async function json(origin, path, init) {
  const response = await fetch(`${origin}${path}`, init)
  return { response, body: await response.json() }
}

describe('local runtime assurance fixture', () => {
  test('binds only loopback and rejects ambiguous CLI input', () => {
    assert.deepEqual(parseLocalRuntimeFixtureArgs([]), { host: '127.0.0.1', port: 3101 })
    assert.deepEqual(parseLocalRuntimeFixtureArgs(['--port', '4101']), {
      host: '127.0.0.1',
      port: 4101,
    })
    assert.throws(() => parseLocalRuntimeFixtureArgs(['--host', '0.0.0.0']), /loopback/)
    assert.throws(() => parseLocalRuntimeFixtureArgs(['--port', '0']), /port/)
    assert.throws(() => parseLocalRuntimeFixtureArgs(['--unknown']), /unknown argument/)
  })

  test('serves deterministic non-secret governance outside maintenance mode', async () => {
    const { origin } = await fixture()
    const { response, body } = await json(origin, '/rest/v1/rpc/get_tenant_governance', {
      method: 'POST',
      headers: { authorization: 'Bearer ignored-test-value' },
    })

    assert.equal(response.status, 200)
    assert.equal(body.tenant_status, 'active')
    assert.equal(body.config.tenant_id, '00000000-0000-4000-8000-000000000001')
    assert.equal(body.feature_flags.enable_maintenance_mode, false)
    assert.equal(body.feature_flags.enable_ecommerce, true)
    assert.equal(body.feature_flags.enable_guest_checkout, true)
    assert.equal(body.feature_flags.require_auth_to_order, false)
    assert.equal(body.feature_flags.enable_promotions, true)
    assert.doesNotMatch(JSON.stringify(body), /Bearer|ignored-test-value|secret|password/i)
  })

  test('serves one stable region, category and priced product', async () => {
    const { origin } = await fixture()
    const regions = await json(origin, '/store/regions')
    const categories = await json(origin, '/store/product-categories?fields=id,name,handle')
    const products = await json(origin, '/store/products?region_id=reg_assurance')

    assert.equal(regions.body.regions[0].id, 'reg_assurance')
    assert.equal(categories.body.product_categories[0].handle, 'assurance')
    assert.equal(products.body.count, 1)
    assert.equal(products.body.products[0].handle, 'assurance-product')
    assert.equal(products.body.products[0].variants[0].calculated_price.calculated_amount, 1000)
  })

  test('supports an isolated cart lifecycle and reports zero residue after cleanup', async () => {
    const { origin } = await fixture()
    const created = await json(origin, '/store/carts', {
      method: 'POST',
      body: JSON.stringify({ region_id: 'reg_assurance' }),
    })
    const cartId = created.body.cart.id

    const added = await json(origin, `/store/carts/${cartId}/line-items`, {
      method: 'POST',
      body: JSON.stringify({ variant_id: 'variant_assurance', quantity: 1 }),
    })
    assert.equal(added.body.cart.items.length, 1)
    assert.equal(added.body.cart.items[0].quantity, 1)

    const addressed = await json(origin, `/store/carts/${cartId}`, {
      method: 'POST',
      body: JSON.stringify({
        shipping_address: {
          first_name: 'Runtime',
          last_name: 'Evidence',
          address_1: 'Runtime Evidence Street 1',
          city: 'Test City',
          postal_code: '28001',
          country_code: 'ch',
        },
        billing_address: {
          first_name: 'Runtime',
          last_name: 'Evidence',
          address_1: 'Runtime Evidence Street 1',
          city: 'Test City',
          postal_code: '28001',
          country_code: 'ch',
        },
      }),
    })
    assert.equal(addressed.response.status, 200)
    assert.equal(addressed.body.cart.shipping_address.country_code, 'ch')

    const options = await json(origin, `/store/shipping-options?cart_id=${cartId}`)
    assert.deepEqual(options.body.shipping_options, [{
      id: 'so_assurance_standard',
      name: 'Assurance Standard',
      amount: 0,
      currency_code: 'chf',
    }])

    const shipped = await json(origin, `/store/carts/${cartId}/shipping-methods`, {
      method: 'POST',
      body: JSON.stringify({ option_id: 'so_assurance_standard' }),
    })
    assert.equal(shipped.response.status, 200)
    assert.equal(shipped.body.cart.shipping_methods[0].id, 'so_assurance_standard')

    const lineId = added.body.cart.items[0].id
    const updated = await json(origin, `/store/carts/${cartId}/line-items/${lineId}`, {
      method: 'POST',
      body: JSON.stringify({ quantity: 2 }),
    })
    assert.equal(updated.body.cart.items[0].quantity, 2)
    assert.equal(updated.body.cart.total, 2000)

    const removed = await json(origin, `/store/carts/${cartId}/line-items/${lineId}`, {
      method: 'DELETE',
    })
    assert.equal(removed.body.parent.items.length, 0)

    const health = await json(origin, '/__assurance/health')
    assert.deepEqual(health.body, {
      schema: 'bootandstrap.local-runtime-fixture/v1',
      status: 'ready',
      activeCarts: 0,
      lineItems: 0,
    })
  })

  test('returns fail-closed errors for malformed or unknown operations', async () => {
    const { origin } = await fixture()
    const malformed = await json(origin, '/store/carts', { method: 'POST', body: '{' })
    const invalidShipping = await json(origin, '/store/carts/cart_missing/shipping-methods', {
      method: 'POST',
      body: JSON.stringify({ option_id: 'not-governed' }),
    })
    const unknown = await json(origin, '/not-governed')

    assert.equal(malformed.response.status, 400)
    assert.equal(malformed.body.error, 'malformed_json')
    assert.equal(invalidShipping.response.status, 404)
    assert.equal(invalidShipping.body.error, 'cart_not_found')
    assert.equal(unknown.response.status, 404)
    assert.equal(unknown.body.error, 'fixture_route_not_found')
  })

  test('wires the fixture only into local risk evidence with exact cleanup coverage', () => {
    const runner = readFileSync(join(root, 'scripts', 'run-risk-domain-evidence.mjs'), 'utf8')
    const playwright = readFileSync(join(root, 'apps', 'storefront', 'playwright.config.ts'), 'utf8')
    const visualEvidence = readFileSync(
      join(root, 'apps', 'storefront', 'e2e', 'runtime-visual-evidence.spec.ts'),
      'utf8',
    )

    assert.match(runner, /BNS_RUNTIME_LOCAL_FIXTURE_ORIGIN/)
    assert.match(runner, /http:\/\/127\.0\.0\.1:3101/)
    assert.match(playwright, /local-runtime-fixture-server\.mjs/)
    assert.match(playwright, /reuseExistingServer: false/)
    assert.match(visualEvidence, /local runtime fixture reports zero residue/)
    assert.match(visualEvidence, /activeCarts/)
    assert.match(visualEvidence, /lineItems/)
  })
})
