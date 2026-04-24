'use server'

import { getConfig, getRequiredTenantId } from '@/lib/config'
import { checkLimit } from '@/lib/limits'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSmartRateLimiter } from '@/lib/security/rate-limit-factory'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Rate limiter — 10 checkout attempts per cart per 60 seconds
// ---------------------------------------------------------------------------

const checkoutLimiter = createSmartRateLimiter({
    limit: 10,
    windowMs: 60_000,
    name: 'checkout',
})

export async function checkCheckoutRateLimit(
    cartId: string
): Promise<{ allowed: boolean; error?: string }> {
    const limited = await checkoutLimiter.isLimited(`checkout:${cartId}`)
    if (limited) {
        return {
            allowed: false,
            error: 'Too many checkout attempts. Please wait a moment and try again.',
        }
    }
    return { allowed: true }
}

// ---------------------------------------------------------------------------
// Minimum order amount validation
// ---------------------------------------------------------------------------

export async function validateMinOrderAmount(
    cartId: string
): Promise<{ allowed: boolean; error?: string }> {
    const { config } = await getConfig()
    const minAmount = config.min_order_amount ?? 0
    if (minAmount <= 0) return { allowed: true }

    try {
        const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
        const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

        const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}?fields=total`, {
            headers: {
                'Content-Type': 'application/json',
                ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
            },
        })
        if (!res.ok) throw new Error(`Cart fetch failed: ${res.status}`)
        const data = await res.json()
        const total = data.cart?.total ?? 0

        if (total < minAmount) {
            const formatted = (minAmount / 100).toFixed(2)
            return { allowed: false, error: `Minimum order amount is $${formatted}` }
        }
        return { allowed: true }
    } catch {
        // Fail-closed: block checkout if we can't validate limits
        return { allowed: false, error: 'Service temporarily unavailable. Please try again.' }
    }
}

// ---------------------------------------------------------------------------
// Monthly order limit validation (server-side enforcement, tenant-scoped)
// ---------------------------------------------------------------------------

export async function validateMaxOrdersMonth(): Promise<{ allowed: boolean; error?: string }> {
    try {
        const { planLimits } = await getConfig()
        const limit = planLimits.max_orders_month
        if (!limit || limit <= 0) return { allowed: true }

        // Resolve tenant scope to get the sales_channel_id for this tenant
        const tenantId = getRequiredTenantId()
        const { getTenantMedusaScope } = await import('@/lib/medusa/tenant-scope')
        const scope = await getTenantMedusaScope(tenantId)

        // Count real Medusa orders from this month, scoped to THIS tenant's sales channel
        const supabase = createAdminClient()
        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        let query = supabase
            .from('order')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', firstOfMonth)

        // MANDATORY: scope to tenant's sales channel — fail-closed
        if (!scope?.medusaSalesChannelId) {
            logger.error('[checkout-validation] No sales_channel_id resolved — blocking checkout (fail-closed)')
            return { allowed: false, error: 'Service temporarily unavailable. Please try again.' }
        }
        query = query.eq('sales_channel_id', scope.medusaSalesChannelId)

        const { count } = await query

        const limitCheck = checkLimit(planLimits, 'max_orders_month', count ?? 0)
        if (!limitCheck.allowed) {
            return { allowed: false, error: 'Monthly order limit reached. Please contact support.' }
        }
        return { allowed: true }
    } catch {
        // Fail-closed: block checkout if we can't validate limits
        return { allowed: false, error: 'Service temporarily unavailable. Please try again.' }
    }
}
