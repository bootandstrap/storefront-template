/**
 * Tenant Slug Resolver
 *
 * Resolves the tenant's slug from environment or database.
 * The slug is used as a namespace prefix in Supabase Storage.
 *
 * Priority:
 * 1. STORE_DOMAIN env var → extract slug (e.g., campifruit.bootandstrap.com → campifruit)
 * 2. Supabase tenants table → query by tenant_id
 * 3. Fallback: first 8 chars of tenant_id
 */
import 'server-only'
import { createHash } from 'node:crypto'

/** Cache for tenant slugs (process-level) */
const slugCache = new Map<string, string>()
const SAFE_STORAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeStorageSlug(candidate: string | null | undefined): string | null {
    const normalized = candidate?.trim().toLowerCase()
    return normalized && SAFE_STORAGE_SLUG.test(normalized) ? normalized : null
}

/**
 * Resolve tenant slug for storage namespacing.
 */
export async function getTenantSlug(tenantId: string): Promise<string> {
    // Check cache first
    const cached = slugCache.get(tenantId)
    if (cached) return cached

    // 1. Try STORE_DOMAIN env var
    const storeDomain = process.env.STORE_DOMAIN
    if (storeDomain) {
        // "campifruit.bootandstrap.com" → "campifruit"
        const slug = normalizeStorageSlug(storeDomain.split('.')[0])
        if (slug) {
            slugCache.set(tenantId, slug)
            return slug
        }
    }

    // 2. Try querying the tenants table
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
            .from('tenants')
            .select('slug')
            .eq('id', tenantId)
            .single() as { data: { slug: string } | null }

        const databaseSlug = normalizeStorageSlug(data?.slug)
        if (databaseSlug) {
            slugCache.set(tenantId, databaseSlug)
            return databaseSlug
        }
    } catch {
        // fail silently
    }

    // 3. Fallback: first 8 chars of tenant ID
    const safeTenantId = normalizeStorageSlug(tenantId)
    const fallback = safeTenantId?.slice(0, 8)
        ?? createHash('sha256').update(tenantId).digest('hex').slice(0, 12)
    slugCache.set(tenantId, fallback)
    return fallback
}
