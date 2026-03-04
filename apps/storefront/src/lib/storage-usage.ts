/**
 * Tenant Storage Usage Estimator
 *
 * Estimates total storage used by a tenant based on product images.
 * Since images are uploaded through Medusa (not directly to Supabase Storage),
 * we estimate based on image counts × average file size.
 *
 * For enforcement, we add the incoming file size to the estimate before checking.
 */

import type { TenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminProductsFull } from '@/lib/medusa/admin'

/** Average image size estimate in bytes (800KB — typical product photo after compression) */
const AVG_IMAGE_SIZE_BYTES = 800 * 1024

/**
 * Estimate total storage used by a tenant's product images.
 * Returns estimated MB used and total image count.
 */
export async function estimateTenantStorageUsage(
    scope: TenantMedusaScope
): Promise<{ estimatedMb: number; imageCount: number }> {
    try {
        // Fetch all products with images (paginated, max 1000)
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
        // If Medusa is unavailable, return 0 — fail open for reads
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
