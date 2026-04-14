/**
 * Backup Executor — Export tenant data to Supabase Storage
 *
 * Fetches all business data from Medusa Admin API + governance from Supabase,
 * compresses into a JSON backup, and uploads to the tenant-backups bucket.
 *
 * Designed for the async job queue: `tenant_backup` job type.
 *
 * @module lib/backup/backup-executor
 */
import 'server-only'

import { createHash } from 'crypto'
import { gzip } from 'zlib'
import { promisify } from 'util'
import type {
    TenantBackup,
    BackupData,
    BackupStats,
    BackupProduct,
    BackupOrder,
    BackupCustomer,
    BackupCategory,
    BackupPromotion,
    BackupInventoryItem,
    BackupGovernance,
} from './backup-types'
import type { TenantMedusaScope } from '@/lib/medusa/tenant-scope'

const gzipAsync = promisify(gzip)

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashContent(data: unknown): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

function formatTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ── Data Fetchers (lightweight wrappers around admin API) ────────────────────

async function fetchProducts(scope: TenantMedusaScope): Promise<BackupProduct[]> {
    const { getAdminProductsFull } = await import('@/lib/medusa/admin')
    const { products } = await getAdminProductsFull({ limit: 2000 }, scope)
    return products.map(p => ({
        id: p.id,
        title: p.title || '',
        handle: p.handle || '',
        description: p.description || null,
        status: p.status || 'draft',
        thumbnail: p.thumbnail || null,
        images: (p.images || []).map(img => ({ url: img.url })),
        categories: (p.categories || []).map(c => ({ id: c.id, name: c.name })),
        variants: (p.variants || []).map(v => ({
            id: v.id,
            title: v.title || 'Default',
            sku: v.sku || null,
            prices: (v.prices || []).map(pr => ({
                amount: pr.amount,
                currency_code: pr.currency_code,
            })),
            manage_inventory: v.manage_inventory ?? false,
            inventory_quantity: v.inventory_quantity ?? null,
        })),
        metadata: p.metadata || null,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
    }))
}

async function fetchOrders(scope: TenantMedusaScope): Promise<BackupOrder[]> {
    const { getAdminOrders } = await import('@/lib/medusa/admin')
    const { orders } = await getAdminOrders({ limit: 5000 }, scope)
    return orders.map(o => ({
        id: o.id,
        display_id: o.display_id ?? null,
        status: o.status || 'pending',
        email: o.email || null,
        total: o.total ?? 0,
        currency_code: o.currency_code || 'eur',
        items: (o.items || []).map(i => ({
            title: i.title || '',
            quantity: i.quantity ?? 1,
            unit_price: i.unit_price ?? 0,
        })),
        shipping_address: o.shipping_address || null,
        created_at: o.created_at || new Date().toISOString(),
    }))
}

async function fetchCustomers(scope: TenantMedusaScope): Promise<BackupCustomer[]> {
    const { getAdminCustomers } = await import('@/lib/medusa/admin')
    const { customers } = await getAdminCustomers({ limit: 5000 }, scope)
    return customers.map(c => ({
        id: c.id,
        email: c.email || '',
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        phone: c.phone || null,
        has_account: c.has_account ?? false,
        created_at: c.created_at || new Date().toISOString(),
        metadata: c.metadata || null,
    }))
}

async function fetchCategories(scope: TenantMedusaScope): Promise<BackupCategory[]> {
    const { getAdminCategories } = await import('@/lib/medusa/admin')
    const { product_categories } = await getAdminCategories({ limit: 500 }, scope)
    return product_categories.map((c: { id: string; name: string; handle: string; description: string | null; parent_category: { id: string } | null }) => ({
        id: c.id,
        name: c.name || '',
        handle: c.handle || '',
        description: c.description || null,
        parent_category_id: c.parent_category?.id || null,
    }))
}

async function fetchPromotions(scope: TenantMedusaScope): Promise<BackupPromotion[]> {
    try {
        const { getPromotions } = await import('@/lib/medusa/admin-promotions')
        const { promotions } = await getPromotions({ limit: 500 }, scope)
        return promotions.map(p => ({
            id: p.id,
            code: p.code,
            type: p.type,
            value: p.value,
            is_disabled: p.is_disabled,
            usage_limit: p.usage_limit,
            usage_count: p.usage_count,
            starts_at: p.starts_at,
            ends_at: p.ends_at,
        }))
    } catch {
        return []  // Promotions module may not exist yet
    }
}

