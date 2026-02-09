'use server'

import { requirePanelAuth } from '@/lib/panel-auth'
import { getAdminProducts, updateProductMetadata } from '@/lib/medusa/admin'
import { revalidatePath } from 'next/cache'

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
        await requirePanelAuth()
        const { products } = await getAdminProducts({ limit: 100 })

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
        console.error('[panel/badges] Fetch failed:', err)
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
        await requirePanelAuth()

        // Get current product metadata via admin API
        const { products } = await getAdminProducts({ limit: 1, offset: 0 })
        // Re-fetch this specific product to get current badges
        const currentRes = await getAdminProducts({ limit: 100 })
        const product = currentRes.products.find((p) => p.id === productId)

        const currentBadges: string[] = Array.isArray(product?.metadata?.badges)
            ? (product.metadata.badges as string[])
            : []

        let newBadges: string[]
        if (enabled) {
            newBadges = [...new Set([...currentBadges, badgeId])]
        } else {
            newBadges = currentBadges.filter((b) => b !== badgeId)
        }

        const success = await updateProductMetadata(productId, {
            ...(product?.metadata ?? {}),
            badges: newBadges,
        })

        if (!success) {
            return { success: false, error: 'Failed to update product metadata' }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/badges] Toggle failed:', err)
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
        await requirePanelAuth()

        const { products } = await getAdminProducts({ limit: 100 })
        const product = products.find((p) => p.id === productId)

        const success = await updateProductMetadata(productId, {
            ...(product?.metadata ?? {}),
            badges,
        })

        if (!success) {
            return { success: false, error: 'Failed to update product metadata' }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/badges] Set failed:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
