import 'server-only'

import { clearCachedConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import type {
    Bns360SeoConfig,
    Bns360SeoConfigUpdate,
    Bns360SeoPrimaryClient,
    Bns360SeoPublicRoute,
} from '@/lib/bns-360/seo-primary-journey'

interface SeoConfigRow {
    meta_title: string | null
    meta_description: string | null
}

export function createBns360SeoPrimaryClient(
    tenantId: string,
    baseUrl: string
): Bns360SeoPrimaryClient {
    return {
        async readConfig() {
            return readSeoConfig(tenantId)
        },

        async updateConfig(updates) {
            await updateSeoConfig(tenantId, updates)
        },

        async readPublicRoute(path) {
            return readPublicRoute(baseUrl, path)
        },
    }
}

async function readSeoConfig(tenantId: string): Promise<Bns360SeoConfig> {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('config')
        .select('meta_title,meta_description')
        .eq('tenant_id', tenantId)
        .single()

    if (error) {
        throw new Error(`SEO config read failed: ${error.message}`)
    }

    return normalizeSeoConfig(data as SeoConfigRow)
}

function normalizeSeoConfig(config: SeoConfigRow): Bns360SeoConfig {
    return {
        metaTitle: config.meta_title ?? null,
        metaDescription: config.meta_description ?? null,
    }
}

async function updateSeoConfig(
    tenantId: string,
    updates: Bns360SeoConfigUpdate
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
        throw new Error(`SEO config lookup failed: ${existingError.message}`)
    }
    if (!existing?.id) {
        throw new Error('SEO config lookup returned no row')
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
        throw new Error('SEO config update affected zero rows')
    }

    clearCachedConfig()
}

async function readPublicRoute(baseUrl: string, path: string): Promise<Bns360SeoPublicRoute> {
    const publicUrl = new URL(path, baseUrl)
    let response: Response
    try {
        response = await fetchSeoRender(publicUrl, path, publicUrl)
    } catch {
        const loopbackUrl = new URL(path, `http://127.0.0.1:${process.env.PORT || '3000'}`)
        response = await fetchSeoRender(loopbackUrl, path, publicUrl)
    }
    const html = await response.text().catch(() => '')

    return {
        path,
        status: response.status,
        title: extractTitle(html),
        description: extractMetaContent(html, 'name', 'description'),
        ogTitle: extractMetaContent(html, 'property', 'og:title'),
        ogDescription: extractMetaContent(html, 'property', 'og:description'),
    }
}

async function fetchSeoRender(url: URL, path: string, publicUrl: URL): Promise<Response> {
    return fetch(url, {
        cache: 'no-store',
        headers: {
            'x-bns-360-probe': 'seo-primary',
            'x-invoke-path': path,
            'x-matched-path': path,
            host: publicUrl.host,
            'x-forwarded-host': publicUrl.host,
            'x-forwarded-proto': publicUrl.protocol.replace(':', ''),
        },
    })
}

function toConfigPayload(updates: Bns360SeoConfigUpdate): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    if ('metaTitle' in updates) payload.meta_title = updates.metaTitle ?? null
    if ('metaDescription' in updates) payload.meta_description = updates.metaDescription ?? null
    return payload
}

function extractTitle(html: string): string | null {
    return decodeHtml(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null)
}

function extractMetaContent(html: string, attributeName: string, attributeValue: string): string | null {
    const escapedName = escapeRegExp(attributeName)
    const escapedValue = escapeRegExp(attributeValue)
    const tagPattern = new RegExp(
        `<meta(?=[^>]*\\s${escapedName}=["']${escapedValue}["'])(?=[^>]*\\scontent=["']([^"']*)["'])[^>]*>`,
        'i'
    )

    return decodeHtml(html.match(tagPattern)?.[1] ?? null)
}

function decodeHtml(value: string | null): string | null {
    if (value === null) return null
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
