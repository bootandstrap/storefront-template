'use server'

import { revalidatePath } from 'next/cache'
import { clearCachedConfig } from '@/lib/config'

/**
 * Standardized revalidation helper for Owner Panel mutations.
 *
 * Strategy:
 * - "panel" scope: revalidates the panel layout (all panel pages)
 * - "storefront" scope: revalidates the storefront layout (all public pages)
 * - "all" scope (default): both panel + storefront
 *
 * IMPORTANT: For "storefront" and "all" scopes, also clears the globalThis
 * in-memory config cache. Without this, getConfig() serves stale data for
 * up to 5 minutes even after revalidatePath — same class of bug as the
 * SuperAdmin cache revalidation issue (fixed in config.ts).
 *
 * Use "panel" when the mutation only affects panel UI (e.g., carousel order change).
 * Use "storefront" for storefront-only changes (rare from panel).
 * Use "all" for anything that affects both (products, categories, config, etc.).
 */
export async function revalidatePanel(
    scope: 'panel' | 'storefront' | 'all' = 'all'
) {
    if (scope === 'panel' || scope === 'all') {
        // Revalidates the entire panel layout tree (dashboard, catalogo, pedidos, etc.)
        revalidatePath('/[lang]/panel', 'layout')
    }
    if (scope === 'storefront' || scope === 'all') {
        // Revalidates all storefront pages (homepage products, category pages, etc.)
        revalidatePath('/[lang]', 'layout')
        // Clear in-memory globalThis config cache (critical — without this,
        // getConfig() continues serving stale data for up to 5 min)
        clearCachedConfig()
    }
}
