import 'server-only'

import { clearCachedConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import type {
    Bns360RrssConfig,
    Bns360RrssConfigUpdate,
    Bns360RrssPrimaryClient,
    Bns360RrssPublicRoute,
} from '@/lib/bns-360/rrss-primary-journey'

interface RrssConfigRow {
    social_facebook: string | null
    social_instagram: string | null
}

export function createBns360RrssPrimaryClient(
    tenantId: string,
    baseUrl: string
): Bns360RrssPrimaryClient {
    return {
        async readConfig() {
            return readRrssConfig(tenantId)
        },

        async updateConfig(updates) {
            await updateRrssConfig(tenantId, updates)
        },

        async readPublicRoute(path) {
            return readPublicRoute(baseUrl, path)
        },
    }
}

async function readRrssConfig(tenantId: string): Promise<Bns360RrssConfig> {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('config')
        .select('social_facebook,social_instagram')
        .eq('tenant_id', tenantId)
        .single()

    if (error) {
        throw new Error(`RRSS config read failed: ${error.message}`)
    }

    return normalizeRrssConfig(data as RrssConfigRow)
}

function normalizeRrssConfig(config: RrssConfigRow): Bns360RrssConfig {
    return {
        socialFacebook: config.social_facebook ?? null,
        socialInstagram: config.social_instagram ?? null,
    }
}

async function updateRrssConfig(
    tenantId: string,
    updates: Bns360RrssConfigUpdate
): Promise<void> {
    const payload = toConfigPayload(updates)
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: existingError } = await (supabase as any)
        .from('config')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1)
        .single()

    if (existingError) {
        throw new Error(`RRSS config lookup failed: ${existingError.message}`)
    }
    if (!existing?.id) {
        throw new Error('RRSS config lookup returned no row')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('config')
        .update(payload)
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)
        .select('tenant_id')

    if (error) {
        throw new Error(error.message)
    }
    if (!data || data.length === 0) {
        throw new Error('RRSS config update affected zero rows')
    }

    clearCachedConfig()
}

async function readPublicRoute(baseUrl: string, path: string): Promise<Bns360RrssPublicRoute> {
    const publicUrl = new URL(path, baseUrl)
    let response: Response
    try {
        response = await fetchRrssRender(publicUrl, path, publicUrl)
    } catch {
        const loopbackUrl = new URL(path, `http://127.0.0.1:${process.env.PORT || '3000'}`)
        response = await fetchRrssRender(loopbackUrl, path, publicUrl)
    }
    const html = await response.text().catch(() => '')

    return {
        path,
        status: response.status,
        sameAs: extractSameAs(html),
    }
}

async function fetchRrssRender(url: URL, path: string, publicUrl: URL): Promise<Response> {
    return fetch(url, {
        cache: 'no-store',
        headers: {
            'x-bns-360-probe': 'rrss-primary',
            'x-invoke-path': path,
            'x-matched-path': path,
            host: publicUrl.host,
            'x-forwarded-host': publicUrl.host,
            'x-forwarded-proto': publicUrl.protocol.replace(':', ''),
        },
    })
}

function toConfigPayload(updates: Bns360RrssConfigUpdate): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    if ('socialFacebook' in updates) payload.social_facebook = updates.socialFacebook ?? null
    if ('socialInstagram' in updates) payload.social_instagram = updates.socialInstagram ?? null
    return payload
}

function extractSameAs(html: string): string[] {
    const sameAs = new Set<string>()
    const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    for (const match of html.matchAll(scriptPattern)) {
        const parsed = parseJsonLd(match[1])
        collectSameAs(parsed, sameAs)
    }
    return [...sameAs]
}

function parseJsonLd(raw: string): unknown {
    try {
        return JSON.parse(raw.trim())
    } catch {
        return null
    }
}

function collectSameAs(value: unknown, sameAs: Set<string>): void {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
        for (const item of value) collectSameAs(item, sameAs)
        return
    }

    const record = value as Record<string, unknown>
    const sameAsValue = record.sameAs
    if (Array.isArray(sameAsValue)) {
        for (const item of sameAsValue) {
            if (typeof item === 'string') sameAs.add(item)
        }
    } else if (typeof sameAsValue === 'string') {
        sameAs.add(sameAsValue)
    }
}
