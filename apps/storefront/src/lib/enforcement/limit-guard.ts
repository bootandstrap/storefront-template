/**
 * Limit Guard — Server-side resource enforcement against plan_limits
 *
 * Checks if a tenant can create more of a given resource by comparing
 * current usage against their governance plan_limits.
 *
 * Usage:
 *   const check = await checkResourceLimit(tenantId, 'products')
 *   if (!check.allowed) {
 *       return NextResponse.json({
 *           error: 'limit_exceeded',
 *           resource: 'products',
 *           current: check.current,
 *           limit: check.limit,
 *       }, { status: 403 })
 *   }
 *
 * @module enforcement/limit-guard
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ── Resource Definitions ──────────────────────────────────────────────

interface ResourceDef {
    /** Plan limit key in plan_limits table */
    limitKey: string
    /** How to count current usage */
    counter: (tenantId: string) => Promise<number>
    /** Human-readable label (fallback) */
    label: string
}

/** Count via Medusa Admin API */
async function countMedusaResource(endpoint: string): Promise<number> {
    const medusaUrl = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const apiKey = process.env.MEDUSA_API_KEY || ''
    try {
        const res = await fetch(`${medusaUrl}${endpoint}`, {
            headers: {
                'x-medusa-access-token': apiKey,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return 0
        const data = await res.json()
        return data.count ?? data.total ?? 0
    } catch {
        return 0 // Fail-open: if Medusa is down, don't block the owner
    }
}

/** Count via Supabase */
async function countSupabaseResource(
    table: string,
    tenantId: string,
    extra?: { column?: string; since?: Date },
): Promise<number> {
    const admin = createAdminClient()
    try {
        let query = (admin as any).from(table).select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
        if (extra?.since) {
            query = query.gte('created_at', extra.since.toISOString())
        }
        const { count } = await query
        return count ?? 0
    } catch {
        return 0
    }
}

// ── Resource Registry ─────────────────────────────────────────────────

const RESOURCE_DEFS: Record<string, ResourceDef> = {
    products: {
        limitKey: 'max_products',
        counter: () => countMedusaResource('/admin/products?limit=0&offset=0'),
        label: 'Productos',
    },
    categories: {
        limitKey: 'max_categories',
        counter: () => countMedusaResource('/admin/product-categories?limit=0&offset=0'),
        label: 'Categorías',
    },
    cms_pages: {
        limitKey: 'max_cms_pages',
        counter: (tid) => countSupabaseResource('cms_pages', tid),
        label: 'Páginas CMS',
    },
    badges: {
        limitKey: 'max_badges',
        counter: (tid) => countSupabaseResource('product_badges', tid),
        label: 'Insignias',
    },
    carousel_slides: {
        limitKey: 'max_carousel_slides',
        counter: (tid) => countSupabaseResource('carousel_slides', tid),
        label: 'Slides del carrusel',
    },
    promotions: {
        limitKey: 'max_promotions_active',
        counter: () => countMedusaResource('/admin/promotions?limit=0&offset=0'),
        label: 'Promociones activas',
    },
    customers: {
        limitKey: 'max_customers',
        counter: () => countMedusaResource('/admin/customers?limit=0&offset=0'),
        label: 'Clientes',
    },
    admin_users: {
        limitKey: 'max_admin_users',
        counter: () => countMedusaResource('/admin/users?limit=0&offset=0'),
        label: 'Usuarios admin',
    },
    newsletter_subscribers: {
        limitKey: 'max_newsletter_subscribers',
        counter: (tid) => countSupabaseResource('newsletter_subscribers', tid),
        label: 'Suscriptores newsletter',
    },
    crm_contacts: {
        limitKey: 'max_crm_contacts',
        counter: (tid) => countSupabaseResource('crm_contacts', tid),
        label: 'Contactos CRM',
    },
    automations: {
        limitKey: 'max_automations',
        counter: (tid) => countSupabaseResource('automation_rules', tid),
        label: 'Automatizaciones',
    },
}

export type ResourceKey = keyof typeof RESOURCE_DEFS

// ── Types ─────────────────────────────────────────────────────────────

export interface LimitCheckResult {
    /** Whether the tenant is allowed to create more of this resource */
    allowed: boolean
    /** Current count */
    current: number
    /** Plan limit (Infinity if no limit set) */
    limit: number
    /** Usage percentage (0-100) */
    percentage: number
    /** Resource label */
    label: string
    /** Plan limit key */
    limitKey: string
    /** True if approaching limit (>80%) */
    warning: boolean
}

// ── Main Guard Function ───────────────────────────────────────────────

/**
 * Check if a tenant can create more of a given resource.
 *
 * Reads `plan_limits` from Supabase, counts current usage,
 * and returns a structured result.
 *
 * Fail-open: if counts or limits can't be fetched, allows the action.
 */
export async function checkResourceLimit(
    tenantId: string,
    resource: ResourceKey,
): Promise<LimitCheckResult> {
    const def = RESOURCE_DEFS[resource]
    if (!def) {
        return { allowed: true, current: 0, limit: Infinity, percentage: 0, label: resource, limitKey: '', warning: false }
    }

    // Fetch plan limit
    const admin = createAdminClient()
    let limitValue = Infinity
    try {
        const { data } = await (admin as any)
            .from('plan_limits')
            .select(def.limitKey)
            .eq('tenant_id', tenantId)
            .single()
        if (data && data[def.limitKey] != null) {
            limitValue = Number(data[def.limitKey])
        }
    } catch {
        // Fail-open: no limit found → allow
    }

    // Count current
    const current = await def.counter(tenantId)

    const percentage = limitValue > 0 && limitValue !== Infinity
        ? Math.round((current / limitValue) * 100)
        : 0

    return {
        allowed: limitValue === Infinity || current < limitValue,
        current,
        limit: limitValue,
        percentage,
        label: def.label,
        limitKey: def.limitKey,
        warning: percentage >= 80,
    }
}

/**
 * Check multiple resource limits at once.
 * Useful for dashboard usage overview.
 */
export async function checkMultipleResourceLimits(
    tenantId: string,
    resources: ResourceKey[],
): Promise<Record<string, LimitCheckResult>> {
    const results = await Promise.all(
        resources.map(async (r) => [r, await checkResourceLimit(tenantId, r)] as const)
    )
    return Object.fromEntries(results)
}

/**
 * Get all available resource keys.
 */
export function getResourceKeys(): ResourceKey[] {
    return Object.keys(RESOURCE_DEFS) as ResourceKey[]
}
