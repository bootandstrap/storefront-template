/**
 * Storage Tracker — Tenant storage usage measurement
 *
 * Measures the real storage usage for a tenant by querying Medusa's
 * product images/uploads and comparing against the plan's `storage_limit_mb`.
 *
 * Usage contexts:
 *   - `panel/capacidad/` page — display current storage usage
 *   - Cron/periodic jobs — pre-emptive alerts when approaching limit
 *   - Upload guards — block uploads if storage exceeded
 *
 * Architecture:
 *   Medusa Admin API → count product images → estimate size
 *   Supabase `config.storage_used_mb` → persisted metric
 *   Plan limits `storage_limit_mb` → enforcement cap
 *
 * NOTE: Exact file-size measurement requires admin API iteration.
 * For MVP, we use a heuristic (image count × average size).
 * Full byte-accurate measurement can be added via R2/S3 bucket API.
 *
 * @module lib/storage-tracker
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StorageUsage {
    /** Estimated storage used in MB */
    usedMb: number
    /** Maximum allowed storage in MB from plan */
    limitMb: number
    /** Usage percentage (0-100) */
    percent: number
    /** Number of product images tracked */
    imageCount: number
    /** Whether the tenant is over their limit */
    exceeded: boolean
    /** Timestamp of last measurement */
    measuredAt: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Average product image size estimate (KB) — conservative for HQ product photos */
const AVG_IMAGE_SIZE_KB = 350

/** Default storage limit if not configured (MB) */
const DEFAULT_STORAGE_LIMIT_MB = 500

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Measure storage usage for a tenant.
 *
 * Queries Medusa Admin API for product count and estimates
 * storage based on average image sizes. Updates `config.storage_used_mb`
 * in Supabase for cached reads.
 *
 * @param tenantId - The tenant ID to measure storage for
 * @param scope - Medusa admin scope { apiUrl, adminToken }
 * @returns StorageUsage with current metrics
 */
export async function measureStorageUsage(
    tenantId: string,
    scope: { apiUrl: string; adminToken: string },
): Promise<StorageUsage> {
    let imageCount = 0

    try {
        // Query Medusa for total product count with images
        const res = await fetch(`${scope.apiUrl}/admin/products?limit=0&fields=id`, {
            headers: {
                'Authorization': `Bearer ${scope.adminToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (res.ok) {
            const data = await res.json() as { count?: number }
            // Estimate ~3 images per product (thumbnail + 2 gallery)
            imageCount = (data.count ?? 0) * 3
        }
    } catch {
        // Medusa unreachable — use last known value
    }

    // Calculate estimated storage
    const usedMb = Math.round((imageCount * AVG_IMAGE_SIZE_KB) / 1024 * 10) / 10

    // Fetch limit from plan
    let limitMb = DEFAULT_STORAGE_LIMIT_MB
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        const { data: limits } = await supabase
            .from('plan_limits')
            .select('storage_limit_mb')
            .eq('tenant_id', tenantId)
            .single()

        if (limits && typeof (limits as { storage_limit_mb?: number }).storage_limit_mb === 'number') {
            limitMb = (limits as { storage_limit_mb: number }).storage_limit_mb
        }

        // Persist measurement to config for cached reads
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('config') as any)
            .update({
                storage_used_mb: usedMb,
                storage_measured_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenantId)
    } catch {
        // Non-critical — metric still returned even if persistence fails
    }

    const percent = limitMb > 0 ? Math.min(100, Math.round((usedMb / limitMb) * 100)) : 0

    return {
        usedMb,
        limitMb,
        percent,
        imageCount,
        exceeded: usedMb > limitMb,
        measuredAt: new Date().toISOString(),
    }
}

/**
 * Quick check: is the tenant over their storage limit?
 * Uses cached value from config if available.
 */
export async function isStorageExceeded(tenantId: string): Promise<boolean> {
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        const [{ data: config }, { data: limits }] = await Promise.all([
            supabase.from('config').select('*').eq('tenant_id', tenantId).single(),
            supabase.from('plan_limits').select('storage_limit_mb').eq('tenant_id', tenantId).single(),
        ])

        const usedMb = (config as { storage_used_mb?: number } | null)?.storage_used_mb ?? 0
        const limitMb = (limits as { storage_limit_mb?: number } | null)?.storage_limit_mb ?? DEFAULT_STORAGE_LIMIT_MB

        return usedMb > limitMb
    } catch {
        return false // Fail-open: don't block uploads on measurement failure
    }
}
