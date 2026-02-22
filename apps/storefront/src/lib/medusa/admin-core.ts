/**
 * Medusa Admin API — Core Infrastructure
 *
 * Authentication, JWT caching, base fetcher, and tenant scoping helpers.
 * All domain-specific admin modules import from here.
 *
 * Required env vars:
 *   MEDUSA_BACKEND_URL      — e.g. http://localhost:9000
 *   MEDUSA_ADMIN_EMAIL      — admin user email (default: admin@medusajs.com)
 *   MEDUSA_ADMIN_PASSWORD   — admin user password
 */
import { type TenantMedusaScope } from './tenant-scope'

export type { TenantMedusaScope } from './tenant-scope'

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusajs.com'
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

if (!MEDUSA_ADMIN_PASSWORD) {
    console.error('[medusa-admin] CRITICAL: MEDUSA_ADMIN_PASSWORD env var is not set. Owner Panel will not work.')
}

// ---------------------------------------------------------------------------
// JWT token cache (globalThis — survives Turbopack module re-evaluation)
// ---------------------------------------------------------------------------

const TOKEN_TTL_MS = 23 * 60 * 60 * 1000 // 23 hours

const gMedusa = globalThis as unknown as {
    __medusaAdminToken?: string | null
    __medusaTokenExpiry?: number
}

async function getAdminToken(): Promise<string> {
    const now = Date.now()
    if (gMedusa.__medusaAdminToken && now < (gMedusa.__medusaTokenExpiry ?? 0)) {
        return gMedusa.__medusaAdminToken
    }

    try {
        const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: MEDUSA_ADMIN_EMAIL,
                password: MEDUSA_ADMIN_PASSWORD,
            }),
            cache: 'no-store',
        })

        if (!res.ok) {
            const body = await res.text()
            console.error('[medusa-admin] Auth failed:', res.status, body)
            throw new Error(`Medusa auth failed: ${res.status}`)
        }

        const { token } = await res.json()
        gMedusa.__medusaAdminToken = token
        gMedusa.__medusaTokenExpiry = now + TOKEN_TTL_MS
        return token
    } catch (err) {
        console.error('[medusa-admin] Auth error:', err)
        throw new Error('Failed to authenticate with Medusa Admin API')
    }
}

// ---------------------------------------------------------------------------
// Admin list params
// ---------------------------------------------------------------------------

export interface AdminListParams {
    limit?: number
    offset?: number
    q?: string
    status?: string
}

export function normalizeAdminListParams(params?: AdminListParams): {
    limit: number
    offset: number
    q: string | undefined
    status: string | undefined
} {
    const rawLimit = params?.limit ?? 20
    const rawOffset = params?.offset ?? 0
    const q = params?.q?.trim() || undefined
    const status = params?.status?.trim() || undefined
    const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 20))
    const offset = Math.max(0, Number.isFinite(rawOffset) ? Math.floor(rawOffset) : 0)

    return { limit, offset, q, status }
}

// ---------------------------------------------------------------------------
// Tenant scoping helpers
// ---------------------------------------------------------------------------

export function assertScope(scope: TenantMedusaScope | null | undefined): TenantMedusaScope | null {
    if (!scope || !scope.tenantId) {
        return null
    }
    return scope
}

export async function resolveScope(scope?: TenantMedusaScope | null): Promise<TenantMedusaScope | null> {
    return assertScope(scope ?? null)
}

export function buildScopedAdminHeaders(scopeInput: TenantMedusaScope | null): Record<string, string> {
    const scope = assertScope(scopeInput)
    if (!scope) return {}
    const headers: Record<string, string> = {
        'x-tenant-id': scope.tenantId,
    }
    if (scope.medusaSalesChannelId) {
        headers['x-medusa-sales-channel-id'] = scope.medusaSalesChannelId
    }
    return headers
}

export function buildScopedAdminPath(path: string, scopeInput: TenantMedusaScope | null): string {
    const scope = assertScope(scopeInput)
    if (!scope || !scope.medusaSalesChannelId) return path
    if (!path.startsWith('/admin/products?')) {
        return path
    }
    const [basePath, query = ''] = path.split('?')
    const queryParams = new URLSearchParams(query)
    if (!queryParams.get('sales_channel_id')) {
        queryParams.set('sales_channel_id', scope.medusaSalesChannelId)
    }
    return `${basePath}?${queryParams.toString()}`
}

// ---------------------------------------------------------------------------
// Base fetcher with JWT auth
// ---------------------------------------------------------------------------

export interface MedusaAdminResponse<T> {
    data: T | null
    error: string | null
}

export async function adminFetch<T>(
    path: string,
    options: RequestInit = {},
    scope?: TenantMedusaScope | null
): Promise<MedusaAdminResponse<T>> {
    try {
        const tenantScope = await resolveScope(scope)
        const token = await getAdminToken()
        const method = (options.method ?? 'GET').toUpperCase()
        const scopedPath = method === 'GET' ? buildScopedAdminPath(path, tenantScope) : path
        const scopeHeaders = buildScopedAdminHeaders(tenantScope)

        const res = await fetch(`${MEDUSA_BACKEND_URL}${scopedPath}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...scopeHeaders,
                ...options.headers,
            },
            cache: 'no-store',
        })

        if (res.status === 401) {
            // Token expired — clear cache and retry once
            gMedusa.__medusaAdminToken = null
            gMedusa.__medusaTokenExpiry = 0
            const freshToken = await getAdminToken()
            const retryRes = await fetch(`${MEDUSA_BACKEND_URL}${scopedPath}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${freshToken}`,
                    ...scopeHeaders,
                    ...options.headers,
                },
                cache: 'no-store',
            })
            if (!retryRes.ok) {
                const errBody = await retryRes.text()
                console.error('[medusa-admin] Retry failed:', retryRes.status, errBody)
                return { data: null, error: `Medusa Admin API error: ${retryRes.status} — ${errBody}` }
            }
            const json = await retryRes.json()
            return { data: json, error: null }
        }

        if (!res.ok) {
            const errBody = await res.text()
            console.error('[medusa-admin] Request failed:', res.status, errBody)
            return { data: null, error: `Medusa Admin API error: ${res.status} — ${errBody}` }
        }

        const json = await res.json()
        return { data: json, error: null }
    } catch (err) {
        console.error('[medusa-admin]', err)
        return { data: null, error: 'Failed to connect to Medusa Admin API' }
    }
}

// ---------------------------------------------------------------------------
// File Upload (used by products, independent of domains)
// ---------------------------------------------------------------------------

const MEDUSA_BACKEND_URL_FOR_UPLOAD = MEDUSA_BACKEND_URL

export async function uploadFiles(
    files: File[]
): Promise<{ files: { id: string; url: string }[]; error: string | null }> {
    try {
        const token = await getAdminToken()
        const formData = new FormData()
        files.forEach((f) => formData.append('files', f))

        const res = await fetch(`${MEDUSA_BACKEND_URL_FOR_UPLOAD}/admin/uploads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        })

        if (!res.ok) {
            const errBody = await res.text()
            console.error('[medusa-admin] Upload failed:', res.status, errBody)
            return { files: [], error: `Upload failed: ${res.status}` }
        }

        const json = await res.json()
        return { files: json.files ?? [], error: null }
    } catch (err) {
        console.error('[medusa-admin] Upload error:', err)
        return { files: [], error: err instanceof Error ? err.message : 'Upload failed' }
    }
}
