/**
 * Tenant Storage Usage — Real Measurement via Supabase RPC
 *
 * Queries storage.objects table for accurate byte-level usage per tenant.
 * Falls back to image-count estimation if the RPC is unavailable.
 *
 * Replaces the old estimation approach (800KB × image count) with real data.
 *
 * @module lib/storage-usage
 */

import type { TenantMedusaScope } from '@/lib/medusa/tenant-scope'
import type { TenantStorageUsage } from '@/lib/backup/backup-types'
import { logger } from '@/lib/logger'

/** Average image size estimate in bytes — ONLY used as fallback */
const AVG_IMAGE_SIZE_BYTES = 800 * 1024

/**
 * Get real storage usage for a tenant via Supabase RPC.
 *
 * Returns actual byte counts from storage.objects table.
 * Falls back to estimation if the RPC is not available.
 */
export async function getTenantStorageUsage(
    tenantSlug: string,
): Promise<TenantStorageUsage> {
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)(
            'get_tenant_storage_usage',
            { p_slug: tenantSlug }
        )

        if (!error && data) {
            return data as TenantStorageUsage
        }

        // RPC not available → return zeros
        logger.warn('[storage-usage] RPC unavailable, returning empty:', error?.message)
        return {
            images: { count: 0, bytes: 0, mb: 0 },
            backups: { count: 0, bytes: 0, mb: 0 },
            total: { bytes: 0, mb: 0 },
        }
    } catch {
        return {
            images: { count: 0, bytes: 0, mb: 0 },
            backups: { count: 0, bytes: 0, mb: 0 },
            total: { bytes: 0, mb: 0 },
        }
    }
}

/**
 * Estimate total storage used by a tenant's product images.
 * LEGACY fallback — used when RPC is not available.
 * Returns estimated MB used and total image count.
 */
export async function estimateTenantStorageUsage(
    scope: TenantMedusaScope
): Promise<{ estimatedMb: number; imageCount: number }> {
    try {
        const { getAdminProductsFull } = await import('@/lib/medusa/admin')
        const { products } = await getAdminProductsFull({ limit: 1000 }, scope)

        let totalImages = 0
        for (const product of products) {
            totalImages += (product.images?.length ?? 0)
        }

        const estimatedBytes = totalImages * AVG_IMAGE_SIZE_BYTES
        return {
            estimatedMb: Math.round(estimatedBytes / (1024 * 1024) * 100) / 100,
            imageCount: totalImages,
        }
    } catch {
        return { estimatedMb: 0, imageCount: 0 }
    }
}

/**
 * Check if a tenant can upload a file without exceeding their storage limit.
 *
 * @param currentEstimateMb - Current estimated storage in MB
 * @param incomingFileSizeBytes - Size of the file being uploaded
 * @param storageLimitMb - The plan's storage limit in MB
 */
export function canUploadFile(
    currentEstimateMb: number,
    incomingFileSizeBytes: number,
    storageLimitMb: number
): { allowed: boolean; usedMb: number; limitMb: number; afterUploadMb: number } {
    const incomingMb = incomingFileSizeBytes / (1024 * 1024)
    const afterUploadMb = Math.round((currentEstimateMb + incomingMb) * 100) / 100

    return {
        allowed: storageLimitMb <= 0 || afterUploadMb <= storageLimitMb,
        usedMb: currentEstimateMb,
        limitMb: storageLimitMb,
        afterUploadMb,
    }
}
