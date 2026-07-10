import 'server-only'

import { clearCachedConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import type {
    Bns360I18nConfig,
    Bns360I18nConfigUpdate,
    Bns360I18nPrimaryClient,
    Bns360I18nPublicRoute,
} from '@/lib/bns-360/i18n-primary-journey'

interface I18nConfigRow {
    language: string | null
    storefront_language: string | null
    active_languages: string[] | null
    default_currency: string | null
    active_currencies: string[] | null
    timezone: string | null
}

interface I18nPlanLimitsRow {
    max_languages: number | null
    max_currencies: number | null
}

export function createBns360I18nPrimaryClient(
    tenantId: string,
    baseUrl: string
): Bns360I18nPrimaryClient {
    return {
        async readConfig() {
            return readI18nConfig(tenantId)
        },

        async updateConfig(updates) {
            await updateI18nConfig(tenantId, updates)
        },

        async readPublicRoute(path) {
            return readPublicRoute(baseUrl, path)
        },
    }
}

async function readI18nConfig(tenantId: string): Promise<Bns360I18nConfig> {
    const supabase = await createClient()

    const [configResult, limitsResult] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
            .from('config')
            .select('language,storefront_language,active_languages,default_currency,active_currencies,timezone')
            .eq('tenant_id', tenantId)
            .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
            .from('plan_limits')
            .select('max_languages,max_currencies')
            .eq('tenant_id', tenantId)
            .single(),
    ])

    if (configResult.error) {
        throw new Error(`i18n config read failed: ${configResult.error.message}`)
    }
    if (limitsResult.error) {
        throw new Error(`i18n plan limits read failed: ${limitsResult.error.message}`)
    }

    return normalizeI18nConfig(
        configResult.data as I18nConfigRow,
        limitsResult.data as I18nPlanLimitsRow
    )
}

function normalizeI18nConfig(config: I18nConfigRow, limits: I18nPlanLimitsRow): Bns360I18nConfig {
    return {
        language: config.language ?? null,
        storefrontLanguage: config.storefront_language ?? null,
        activeLanguages: config.active_languages ?? [],
        defaultCurrency: config.default_currency ?? null,
        activeCurrencies: config.active_currencies ?? [],
        timezone: config.timezone ?? null,
        maxLanguages: limits.max_languages ?? null,
        maxCurrencies: limits.max_currencies ?? null,
    }
}

async function updateI18nConfig(
    tenantId: string,
    updates: Bns360I18nConfigUpdate
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
        throw new Error(`i18n config lookup failed: ${existingError.message}`)
    }
    if (!existing?.id) {
        throw new Error('i18n config lookup returned no row')
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
        throw new Error('i18n config update affected zero rows')
    }

    clearCachedConfig()
}

async function readPublicRoute(baseUrl: string, path: string): Promise<Bns360I18nPublicRoute> {
    const publicUrl = new URL(path, baseUrl)
    let response: Response
    try {
        response = await fetchI18nRender(publicUrl, path, publicUrl)
    } catch {
        const loopbackUrl = new URL(path, `http://127.0.0.1:${process.env.PORT || '3000'}`)
        response = await fetchI18nRender(loopbackUrl, path, publicUrl)
    }
    const html = await response.text().catch(() => '')

    return {
        path,
        status: response.status,
        htmlLang: extractHtmlLang(html),
    }
}

async function fetchI18nRender(url: URL, path: string, publicUrl: URL): Promise<Response> {
    return fetch(url, {
        cache: 'no-store',
        headers: {
            'x-bns-360-probe': 'i18n-primary',
            'x-invoke-path': path,
            'x-matched-path': path,
            host: publicUrl.host,
            'x-forwarded-host': publicUrl.host,
            'x-forwarded-proto': publicUrl.protocol.replace(':', ''),
        },
    })
}

function toConfigPayload(updates: Bns360I18nConfigUpdate): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    if ('language' in updates) payload.language = updates.language ?? null
    if ('storefrontLanguage' in updates) payload.storefront_language = updates.storefrontLanguage ?? null
    if ('activeLanguages' in updates) payload.active_languages = updates.activeLanguages ?? []
    if ('defaultCurrency' in updates) payload.default_currency = updates.defaultCurrency ?? null
    if ('activeCurrencies' in updates) payload.active_currencies = updates.activeCurrencies ?? []
    if ('timezone' in updates) payload.timezone = updates.timezone ?? null
    return payload
}

function extractHtmlLang(html: string): string | null {
    return html.match(/<html[^>]*\slang=["']([^"']+)["']/i)?.[1] ?? null
}
