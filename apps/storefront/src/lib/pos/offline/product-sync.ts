/**
 * POS Product Sync — Server Action + Client Logic
 *
 * Handles authoritative full-snapshot product catalog synchronization:
 * - Server action fetches products from Medusa admin API
 * - Client function atomically replaces the IndexedDB cache
 */
'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { getAdminProductsFull } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import type { CachedProduct } from './offline-store'

// ── Types ──

export interface ProductSyncResult {
    products: CachedProduct[]
    serverTime: number          // Unix timestamp ms
    totalCount: number
    error?: string
}

// ── Server Action ──

/**
 * Fetch product catalog for POS cache.
 * Returns lightweight product data for offline storage.
 */
export async function syncProductCatalogAction(
    _since?: number
): Promise<ProductSyncResult> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_pos_offline_cart' })
        const scope = await getTenantMedusaScope(tenantId)
        if (!scope) {
            throw new Error('POS product sync unavailable: tenant scope is missing')
        }

        const { products, error } = await getAdminProductsFull({
            limit: 500,
            status: 'published',
        }, scope)
        if (error) {
            throw new Error('POS product sync unavailable')
        }

        const cached: CachedProduct[] = products.map(p => ({
            id: p.id,
            title: p.title,
            thumbnail: p.thumbnail || null,
            status: p.status,
            variants: (p.variants || []).map(v => ({
                id: v.id,
                title: v.title || null,
                sku: v.sku || null,
                manage_inventory: !!v.manage_inventory,
                inventory_quantity: v.inventory_quantity ?? 0,
                barcode: v.barcode || null,
                prices: (v.prices || []).map((pr: { amount: number; currency_code: string }) => ({
                    amount: pr.amount,
                    currency_code: pr.currency_code,
                })),
            })),
            categories: (p.categories || []).map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
            })),
            updated_at: p.updated_at || new Date().toISOString(),
        }))

        return {
            products: cached,
            serverTime: Date.now(),
            totalCount: cached.length,
        }
    } catch (err) {
        return {
            products: [],
            serverTime: Date.now(),
            totalCount: 0,
            error: err instanceof Error ? err.message : 'Sync failed',
        }
    }
}
