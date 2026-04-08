/**
 * Template Engine — Enhanced Medusa Client
 *
 * Improved API client with:
 * - Retry with exponential backoff (3 attempts)
 * - Rate limiting (50ms between requests)
 * - Typed convenience methods
 * - Bulk operations with concurrency control
 */

import type { LogFn } from './types'

const MAX_RETRIES = 3
const RETRY_BASE_MS = 500
const RATE_LIMIT_MS = 50

let lastRequestTime = 0

async function rateLimitDelay(): Promise<void> {
    const now = Date.now()
    const elapsed = now - lastRequestTime
    if (elapsed < RATE_LIMIT_MS) {
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed))
    }
    lastRequestTime = Date.now()
}

export class MedusaClient {
    private jwt = ''
    private log: LogFn

    constructor(
        private readonly baseUrl: string,
        log?: LogFn
    ) {
        this.log = log ?? ((icon, msg) => console.log(`  ${icon} ${msg}`))
    }

    async login(email: string, password: string): Promise<void> {
        const res = await this.request<{ token?: string }>('/auth/user/emailpass', {
            body: { email, password },
        })
        if (!res.token) throw new Error('Medusa login failed — no token returned')
        this.jwt = res.token
    }

    async request<T = any>(
        endpoint: string,
        options: { method?: string; body?: object; retries?: number } = {}
    ): Promise<T> {
        const maxRetries = options.retries ?? MAX_RETRIES

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await rateLimitDelay()

                const res = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: options.method ?? (options.body ? 'POST' : 'GET'),
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.jwt ? { 'Authorization': `Bearer ${this.jwt}` } : {}),
                    },
                    ...(options.body && { body: JSON.stringify(options.body) }),
                    signal: AbortSignal.timeout(10_000),
                })

                if (!res.ok) {
                    const text = await res.text().catch(() => '')
                    // 409 = conflict (already exists) — return marker
                    if (res.status === 409) return { _conflict: true } as T
                    // 404 = not found — return null marker
                    if (res.status === 404) return { _notFound: true } as T

                    // Retryable errors
                    if (res.status >= 500 && attempt < maxRetries) {
                        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
                        this.log('🔄', `Retry ${attempt + 1}/${maxRetries} in ${delay}ms (${res.status} ${endpoint})`)
                        await new Promise(r => setTimeout(r, delay))
                        continue
                    }

                    throw new Error(`Medusa ${res.status} ${endpoint}: ${text.slice(0, 300)}`)
                }

                if (res.status === 204) return {} as T
                return res.json()
            } catch (err) {
                if (attempt < maxRetries && err instanceof Error && (
                    err.name === 'AbortError' ||
                    err.message.includes('ECONNREFUSED') ||
                    err.message.includes('fetch failed')
                )) {
                    const delay = RETRY_BASE_MS * Math.pow(2, attempt)
                    this.log('🔄', `Retry ${attempt + 1}/${maxRetries} in ${delay}ms (${err.message.slice(0, 80)})`)
                    await new Promise(r => setTimeout(r, delay))
                    continue
                }
                throw err
            }
        }
        throw new Error(`Max retries exceeded for ${endpoint}`)
    }

    // ── Convenience Methods ──────────────────────────────────

    async getProducts(limit = 100): Promise<Array<{ id: string; handle: string; title: string; thumbnail: string | null; variants: Array<{ id: string; title: string }> }>> {
        const res = await this.request<{ products: any[] }>(`/admin/products?limit=${limit}&fields=id,handle,title,thumbnail,*variants`)
        return res.products ?? []
    }

    async getCategories(limit = 100): Promise<Array<{ id: string; name: string; handle: string }>> {
        const res = await this.request<{ product_categories: any[] }>(`/admin/product-categories?limit=${limit}&fields=id,name,handle`)
        return res.product_categories ?? []
    }

    async getCustomers(limit = 100): Promise<Array<{ id: string; email: string; first_name: string | null; last_name: string | null }>> {
        const res = await this.request<{ customers: any[] }>(`/admin/customers?limit=${limit}&fields=id,email,first_name,last_name`)
        return res.customers ?? []
    }

    async getOrders(limit = 100): Promise<Array<{ id: string; display_id: number; status: string }>> {
        const res = await this.request<{ orders: any[] }>(`/admin/orders?limit=${limit}&fields=id,display_id,status`)
        return res.orders ?? []
    }

    async getDraftOrders(limit = 500): Promise<Array<{ id: string; status: string }>> {
        const res = await this.request<{ draft_orders: any[] }>(`/admin/draft-orders?limit=${limit}&fields=id,status`)
        return res.draft_orders ?? []
    }

    async getRegions(): Promise<Array<{ id: string; name: string; currency_code: string }>> {
        const res = await this.request<{ regions: any[] }>('/admin/regions')
        return res.regions ?? []
    }

    async getSalesChannels(): Promise<Array<{ id: string; name: string }>> {
        const res = await this.request<{ sales_channels: any[] }>('/admin/sales-channels')
        return res.sales_channels ?? []
    }

    async getStores(): Promise<Array<{ id: string; name: string }>> {
        const res = await this.request<{ stores: any[] }>('/admin/stores')
        return res.stores ?? []
    }

    async getStockLocations(): Promise<Array<{ id: string; name: string }>> {
        const res = await this.request<{ stock_locations: any[] }>('/admin/stock-locations')
        return res.stock_locations ?? []
    }

    async getShippingOptions(): Promise<Array<{ id: string; name: string }>> {
        const res = await this.request<{ shipping_options: any[] }>('/admin/shipping-options')
        return res.shipping_options ?? []
    }

    async getCarts(limit = 100): Promise<Array<{ id: string }>> {
        try {
            const res = await this.request<{ carts: any[] }>(`/admin/carts?limit=${limit}&fields=id`, { retries: 0 })
            return res.carts ?? []
        } catch {
            // Carts endpoint may not exist in all Medusa v2 versions
            return []
        }
    }

    // ── Bulk Delete ──────────────────────────────────────────

    async bulkDelete(
        entity: string,
        ids: string[],
        options?: { concurrency?: number; silent?: boolean; retries?: number }
    ): Promise<{ deleted: number; failed: number }> {
        const concurrency = options?.concurrency ?? 5
        const retries = options?.retries ?? 1
        let deleted = 0
        let failed = 0

        // Process in batches
        for (let i = 0; i < ids.length; i += concurrency) {
            const batch = ids.slice(i, i + concurrency)
            const results = await Promise.allSettled(
                batch.map(id =>
                    this.request(`/admin/${entity}/${id}`, { method: 'DELETE', retries })
                )
            )
            for (const r of results) {
                if (r.status === 'fulfilled') deleted++
                else failed++
            }
        }

        return { deleted, failed }
    }
}