async function fetchInventory(scope: TenantMedusaScope): Promise<BackupInventoryItem[]> {
    try {
        const { getInventoryItems } = await import('@/lib/medusa/admin-inventory')
        const result = await getInventoryItems({ limit: 5000 }, scope)
        return result.inventory_items.map((i: { id: string; sku: string | null; title: string | null; stocked_quantity: number; reserved_quantity: number }) => ({
            id: i.id,
            sku: i.sku || null,
            title: i.title || null,
            stocked_quantity: i.stocked_quantity ?? 0,
            reserved_quantity: i.reserved_quantity ?? 0,
        }))
    } catch {
        return []
    }
}

async function fetchGovernance(tenantId: string): Promise<BackupGovernance> {
    try {
        const { getConfigForTenant } = await import('@/lib/config')
        const appConfig = await getConfigForTenant(tenantId)
        return {
            config: appConfig.config as Record<string, unknown>,
            feature_flags: appConfig.featureFlags as Record<string, boolean>,
            plan_limits: appConfig.planLimits as unknown as Record<string, number>,
        }
    } catch {
        return { config: {}, feature_flags: {}, plan_limits: {} }
    }
}

// ── Main Executor ────────────────────────────────────────────────────────────

export interface BackupResult {
    success: boolean
    backup_key?: string
    size_bytes?: number
    duration_ms?: number
    error?: string
    stats?: BackupStats
}

/**
 * Execute a full tenant backup.
 *
 * 1. Fetches all data from Medusa Admin API + governance
 * 2. Builds a TenantBackup JSON
 * 3. Compresses with gzip
 * 4. Uploads to tenant-backups/{slug}/{timestamp}_full.json.gz
 *
 * @param tenantId - Tenant UUID
 * @param tenantSlug - Tenant slug (folder prefix)
 * @param scope - Medusa admin API scope
 */
export async function executeFullBackup(
    tenantId: string,
    tenantSlug: string,
    scope: TenantMedusaScope,
): Promise<BackupResult> {
    const startTime = Date.now()

    try {
        // ── Fetch all data in parallel ───────────────────────────────────
        const [products, orders, customers, categories, promotions, inventory, governance] =
            await Promise.all([
                fetchProducts(scope),
                fetchOrders(scope),
                fetchCustomers(scope),
                fetchCategories(scope),
                fetchPromotions(scope),
                fetchInventory(scope),
                fetchGovernance(tenantId),
            ])

        const data: BackupData = {
            products,
            orders,
            customers,
            categories,
            promotions,
            inventory,
            governance,
        }

        // ── Build checksums for incremental diffing ──────────────────────
        const checksums: Record<string, string> = {
            products: hashContent(products),
            orders: hashContent(orders),
            customers: hashContent(customers),
            categories: hashContent(categories),
            promotions: hashContent(promotions),
            inventory: hashContent(inventory),
            governance: hashContent(governance),
        }

        const stats: BackupStats = {
            products_count: products.length,
            orders_count: orders.length,
            customers_count: customers.length,
            categories_count: categories.length,
            promotions_count: promotions.length,
            inventory_count: inventory.length,
            total_size_bytes: 0,  // will be set after compression
            duration_ms: 0,       // will be set at end
        }

        const backup: TenantBackup = {
            version: '1.0',
            tenant_id: tenantId,
            tenant_slug: tenantSlug,
            created_at: new Date().toISOString(),
            type: 'full',
            data,
            stats,
            checksums,
        }

        // ── Compress ─────────────────────────────────────────────────────
        const jsonStr = JSON.stringify(backup)
        const compressed = await gzipAsync(Buffer.from(jsonStr, 'utf-8'))
        const sizeBytes = compressed.length

        stats.total_size_bytes = sizeBytes
        stats.duration_ms = Date.now() - startTime

        // ── Upload to Supabase Storage ───────────────────────────────────
        const timestamp = formatTimestamp()
        const backupKey = `${tenantSlug}/${timestamp}_full.json.gz`

        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        const { error: uploadError } = await supabase
            .storage
            .from('tenant-backups')
            .upload(backupKey, compressed, {
                contentType: 'application/gzip',
                upsert: false,
            })

        if (uploadError) {
            return {
                success: false,
                error: `Upload failed: ${uploadError.message}`,
                duration_ms: Date.now() - startTime,
            }
        }

        return {
            success: true,
            backup_key: backupKey,
            size_bytes: sizeBytes,
            duration_ms: Date.now() - startTime,
            stats,
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown backup error',
            duration_ms: Date.now() - startTime,
        }
    }
}
