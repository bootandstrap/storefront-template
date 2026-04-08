/**
 * Seeder: Orders
 *
 * Creates demo orders using the Store API Cart flow,
 * NOT the Admin draft-order endpoint (which hangs in Medusa v2
 * when there are completed draft orders).
 *
 * Flow per order:
 * 1. POST /store/carts — create cart with region
 * 2. POST /store/carts/:id/line-items — add items
 * 3. POST /store/carts/:id/complete — complete the cart (creates order)
 *
 * Every request has a 10s timeout to prevent hangs.
 * If Medusa is unresponsive, we bail early.
 *
 * Dates distributed across last N days with realistic curve.
 */

import type { IndustryTemplate, LogFn } from '../types'

interface OrdersResult {
    ordersCreated: number
    orderIds: string[]
}

// ── Helpers ─────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
    let s = seed
    return () => {
        s = (s * 1664525 + 1013904223) & 0x7fffffff
        return s / 0x7fffffff
    }
}

function randomInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min
}

function randomPick<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)]
}

// Timeout-protected fetch — NEVER wait more than 10 seconds
async function safeFetch(url: string, opts: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
        const res = await fetch(url, { ...opts, signal: controller.signal })
        return res
    } finally {
        clearTimeout(timeout)
    }
}

async function adminRequest<T = any>(
    baseUrl: string,
    jwt: string,
    endpoint: string,
    options: { method?: string; body?: object } = {}
): Promise<T | null> {
    try {
        const res = await safeFetch(`${baseUrl}${endpoint}`, {
            method: options.method ?? (options.body ? 'POST' : 'GET'),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`,
            },
            ...(options.body && { body: JSON.stringify(options.body) }),
        })
        if (!res.ok) {
            const text = await res.text().catch(() => '')
            return null
        }
        if (res.status === 204) return {} as T
        return res.json()
    } catch (err) {
        // AbortError = timeout
        return null
    }
}

async function storeRequest<T = any>(
    baseUrl: string,
    publishableKey: string,
    endpoint: string,
    options: { method?: string; body?: object; cartId?: string } = {}
): Promise<T | null> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-publishable-api-key': publishableKey,
        }
        const res = await safeFetch(`${baseUrl}${endpoint}`, {
            method: options.method ?? (options.body ? 'POST' : 'GET'),
            headers,
            ...(options.body && { body: JSON.stringify(options.body) }),
        })
        if (!res.ok) return null
        if (res.status === 204) return {} as T
        return res.json()
    } catch {
        return null
    }
}

// ── Main Seeder ─────────────────────────────────────────────

export async function seedOrders(
    client: { request: Function; getShippingOptions: Function },
    template: IndustryTemplate,
    regionId: string,
    customerIds: string[],
    variantIds: string[],
    log: LogFn
): Promise<OrdersResult> {
    log('📋', '═══ ORDERS SEED START ═══')

    if (!customerIds.length || !variantIds.length) {
        log('⚠️', 'Cannot create orders: no customers or variants available')
        return { ordersCreated: 0, orderIds: [] }
    }

    const baseUrl = process.env.MEDUSA_BACKEND_URL || process.env.MEDUSA_ADMIN_URL || 'http://localhost:9000'
    const email = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusajs.com'
    const password = process.env.MEDUSA_ADMIN_PASSWORD || 'supersecret'

    // Get JWT for admin operations
    let jwt = ''
    try {
        const authRes = await safeFetch(`${baseUrl}/auth/user/emailpass`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        if (!authRes.ok) throw new Error('Auth failed')
        const authData = await authRes.json()
        jwt = authData.token
    } catch (err) {
        log('❌', 'Cannot authenticate with Medusa for orders — skipping')
        return { ordersCreated: 0, orderIds: [] }
    }

    // Get publishable API key for Store API
    let publishableKey = ''
    const apiRes = await adminRequest<{ api_keys: { token: string; type: string }[] }>(
        baseUrl, jwt, '/admin/api-keys?type=publishable'
    )
    publishableKey = apiRes?.api_keys?.find(k => k.type === 'publishable')?.token ?? ''

    if (!publishableKey) {
        log('⚠️', 'No publishable API key — cannot create orders via Store API')
        return { ordersCreated: 0, orderIds: [] }
    }

    // Get shipping options
    let shippingOptionId: string | null = null
    const shippingRes = await storeRequest<{ shipping_options: { id: string }[] }>(
        baseUrl, publishableKey, `/store/shipping-options?cart_id=placeholder`
    )
    // We'll get shipping options per cart instead

    const pattern = template.orderPattern
    const rng = seededRandom(template.id.charCodeAt(0) * 1000 + template.id.length)

    let ordersCreated = 0
    const orderIds: string[] = []
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 3

    // Reduce count for safety — max 20 orders for demos
    const orderCount = Math.min(pattern.count, 20)

    for (let i = 0; i < orderCount; i++) {
        // Circuit breaker — if 3 orders fail in a row, Medusa is likely stuck
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            log('⚠️', `${MAX_CONSECUTIVE_FAILURES} consecutive failures — stopping order creation (Medusa may be overloaded)`)
            break
        }

        const customerIdx = Math.floor(rng() * customerIds.length)
        const customerEmail = template.customers[customerIdx]?.email ?? `demo-${i}@bootandstrap.demo`
        const numItems = randomInt(rng, pattern.itemsPerOrder[0], pattern.itemsPerOrder[1])

        // Pick unique variants
        const selectedVariants: string[] = []
        const usedIndices = new Set<number>()
        for (let j = 0; j < numItems && selectedVariants.length < variantIds.length; j++) {
            let idx: number
            let attempts = 0
            do {
                idx = Math.floor(rng() * variantIds.length)
                attempts++
            } while (usedIndices.has(idx) && attempts < 20)
            usedIndices.add(idx)
            selectedVariants.push(variantIds[idx])
        }

        if (!selectedVariants.length) continue

        try {
            // Step 1: Create cart
            const cartRes = await storeRequest<{ cart: { id: string } }>(
                baseUrl, publishableKey, '/store/carts',
                { body: { region_id: regionId, email: customerEmail } }
            )
            if (!cartRes?.cart?.id) {
                consecutiveFailures++
                continue
            }
            const cartId = cartRes.cart.id

            // Step 2: Add line items
            let itemsAdded = 0
            for (const vid of selectedVariants) {
                const qty = randomInt(rng, pattern.quantityPerItem[0], pattern.quantityPerItem[1])
                const itemRes = await storeRequest(
                    baseUrl, publishableKey, `/store/carts/${cartId}/line-items`,
                    { body: { variant_id: vid, quantity: qty } }
                )
                if (itemRes) itemsAdded++
            }

            if (itemsAdded === 0) {
                consecutiveFailures++
                continue
            }

            // Step 3: Add shipping method (get options for this cart)
            if (!shippingOptionId) {
                const optionsRes = await storeRequest<{ shipping_options: { id: string }[] }>(
                    baseUrl, publishableKey, `/store/shipping-options?cart_id=${cartId}`
                )
                shippingOptionId = optionsRes?.shipping_options?.[0]?.id ?? null
            }

            if (shippingOptionId) {
                await storeRequest(
                    baseUrl, publishableKey, `/store/carts/${cartId}/shipping-methods`,
                    { body: { option_id: shippingOptionId } }
                )
            }

            // Step 4: Initialize payment session
            await storeRequest(
                baseUrl, publishableKey, `/store/carts/${cartId}/payment-sessions`,
                { body: {} }
            )

            // Step 5: Complete cart → creates real order
            const completeRes = await storeRequest<{ type: string; order: { id: string } }>(
                baseUrl, publishableKey, `/store/carts/${cartId}/complete`,
                { method: 'POST', body: {} }
            )

            if (completeRes?.order?.id) {
                orderIds.push(completeRes.order.id)
                ordersCreated++
                consecutiveFailures = 0
            } else {
                // Cart completion failed — still count as attempt
                consecutiveFailures++
            }

            if ((i + 1) % 5 === 0 || i === orderCount - 1) {
                log('📋', `Orders: ${ordersCreated}/${orderCount} created`)
            }
        } catch (err) {
            consecutiveFailures++
            log('⚠️', `Order ${i + 1} failed: ${err instanceof Error ? err.message : String(err).slice(0, 100)}`)
        }
    }

    log('📋', `═══ ORDERS SEED COMPLETE: ${ordersCreated}/${orderCount} ═══`)
    return { ordersCreated, orderIds }
}
