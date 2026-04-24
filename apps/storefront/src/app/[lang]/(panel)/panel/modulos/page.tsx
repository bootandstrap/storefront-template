/**
 * Módulos — Modules Hub (SOTA Redesign)
 *
 * RSC Slot pattern with dynamic tabs based on active modules.
 *
 * Default tab: marketplace (always visible).
 * Additional tabs appear for each activated module.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getModuleTabs } from '@/lib/panel-policy'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Blocks } from 'lucide-react'
import ModulosShell from './ModulosShell'
import ModulesMarketplaceClient from './ModulesMarketplaceClient'
import { fetchMarketplaceData } from './data'
import { loadModuleTab } from './module-tab-loader'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.modules.title') || 'Módulos' }
}

export default async function ModulosPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { lang } = await params
    const rawSearchParams = await searchParams
    const tab = typeof rawSearchParams.tab === 'string' ? rawSearchParams.tab : undefined
    const { appConfig, tenantId } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const tabs = getModuleTabs(featureFlags)
    const activeTab = tab && tabs.some(tb => tb.key === tab) ? tab : 'marketplace'

    const tabsWithLabels = tabs.map(tb => ({
        ...tb,
        label: t(tb.label as keyof typeof dictionary) || tb.label,
    }))

    // ── RSC Slot: fetch only the active tab's data ──
    let tabContent: React.ReactNode

    if (activeTab === 'marketplace') {
        const data = await fetchMarketplaceData(tenantId, lang)
        tabContent = (
            <ModulesMarketplaceClient
                catalog={data.catalog}
                activeModules={data.activeModules}
                monthlySpend={data.monthlySpend}
                locale={lang}
                recentlyActivated={data.recentlyActivated}
                labels={{
                    title: data.t('panel.modules.title') || 'Módulos',
                    subtitle: data.t('panel.modules.subtitle') || 'Gestiona y amplía las funcionalidades de tu tienda',
                    active: data.t('panel.modules.active') || 'Activo',
                    inactive: data.t('panel.modules.inactive') || 'Disponible',
                    activate: data.t('panel.modules.activate') || 'Activar',
                    upgrade: data.t('panel.modules.upgrade') || 'Mejorar',
                    manage: data.t('panel.modules.manage') || 'Gestionar',
                    monthly: data.t('panel.modules.monthly') || '/mes',
                    free: data.t('panel.modules.free') || 'Gratis',
                    recommended: data.t('panel.modules.recommended') || 'Recomendado',
                    currentPlan: data.t('panel.modules.currentPlan') || 'Plan actual',
                    monthlySpend: data.t('panel.modules.monthlySpend') || 'Gasto mensual en módulos',
                    activeModules: data.t('panel.modules.activeModules') || 'Módulos activos',
                    availableModules: data.t('panel.modules.availableModules') || 'Módulos disponibles',
                    allCategories: data.t('panel.modules.allCategories') || 'Todos',
                    categorySell: data.t('panel.modules.categorySell') || 'Vender',
                    categoryEngage: data.t('panel.modules.categoryEngage') || 'Conectar',
                    categoryGrow: data.t('panel.modules.categoryGrow') || 'Crecer',
                    categoryAutomate: data.t('panel.modules.categoryAutomate') || 'Automatizar',
                    requires: data.t('panel.modules.requires') || 'Requiere',
                    features: data.t('panel.modules.features') || 'Características',
                    contactSupport: data.t('panel.modules.contactSupport') || 'Contactar soporte',
                    viewDetails: data.t('panel.modules.viewDetails') || 'Ver detalles',
                    powerUserTitle: data.t('panel.modules.powerUserTitle') || 'Power User!',
                    powerUserDesc: data.t('panel.modules.powerUserDesc') || '',
                    recentlyActivated: data.t('panel.modules.recentlyActivated') || '¡Recién activado!',
                    noModulesAvailable: data.t('panel.modules.noModulesAvailable') || 'Todos los módulos están activos',
                    treeTitle: data.t('panel.modules.tree.title') || 'Módulos',
                    treeTip: data.t('panel.modules.tree.tip') || 'Scroll para explorar · Clic en un módulo para ver detalles',
                    treeView: data.t('panel.modules.tree.treeView') || 'Mapa',
                    listView: data.t('panel.modules.tree.listView') || 'Lista',
                    treeModules: data.t('panel.modules.tree.modules') || 'Módulos',
                    treeTiers: data.t('panel.modules.tree.tiers') || 'Niveles',
                    treeProgress: data.t('panel.modules.tree.progress') || 'Progreso',
                    treeCategories: data.t('panel.modules.tree.categories') || 'Categorías',
                    treeStates: data.t('panel.modules.tree.states') || 'Estados',
                    treeLocked: data.t('panel.modules.tree.locked') || 'Bloqueado',
                    treeAvailable: data.t('panel.modules.tree.available') || 'Disponible',
                    treeActive: data.t('panel.modules.tree.active') || 'Activo',
                    treeMaxed: data.t('panel.modules.tree.maxed') || 'Máximo',
                }}
            />
        )
    } else {
        // Dynamic module tabs — loaded via centralized loader
        const ModulePage = await loadModuleTab(activeTab)
        tabContent = ModulePage
            ? <ModulePage params={Promise.resolve({ lang })} />
            : null
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.modules.title') || 'Módulos'}
                subtitle={t('panel.modules.subtitle') || 'Gestiona y amplía las funcionalidades de tu tienda'}
                icon={<Blocks className="w-5 h-5" />}
            />
            <ModulosShell
                tabs={tabsWithLabels}
                activeTab={activeTab}
                lang={lang}
            >
                {tabContent}
            </ModulosShell>
        </div>
    )
}
