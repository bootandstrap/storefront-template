/**
 * Backup Restore Engine — Restore tenant data from a backup JSON
 *
 * Reads a backup from Supabase Storage, parses it, and writes data back
 * to Medusa via the Admin API.
 *
 * Restore strategy:
 * 1. Download + decompress backup JSON from tenant-backups bucket
 * 2. Parse and validate against TenantBackup schema
 * 3. Restore in order: Categories → Products → Customers (orders are read-only)
 * 4. Skip entities that already exist (by ID match)
 * 5. Report results (created, skipped, failed)
 *
 * SAFETY:
 * - Orders are NEVER restored (financial records are immutable)
 * - Products are created if missing, updated if existing
 * - Categories are created if missing
 * - Customers are NOT restored (privacy — must re-register)
 * - Governance config is NOT restored (managed by entitlement engine)
 *
 * @module lib/backup/backup-restore
 */
import 'server-only'

import { gunzip } from 'zlib'
import { promisify } from 'util'
import type { TenantBackup, BackupProduct, BackupCategory } from './backup-types'
import type { TenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { logger } from '@/lib/logger'

const gunzipAsync = promisify(gunzip)

// ── Types ────────────────────────────────────────────────────────────────────

export interface RestoreResult {
    success: boolean
    duration_ms: number
    categories: EntityRestoreResult
    products: EntityRestoreResult
    errors: string[]
    skipped_entities: string[]
}

export interface EntityRestoreResult {
    created: number
    skipped: number
    failed: number
    errors: string[]
}

// ── Download & Parse ─────────────────────────────────────────────────────────

/**
 * Download and parse a backup file from Supabase Storage.
 */
export async function downloadBackup(backupKey: string): Promise<TenantBackup | null> {
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        const { data: blob, error } = await supabase
            .storage
            .from('tenant-backups')
            .download(backupKey)

        if (error || !blob) {
            logger.error('[backup-restore] Download failed:', error?.message)
            return null
        }

        // Decompress if gzipped
        const buffer = Buffer.from(await blob.arrayBuffer())
        let jsonStr: string

        if (backupKey.endsWith('.gz')) {
            const decompressed = await gunzipAsync(buffer)
            jsonStr = decompressed.toString('utf-8')
        } else {
            jsonStr = buffer.toString('utf-8')
        }

        const backup = JSON.parse(jsonStr) as TenantBackup

        // Validate version
        if (backup.version !== '1.0') {
            logger.error('[backup-restore] Unsupported backup version:', backup.version)
            return null
        }

        return backup
    } catch (err) {
        logger.error('[backup-restore] Parse error:', err)
        return null
    }
}

// ── Restore Categories ───────────────────────────────────────────────────────

async function restoreCategories(
    categories: BackupCategory[],
    scope: TenantMedusaScope,
): Promise<EntityRestoreResult> {
    const result: EntityRestoreResult = { created: 0, skipped: 0, failed: 0, errors: [] }
    if (categories.length === 0) return result

    const { getAdminCategories, createAdminCategory } = await import('@/lib/medusa/admin')

    // Fetch existing categories
    const { product_categories: existing } = await getAdminCategories({ limit: 500 }, scope)
    const existingHandles = new Set(existing.map(c => c.handle))

    for (const cat of categories) {
        if (existingHandles.has(cat.handle)) {
            result.skipped++
            continue
        }

        try {
            const { error } = await createAdminCategory(
                {
                    name: cat.name,
                    handle: cat.handle,
                    description: cat.description || undefined,
                },
                scope,
            )

            if (error) {
                result.failed++
                result.errors.push(`Category "${cat.name}": ${error}`)
            } else {
                result.created++
            }
        } catch (err) {
            result.failed++
            result.errors.push(`Category "${cat.name}": ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    return result
}

// ── Restore Products ─────────────────────────────────────────────────────────

async function restoreProducts(
    products: BackupProduct[],
    scope: TenantMedusaScope,
): Promise<EntityRestoreResult> {
    const result: EntityRestoreResult = { created: 0, skipped: 0, failed: 0, errors: [] }
    if (products.length === 0) return result

    const { getAdminProductsFull } = await import('@/lib/medusa/admin')
    const { adminFetch } = await import('@/lib/medusa/admin-core')

    // Fetch existing products by handle
    const { products: existing } = await getAdminProductsFull({ limit: 2000 }, scope)
    const existingHandles = new Set(existing.map(p => p.handle))

    for (const product of products) {
        if (existingHandles.has(product.handle)) {
            result.skipped++
            continue
        }

        try {
            // Create product via Medusa Admin API
            const createPayload = {
                title: product.title,
                handle: product.handle,
                description: product.description || undefined,
                status: product.status === 'published' ? 'published' : 'draft',
                metadata: product.metadata || undefined,
                // Variants with prices
                variants: product.variants.map(v => ({
                    title: v.title,
                    sku: v.sku || undefined,
                    manage_inventory: v.manage_inventory,
                    prices: v.prices.map(p => ({
                        amount: p.amount,
                        currency_code: p.currency_code,
                    })),
                })),
            }

            const res = await adminFetch<{ product: { id: string } }>(
                '/admin/products',
                {
                    method: 'POST',
                    body: JSON.stringify(createPayload),
                },
                scope,
            )

            if (res.error) {
                result.failed++
                result.errors.push(`Product "${product.title}": ${res.error}`)
            } else {
                result.created++
            }
        } catch (err) {
            result.failed++
            result.errors.push(`Product "${product.title}": ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    return result
}

// ── Main Restore Executor ────────────────────────────────────────────────────

/**
 * Execute a full restore from a backup.
 *
 * Restores: categories → products (in dependency order).
 * Skips: orders (immutable), customers (privacy), governance (managed externally).
 *
 * @param backupKey - Storage path to the backup file
 * @param scope - Medusa admin API scope
 */
export async function executeRestore(
    backupKey: string,
    scope: TenantMedusaScope,
): Promise<RestoreResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const skippedEntities: string[] = ['orders', 'customers', 'governance']

    // 1. Download & parse
    const backup = await downloadBackup(backupKey)
    if (!backup) {
        return {
            success: false,
            duration_ms: Date.now() - startTime,
            categories: { created: 0, skipped: 0, failed: 0, errors: [] },
            products: { created: 0, skipped: 0, failed: 0, errors: [] },
            errors: ['Failed to download or parse backup'],
            skipped_entities: skippedEntities,
        }
    }

    // 2. Restore categories first (products may reference them)
    const categoriesResult = await restoreCategories(backup.data.categories, scope)
    errors.push(...categoriesResult.errors)

    // 3. Restore products
    const productsResult = await restoreProducts(backup.data.products, scope)
    errors.push(...productsResult.errors)

    const totalCreated = categoriesResult.created + productsResult.created
    const totalFailed = categoriesResult.failed + productsResult.failed

    return {
        success: totalFailed === 0,
        duration_ms: Date.now() - startTime,
        categories: categoriesResult,
        products: productsResult,
        errors,
        skipped_entities: skippedEntities,
    }
}
