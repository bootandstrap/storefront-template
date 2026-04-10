/**
 * Módulos — Server-side data fetchers
 *
 * RSC Slot data layer for the Módulos hub.
 * Each module page has its own data fetching requirements.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getOwnerModuleStatus } from '@/lib/owner-modules'
import { getActiveModulesForTenant } from '@/lib/active-modules'

// ── Marketplace Data ──────────────────────────────────────────────────────

export async function fetchMarketplaceData(tenantId: string, lang: string) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const moduleStatus = await getOwnerModuleStatus(lang)

    let recentlyActivated: string[] = []
    try {
        const activeModules = await getActiveModulesForTenant(tenantId)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        recentlyActivated = activeModules
            .filter(m => new Date(m.activatedAt).getTime() > sevenDaysAgo)
            .map(m => m.moduleKey)
    } catch { /* degrade */ }

    const activeCount = Object.keys(moduleStatus.activeModules).length
    const totalCount = moduleStatus.catalog.filter(m => m.key).length

    return {
        catalog: moduleStatus.catalog,
        activeModules: moduleStatus.activeModules,
        monthlySpend: moduleStatus.monthlySpend,
        recentlyActivated,
        activeCount,
        totalCount,
        lang,
        t,
    }
}
