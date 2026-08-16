#!/usr/bin/env node

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const ROOT_DIR = resolve(dirname(SCRIPT_PATH), '..')
const TENANT_ID = '00000000-0000-4000-8000-000000000001'
const UNIT_PRICE = 1000

const contract = JSON.parse(readFileSync(
  join(ROOT_DIR, 'apps', 'storefront', 'src', 'lib', 'governance-contract.json'),
  'utf8',
))

const featureFlags = Object.fromEntries(
  contract.flags.keys.map((key) => [
    key,
    key !== 'enable_maintenance_mode' && key !== 'require_auth_to_order',
  ]),
)
const planLimits = Object.fromEntries(contract.limits.keys.map((key) => [key, 100]))
Object.assign(planLimits, {
  plan_name: 'local-assurance',
  plan_tier: 'enterprise',
  plan_expires_at: null,
  max_languages: 5,
  max_currencies: 5,
})

const config = {
  id: 'cfg_assurance',
  tenant_id: TENANT_ID,
  business_name: 'Assurance Store',
  whatsapp_number: '',
  default_country_prefix: '41',
  primary_color: '#2D5016',
  secondary_color: '#8BC34A',
  accent_color: '#FF9800',
  surface_color: '#FAFDF6',
  text_color: '#1A2E0A',
  color_preset: 'nature',
  theme_mode: 'light',
  language: 'es',
  timezone: 'UTC',
  active_languages: ['es'],
  active_currencies: ['chf'],
  default_currency: 'chf',
  announcement_bar_enabled: false,
  onboarding_completed: true,
}

const category = {
  id: 'pcat_assurance',
  name: 'Assurance',
  handle: 'assurance',
  description: null,
  parent_category: null,
  category_children: [],
}
const variant = {
  id: 'variant_assurance',
  title: 'Default',
  sku: 'ASSURANCE-001',
  inventory_quantity: 10,
  calculated_price: {
    calculated_amount: UNIT_PRICE,
    original_amount: UNIT_PRICE,
    currency_code: 'chf',
  },
  prices: [{ amount: UNIT_PRICE, currency_code: 'chf' }],
  options: [],
}
const product = {
  id: 'prod_assurance',
  title: 'Assurance Product',
  handle: 'assurance-product',
  description: 'Deterministic local assurance fixture',
  subtitle: null,
  thumbnail: null,
  images: [],
  variants: [variant],
  categories: [category],
  collection: null,
  metadata: {},
  status: 'published',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function assertLoopback(host) {
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error('local runtime fixture host must be loopback')
  }
}

function parsePort(value, { allowZero = false } = {}) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < (allowZero ? 0 : 1) || port > 65_535) {
    throw new Error('local runtime fixture port must be a valid positive integer')
  }
  return port
}

export function parseLocalRuntimeFixtureArgs(argv) {
  const parsed = { host: '127.0.0.1', port: 3101 }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (argument === '--host') {
      if (!value) throw new Error('--host requires a value')
      assertLoopback(value)
      parsed.host = value
      index += 1
    } else if (argument === '--port') {
      if (!value) throw new Error('--port requires a value')
      parsed.port = parsePort(value)
      index += 1
    } else {
      throw new Error(`unknown argument: ${argument}`)
    }
  }
  return parsed
}

function emptyCart(id) {
  return {
    id,
    items: [],
    total: 0,
    subtotal: 0,
    tax_total: 0,
    shipping_total: 0,
    discount_total: 0,
    currency_code: 'chf',
    region: { currency_code: 'chf' },
  }
}

function recalculate(cart) {
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0)
  cart.total = cart.subtotal
  return cart
}

function validAddress(address) {
  return address
    && typeof address === 'object'
    && ['first_name', 'last_name', 'address_1', 'city', 'postal_code', 'country_code']
      .every((key) => typeof address[key] === 'string' && address[key].trim().length > 0)
}

