'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { getAdminProducts, updateProductMetadata } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { revalidatePanel } from '@/lib/revalidate'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import { ToggleBadgeSchema, SetBadgesSchema } from '@/lib/owner-validation'
import { checkLimit } from '@/lib/limits'
import { buildLimitError } from '@/lib/limit-errors'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Fetch products with their current badges
// ---------------------------------------------------------------------------

export async function getProductsWithBadges(): Promise<{
    products: {
        id: string
        title: string
        handle: string
        thumbnail: string | null
        status: string
        badges: string[]
    }[]
    error?: string
}> {
    try {
        const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const scope = await getTenantMedusaScope(tenantId)
        const { products } = await getAdminProducts({ limit: 100 }, scope)

        return {
            products: products.map((p) => ({
                id: p.id,
                title: p.title,
                handle: p.handle,
                thumbnail: p.thumbnail,
                status: p.status,
                badges: Array.isArray(p.metadata?.badges) ? (p.metadata.badges as string[]) : [],
            })),
        }
    } catch (err) {
        logger.error('[panel/badges] Fetch failed:', err)
        return {
            products: [],
            error: err instanceof Error ? err.message : 'Failed to fetch products',
        }
    }
}

// ---------------------------------------------------------------------------
// Toggle a badge on/off for a product
// ---------------------------------------------------------------------------

export async function toggleBadge(
    productId: string,
    badgeId: string,
    enabled: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const parsed = ToggleBadgeSchema.safeParse({ productId, badgeId, enabled })
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }

        const scope = await getTenantMedusaScope(tenantId)

        // Get current product metadata via admin API
        const currentRes = await getAdminProducts({ limit: 100 }, scope)
        const product = currentRes.products.find((p) => p.id === productId)

        const currentBadges: string[] = Array.isArray(product?.metadata?.badges)
            ? (product.metadata.badges as string[])
            : []

        let newBadges: string[]
        if (enabled) {
            // Enforce max_badges limit
            const limitCheck = checkLimit(appConfig.planLimits, 'max_badges', currentBadges.length)
            if (!limitCheck.allowed) {
                return { success: false, error: buildLimitError('max_badges', limitCheck) }
            }
            newBadges = [...new Set([...currentBadges, badgeId])]
        } else {
            newBadges = currentBadges.filter((b) => b !== badgeId)
        }

        const success = await updateProductMetadata(productId, {
            ...(product?.metadata ?? {}),
            badges: newBadges,
        }, scope)

        if (!success) {
            return { success: false, error: 'Failed to update product metadata' }
        }

        revalidatePanel('all')
        logOwnerAction(tenantId, 'badge.toggle', { productId, badgeId, enabled, badgeCount: newBadges.length })
        return { success: true }
    } catch (err) {
        logger.error('[panel/badges] Toggle failed:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ---------------------------------------------------------------------------
// Set all badges for a product at once
// ---------------------------------------------------------------------------

export async function setBadges(
    productId: string,
    badges: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
        const parsed = SetBadgesSchema.safeParse({ productId, badges })
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }

        const scope = await getTenantMedusaScope(tenantId)

        // Enforce max_badges limit
        const limitCheck = checkLimit(appConfig.planLimits, 'max_badges', badges.length)
        if (!limitCheck.allowed) {
            return { success: false, error: buildLimitError('max_badges', limitCheck) }
        }

        const { products } = await getAdminProducts({ limit: 100 }, scope)
        const product = products.find((p) => p.id === productId)

        const success = await updateProductMetadata(productId, {
            ...(product?.metadata ?? {}),
            badges,
        }, scope)

        if (!success) {
            return { success: false, error: 'Failed to update product metadata' }
        }

        revalidatePanel('all')
        logOwnerAction(tenantId, 'badge.set', { productId, badges, badgeCount: badges.length })
        return { success: true }
    } catch (err) {
        logger.error('[panel/badges] Set failed:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
