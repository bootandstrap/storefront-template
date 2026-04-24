/**
 * @module analytics/tracker
 * @description Client-side analytics tracker with batching and structured events.
 *
 * Features:
 *   - In-memory buffer → batch insert every 5s or every 10 events
 *   - Session tracking via sessionStorage (no PII, no cookies)
 *   - Event deduplication (idempotency key)
 *   - sendBeacon() on page unload (no data loss)
 *   - Type-safe event methods
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics/tracker'
 *   analytics.pageView('/products')
 *   analytics.productView('prod_abc')
 *   analytics.addToCart('prod_abc', 2)
 *   analytics.checkoutComplete('order_123', 5000)
 *
 * @locked 🔴 PLATFORM — Part of analytics_events pipeline
 */

'use client'

import { logger } from '@/lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────

export type AnalyticsEventType =
    | 'page_view'
    | 'product_view'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'checkout_start'
    | 'checkout_complete'
    | 'search'
    | 'module_interaction'
    | 'click'
    | 'form_submit'

interface AnalyticsEvent {
    event_type: AnalyticsEventType
    properties: Record<string, unknown>
    session_id: string
    idempotency_key: string
    timestamp: string
}

// ── Session ───────────────────────────────────────────────────────────────

function getSessionId(): string {
    if (typeof window === 'undefined') return 'ssr'
    const KEY = 'bns_session_id'
    let sessionId = sessionStorage.getItem(KEY)
    if (!sessionId) {
        sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        sessionStorage.setItem(KEY, sessionId)
    }
    return sessionId
}

function generateIdempotencyKey(type: string, properties: Record<string, unknown>): string {
    const session = getSessionId()
    // Dedup window: same event type + same primary property within 2 seconds
    const window = Math.floor(Date.now() / 2000)
    const key = `${session}:${type}:${JSON.stringify(Object.values(properties).slice(0, 2))}:${window}`
    return key
}

// ── Tracker Class ─────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 5000
const MAX_BUFFER_SIZE = 10
const API_ENDPOINT = '/api/analytics'

class BootandStrapAnalytics {
    private buffer: AnalyticsEvent[] = []
    private flushTimer: ReturnType<typeof setInterval> | null = null
    private seenKeys = new Set<string>()

    constructor() {
        if (typeof window !== 'undefined') {
            this.startFlushTimer()
            this.registerBeaconFlush()
        }
    }

    // ── Structured Event Methods ──────────────────────────────────────────

    /** Track a page view */
    pageView(path: string, referrer?: string): void {
        this.track('page_view', { path, referrer: referrer ?? document.referrer })
    }

    /** Track a product detail view */
    productView(productId: string, productName?: string): void {
        this.track('product_view', { product_id: productId, product_name: productName })
    }

    /** Track add-to-cart */
    addToCart(productId: string, quantity: number, price?: number): void {
        this.track('add_to_cart', { product_id: productId, quantity, price })
    }

    /** Track remove from cart */
    removeFromCart(productId: string, quantity: number): void {
        this.track('remove_from_cart', { product_id: productId, quantity })
    }

    /** Track checkout start */
    checkoutStart(cartItemCount: number, cartTotal?: number): void {
        this.track('checkout_start', { item_count: cartItemCount, total: cartTotal })
    }

    /** Track checkout completion */
    checkoutComplete(orderId: string, total: number, currency?: string): void {
        this.track('checkout_complete', {
            order_id: orderId,
            total,
            currency: currency ?? 'CHF',
        })
    }

    /** Track search */
    search(query: string, resultCount: number): void {
        this.track('search', { query, result_count: resultCount })
    }

    /** Track module interaction (for governance analytics) */
    moduleInteraction(moduleKey: string, action: string, metadata?: Record<string, unknown>): void {
        this.track('module_interaction', { module_key: moduleKey, action, ...metadata })
    }

    /** Generic click tracking */
    click(elementId: string, context?: string): void {
        this.track('click', { element_id: elementId, context })
    }

    // ── Core ──────────────────────────────────────────────────────────────

    private track(type: AnalyticsEventType, properties: Record<string, unknown>): void {
        const idempotencyKey = generateIdempotencyKey(type, properties)

        // Deduplicate within 2-second window
        if (this.seenKeys.has(idempotencyKey)) return
        this.seenKeys.add(idempotencyKey)

        // Trim dedup set to prevent memory leak (keep last 200)
        if (this.seenKeys.size > 200) {
            const arr = Array.from(this.seenKeys)
            this.seenKeys = new Set(arr.slice(-100))
        }

        this.buffer.push({
            event_type: type,
            properties,
            session_id: getSessionId(),
            idempotency_key: idempotencyKey,
            timestamp: new Date().toISOString(),
        })

        if (this.buffer.length >= MAX_BUFFER_SIZE) {
            this.flush()
        }
    }

    /** Flush buffered events to the server */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return

        const batch = [...this.buffer]
        this.buffer = []

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: batch }),
                keepalive: true, // Survives page navigation
            })

            if (!response.ok) {
                logger.warn('[analytics] Flush failed:', response.status)
                // Re-buffer failed events (max 1 retry)
                this.buffer.unshift(...batch.slice(0, MAX_BUFFER_SIZE))
            }
        } catch {
            // Network error — re-buffer
            this.buffer.unshift(...batch.slice(0, MAX_BUFFER_SIZE))
        }
    }

    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS)
    }

    private registerBeaconFlush(): void {
        if (typeof window === 'undefined') return
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.buffer.length > 0) {
                // Use sendBeacon for reliable delivery on page hide
                const payload = JSON.stringify({ events: this.buffer })
                navigator.sendBeacon(API_ENDPOINT, payload)
                this.buffer = []
            }
        })
    }

    /** Force cleanup (for tests) */
    destroy(): void {
        if (this.flushTimer) clearInterval(this.flushTimer)
        this.buffer = []
        this.seenKeys.clear()
    }
}

// ── Singleton ─────────────────────────────────────────────────────────────

export const analytics = typeof window !== 'undefined'
    ? new BootandStrapAnalytics()
    : (new Proxy({} as BootandStrapAnalytics, {
        get: () => () => { /* no-op on server */ },
    }))