function send(response, status, body) {
  response.statusCode = status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.setHeader('access-control-allow-origin', '*')
  response.setHeader('access-control-allow-headers', 'content-type, x-publishable-api-key, authorization, apikey')
  response.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS')
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function lineItem(quantity) {
  return {
    id: 'item_assurance',
    title: product.title,
    thumbnail: null,
    variant,
    quantity,
    unit_price: UNIT_PRICE,
    total: UNIT_PRICE * quantity,
  }
}

function productResponse(url) {
  const handle = url.searchParams.get('handle')
  const products = handle && handle !== product.handle ? [] : [product]
  return { products, count: products.length, offset: 0, limit: 12 }
}

function restResponse(pathname) {
  if (pathname === '/rest/v1/chat_settings') return []
  if (pathname === '/rest/v1/carousel_slides') return []
  if (pathname === '/rest/v1/analytics_events') return []
  return null
}

export async function createLocalRuntimeFixtureServer({ host = '127.0.0.1', port = 3101 } = {}) {
  assertLoopback(host)
  parsePort(port, { allowZero: true })
  const carts = new Map()
  let cartSequence = 0

  const server = createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.statusCode = 204
      response.end()
      return
    }

    const url = new URL(request.url ?? '/', `http://${host}`)
    try {
      if (request.method === 'GET' && url.pathname === '/__assurance/health') {
        send(response, 200, {
          schema: 'bootandstrap.local-runtime-fixture/v1',
          status: 'ready',
          activeCarts: carts.size,
          lineItems: [...carts.values()].reduce((sum, cart) => sum + cart.items.length, 0),
        })
        return
      }
      if (request.method === 'POST' && url.pathname === '/rest/v1/rpc/get_tenant_governance') {
        send(response, 200, {
          config,
          feature_flags: featureFlags,
          plan_limits: planLimits,
          tenant_status: 'active',
        })
        return
      }
      const rest = restResponse(url.pathname)
      if (rest !== null) {
        send(response, request.method === 'POST' ? 201 : 200, rest)
        return
      }
      if (request.method === 'GET' && url.pathname === '/store/regions') {
        send(response, 200, {
          regions: [{
            id: 'reg_assurance',
            name: 'Switzerland',
            currency_code: 'chf',
            countries: [{ iso_2: 'ch', display_name: 'Switzerland' }],
          }],
        })
        return
      }
      if (request.method === 'GET' && url.pathname === '/store/product-categories') {
        send(response, 200, { product_categories: [category] })
        return
      }
      if (request.method === 'GET' && url.pathname === '/store/products') {
        send(response, 200, productResponse(url))
        return
      }
      if (request.method === 'GET' && url.pathname === '/store/shipping-options') {
        const cart = carts.get(url.searchParams.get('cart_id'))
        if (!cart) {
          send(response, 404, { error: 'cart_not_found' })
          return
        }
        send(response, 200, {
          shipping_options: [{
            id: 'so_assurance_standard',
            name: 'Assurance Standard',
            amount: 0,
            currency_code: 'chf',
          }],
        })
        return
      }
      if (request.method === 'POST' && url.pathname === '/store/carts') {
        await readJson(request)
        const cart = emptyCart(`cart_assurance_${++cartSequence}`)
        carts.set(cart.id, cart)
        send(response, 200, { cart })
        return
      }

      const cartMatch = url.pathname.match(/^\/store\/carts\/([^/]+)$/)
      if (request.method === 'GET' && cartMatch) {
        const cart = carts.get(cartMatch[1])
        send(response, cart ? 200 : 404, cart ? { cart } : { error: 'cart_not_found' })
        return
      }
      if (request.method === 'POST' && cartMatch) {
        const cart = carts.get(cartMatch[1])
        if (!cart) {
          send(response, 404, { error: 'cart_not_found' })
          return
        }
        const body = await readJson(request)
        if (!validAddress(body.shipping_address) || !validAddress(body.billing_address)) {
          send(response, 400, { error: 'invalid_cart_address' })
          return
        }
        cart.shipping_address = body.shipping_address
        cart.billing_address = body.billing_address
        send(response, 200, { cart })
        return
      }
      const shippingMethodMatch = url.pathname.match(/^\/store\/carts\/([^/]+)\/shipping-methods$/)
      if (request.method === 'POST' && shippingMethodMatch) {
        const cart = carts.get(shippingMethodMatch[1])
        if (!cart) {
          send(response, 404, { error: 'cart_not_found' })
          return
        }
        const body = await readJson(request)
        if (body.option_id !== 'so_assurance_standard') {
          send(response, 400, { error: 'invalid_shipping_option' })
          return
        }
        cart.shipping_methods = [{
          id: 'so_assurance_standard',
          name: 'Assurance Standard',
          amount: 0,
        }]
        send(response, 200, { cart })
        return
      }
      const addMatch = url.pathname.match(/^\/store\/carts\/([^/]+)\/line-items$/)
      if (request.method === 'POST' && addMatch) {
        const cart = carts.get(addMatch[1])
        if (!cart) {
          send(response, 404, { error: 'cart_not_found' })
          return
        }
        const body = await readJson(request)
        if (body.variant_id !== variant.id || !Number.isInteger(body.quantity) || body.quantity < 1) {
          send(response, 400, { error: 'invalid_line_item' })
          return
        }
        cart.items = [lineItem(body.quantity)]
        send(response, 200, { cart: recalculate(cart) })
        return
      }
      const itemMatch = url.pathname.match(/^\/store\/carts\/([^/]+)\/line-items\/([^/]+)$/)
      if (itemMatch) {
        const cart = carts.get(itemMatch[1])
        const item = cart?.items.find((entry) => entry.id === itemMatch[2])
        if (!cart || !item) {
          send(response, 404, { error: 'line_item_not_found' })
          return
        }
        if (request.method === 'POST') {
          const body = await readJson(request)
          if (!Number.isInteger(body.quantity) || body.quantity < 1) {
            send(response, 400, { error: 'invalid_quantity' })
            return
          }
          cart.items = [lineItem(body.quantity)]
          send(response, 200, { cart: recalculate(cart) })
          return
        }
        if (request.method === 'DELETE') {
          cart.items = []
          recalculate(cart)
          carts.delete(cart.id)
          send(response, 200, { parent: cart })
          return
        }
      }

      send(response, 404, { error: 'fixture_route_not_found', path: url.pathname })
    } catch (error) {
      if (error instanceof SyntaxError) {
        send(response, 400, { error: 'malformed_json' })
      } else {
        send(response, 500, { error: 'fixture_internal_error' })
      }
    }
  })

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(port, host, resolveListen)
  })
  const address = server.address()
  const resolvedPort = typeof address === 'object' && address ? address.port : port

  return {
    origin: `http://${host === '::1' ? '[::1]' : host}:${resolvedPort}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose())
    }),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    const options = parseLocalRuntimeFixtureArgs(process.argv.slice(2))
    const instance = await createLocalRuntimeFixtureServer(options)
    process.stdout.write(`[local-runtime-fixture] ready ${instance.origin}\n`)
    const close = async () => {
      await instance.close()
      process.exit(0)
    }
    process.once('SIGINT', close)
    process.once('SIGTERM', close)
  } catch (error) {
    process.stderr.write(`[local-runtime-fixture] ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
