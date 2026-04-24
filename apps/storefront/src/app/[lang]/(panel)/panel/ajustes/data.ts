/**
 * Ajustes — Server-side data fetchers
 *
 * RSC Slot data layer for the Settings hub.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfigForTenant } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withPanelGuard } from '@/lib/panel-guard'
import { getActiveModulesForTenant } from '@/lib/active-modules'
import { SUPPORTED_CURRENCY_COUNT } from '@/lib/i18n/currencies'

// ── Store Config Data ─────────────────────────────────────────────────────

export async function fetchStoreConfigData(tenantId: string, lang: string) {
    const { config, featureFlags, planLimits } = await getConfigForTenant(tenantId)

    // Normalize active languages/currencies for the unified RegionLocalePanel
    const rawLangs = config.active_languages
    const defaultLang = config.language ?? 'es'
    const parsedLangs: string[] = Array.isArray(rawLangs)
        ? rawLangs
        : typeof rawLangs === 'string'
            ? (() => { try { const p = JSON.parse(rawLangs); return Array.isArray(p) ? p : [rawLangs] } catch { return [rawLangs] } })()
            : [defaultLang]
    const activeLanguages = parsedLangs.includes(defaultLang)
        ? parsedLangs
        : [defaultLang, ...parsedLangs]

    const rawCurrencies = config.active_currencies
    const activeCurrencies: string[] = Array.isArray(rawCurrencies)
        ? rawCurrencies
        : typeof rawCurrencies === 'string'
            ? (() => { try { const p = JSON.parse(rawCurrencies); return Array.isArray(p) ? p : [rawCurrencies] } catch { return [rawCurrencies] } })()
            : [config.default_currency ?? 'eur']

    const panelLang = (config as Record<string, unknown>).panel_language as string | null ?? config.language ?? 'es'

    return {
        config,
        featureFlags,
        lang,
        i18nData: {
            activeLanguages,
            activeCurrencies,
            maxLanguages: planLimits.max_languages ?? 1,
            maxCurrencies: Math.min(planLimits.max_currencies ?? 1, SUPPORTED_CURRENCY_COUNT),
            panelLang,
        },
    }
}

// ── I18n Data ─────────────────────────────────────────────────────────────

export async function fetchI18nData(tenantId: string, lang: string) {
    const { config, planLimits } = await getConfigForTenant(tenantId)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Normalize languages
    const rawLangs = config.active_languages
    const defaultLang = config.language ?? 'es'
    const parsedLangs: string[] = Array.isArray(rawLangs)
        ? rawLangs
        : typeof rawLangs === 'string'
            ? (() => { try { const p = JSON.parse(rawLangs); return Array.isArray(p) ? p : [rawLangs] } catch { return [rawLangs] } })()
            : [defaultLang]
    const activeLanguages = parsedLangs.includes(defaultLang)
        ? parsedLangs
        : [defaultLang, ...parsedLangs]

    // Normalize currencies
    const rawCurrencies = config.active_currencies
    const activeCurrencies: string[] = Array.isArray(rawCurrencies)
        ? rawCurrencies
        : typeof rawCurrencies === 'string'
            ? (() => { try { const p = JSON.parse(rawCurrencies); return Array.isArray(p) ? p : [rawCurrencies] } catch { return [rawCurrencies] } })()
            : [config.default_currency ?? 'eur']

    const data = {
        activeLanguages,
        activeCurrencies,
        defaultCurrency: config.default_currency ?? 'eur',
        defaultLanguage: config.language ?? 'es',
        maxLanguages: planLimits.max_languages ?? 5,
        maxCurrencies: Math.min(planLimits.max_currencies ?? 3, SUPPORTED_CURRENCY_COUNT),
    }

    const panelLang = (config as Record<string, unknown>).panel_language as string | null ?? config.language ?? 'es'

    const labels = {
        activeLanguages: t('panel.i18n.activeLanguages'),
        activeCurrencies: t('panel.i18n.activeCurrencies'),
        defaultLanguage: t('panel.i18n.defaultLanguage'),
        defaultCurrency: t('panel.i18n.defaultCurrency'),
        translationProgress: t('panel.i18n.translationProgress'),
        currencyConfig: t('panel.i18n.currencyConfig'),
        languageSettings: t('panel.i18n.languageSettings'),
        usageOf: t('panel.i18n.usageOf'),
        addLanguage: t('panel.i18n.addLanguage'),
        addCurrency: t('panel.i18n.addCurrency'),
        tabLanguages: t('panel.i18n.tabLanguages'),
        tabCurrencies: t('panel.i18n.tabCurrencies'),
        tabTranslations: t('panel.i18n.tabTranslations'),
        panelLanguage: t('panel.i18n.panelLanguage'),
        panelLangDescription: t('panel.i18n.panelLangDescription'),
        saveSuccess: t('panel.i18n.saveSuccess'),
        saveError: t('panel.i18n.saveError'),
        limitReached: t('panel.i18n.limitReached'),
        upgradePrompt: t('panel.i18n.upgradePrompt'),
        cannotDeactivateLast: t('panel.i18n.cannotDeactivateLast'),
    }

    return { data, labels, panelLang, lang }
}

// ── Subscription Data ─────────────────────────────────────────────────────

export async function fetchSubscriptionData(tenantId: string, lang: string) {
    const supabase = await createClient()
    const { tenantStatus, maintenanceDaysRemaining } = (await withPanelGuard()).appConfig

    const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', tenantId)
        .single()

    const hasStripeCustomer = !!tenant?.stripe_customer_id
    const activeModuleOrders = await getActiveModulesForTenant(tenantId)

    return {
        activeModuleOrders,
        tenantStatus,
        maintenanceDaysRemaining,
        hasStripeCustomer,
        lang,
    }
}

// ── Project Data ──────────────────────────────────────────────────────────

export async function fetchProjectData(tenantId: string, lang: string) {
    const supabase = await createClient()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const { data: project } = await supabase
        .from('project_phases')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

    return { project, lang, t }
}

// ── WiFi QR Data ──────────────────────────────────────────────────────────

export async function fetchWifiData(tenantId: string) {
    const { config } = await getConfigForTenant(tenantId)
    return { businessName: config.business_name || '' }
}
