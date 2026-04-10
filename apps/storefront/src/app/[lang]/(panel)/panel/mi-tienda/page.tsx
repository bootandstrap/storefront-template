/**
 * Mi Tienda — Store Hub (SOTA Redesign)
 *
 * RSC Slot pattern: reads ?tab= and fetches ONLY the active tab's data.
 * Renders a thin MyStoreShell (tabs) + the tab-specific RSC content.
 *
 * Tabs:
 *   - productos  → CatalogClient (products view)
 *   - categorias → CatalogClient (categories view)
 *   - inventario → InventoryClient
 *   - insignias  → BadgesClient (feature-gated)
 *   - carrusel   → CarouselClient (feature-gated)
 *   - paginas    → PagesClient (feature-gated)
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getMyStoreTabs } from '@/lib/panel-policy'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import FeatureGate from '@/components/ui/FeatureGate'
import { Store } from 'lucide-react'
import MyStoreShell from './MyStoreShell'

// ── Data fetchers ──
import {
    fetchProductsData,
    fetchInventoryData,
    fetchBadgesData,
    fetchCarouselData,
    fetchPagesData,
} from './data'

// ── Client components for each tab ──
import CatalogClient from '../catalogo/CatalogClient'
import InventoryClient from '../inventario/InventoryClient'
import BadgesClient from '../insignias/BadgesClient'
import CarouselClient from '../carrusel/CarouselClient'
import PagesClient from '../paginas/PagesClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.section.myStore') }
}

export default async function MyStorePage({
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

    const tabs = getMyStoreTabs(featureFlags)
    const activeTab = tab && tabs.some(tb => tb.key === tab) ? tab : 'productos'

    // Translate tab labels
    const tabsWithLabels = tabs.map(tb => ({
        ...tb,
        label: t(`panel.tabs.${tb.key === 'productos' ? 'products' : tb.key === 'categorias' ? 'categories' : tb.key === 'inventario' ? 'inventory' : tb.key === 'insignias' ? 'badges' : tb.key === 'carrusel' ? 'carousel' : 'pages'}` as keyof typeof dictionary),
    }))

    // ── RSC Slot: fetch only the active tab's data ──
    let tabContent: React.ReactNode

    switch (activeTab) {
        case 'productos':
        case 'categorias': {
            // Both tabs use CatalogClient — it handles its own internal tab
            const data = await fetchProductsData(tenantId, lang, rawSearchParams)
            tabContent = (
                <CatalogClient
                    {...data}
                    initialTab={activeTab}
                />
            )
            break
        }
        case 'inventario': {
            const data = await fetchInventoryData(tenantId, lang)
            tabContent = (
                <InventoryClient
                    items={data.items}
                    lowStockItems={data.lowStockItems}
                    locations={data.locations}
                    labels={data.labels}
                />
            )
            break
        }
        case 'insignias': {
            if (!featureFlags.enable_product_badges) {
                tabContent = <FeatureGate flag="enable_product_badges" lang={lang} />
                break
            }
            const { products, error } = await fetchBadgesData()
            tabContent = <BadgesClient products={products} error={error} />
            break
        }
        case 'carrusel': {
            if (!featureFlags.enable_carousel) {
                tabContent = <FeatureGate flag="enable_carousel" lang={lang} />
                break
            }
            const data = await fetchCarouselData(tenantId)
            tabContent = (
                <CarouselClient
                    slides={data.slides}
                    canAdd={data.canAdd}
                    slideCount={data.slideCount}
                    maxSlides={data.maxSlides}
                />
            )
            break
        }
        case 'paginas': {
            if (!featureFlags.enable_cms_pages) {
                tabContent = <FeatureGate flag="enable_cms_pages" lang={lang} />
                break
            }
            const data = await fetchPagesData(tenantId)
            tabContent = (
                <PagesClient
                    pages={data.pages}
                    canAdd={data.canAdd}
                    pageCount={data.pageCount}
                    maxPages={data.maxPages}
                />
            )
            break
        }
        default:
            tabContent = null
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.section.myStore')}
                subtitle={t('panel.catalog.subtitle')}
                icon={<Store className="w-5 h-5" />}
            />
            <MyStoreShell
                tabs={tabsWithLabels}
                activeTab={activeTab}
                lang={lang}
            >
                {tabContent}
            </MyStoreShell>
        </div>
    )
}
