/**
 * Ventas — Sales Hub (SOTA Redesign)
 *
 * RSC Slot pattern: reads ?tab= and fetches ONLY the active tab's data.
 *
 * Tabs:
 *   - pedidos      → OrdersClient
 *   - clientes     → CustomersClient
 *   - devoluciones → ReturnsClient (feature-gated)
 *   - resenas      → ReviewsClient (feature-gated)
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getSalesTabs } from '@/lib/panel-policy'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import FeatureGate from '@/components/ui/FeatureGate'
import { ShoppingCart } from 'lucide-react'
import SalesShell from './SalesShell'

import {
    fetchOrdersData,
    fetchCustomersData,
    fetchReturnsData,
    fetchReviewsData,
} from './data'

import OrdersClient from '../pedidos/OrdersClient'
import CustomersClient from '../clientes/CustomersClient'
import ReviewsClient from '../resenas/ReviewsClient'
import ReturnsClient from './ReturnsClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.section.sales') }
}

export default async function SalesPage({
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

    const tabs = getSalesTabs(featureFlags)
    const activeTab = tab && tabs.some(tb => tb.key === tab) ? tab : 'pedidos'

    const tabLabelMap: Record<string, string> = {
        pedidos: 'orders',
        clientes: 'customers',
        devoluciones: 'returns',
        resenas: 'reviews',
    }
    const tabsWithLabels = tabs.map(tb => ({
        ...tb,
        label: t(`panel.tabs.${tabLabelMap[tb.key] || tb.key}` as keyof typeof dictionary),
    }))

    // ── RSC Slot: fetch only the active tab's data ──
    let tabContent: React.ReactNode

    switch (activeTab) {
        case 'pedidos': {
            const data = await fetchOrdersData(tenantId, lang, rawSearchParams)
            tabContent = <OrdersClient {...data} />
            break
        }
        case 'clientes': {
            const data = await fetchCustomersData(tenantId, lang, rawSearchParams)
            tabContent = <CustomersClient {...data} />
            break
        }
        case 'devoluciones': {
            if (!featureFlags.enable_self_service_returns) {
                tabContent = <FeatureGate flag="enable_self_service_returns" lang={lang} />
                break
            }
            const data = await fetchReturnsData(lang)
            tabContent = <ReturnsClient returns={data.returns} labels={data.labels} lang={lang} />
            break
        }
        case 'resenas': {
            if (!featureFlags.enable_reviews) {
                tabContent = <FeatureGate flag="enable_reviews" lang={lang} />
                break
            }
            const data = await fetchReviewsData(lang)
            tabContent = (
                <ReviewsClient
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialReviews={data.reviews as any}
                    initialStats={data.stats}
                    dictionary={data.dictionary}
                    lang={lang}
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
                title={t('panel.section.sales')}
                subtitle={t('panel.orders.subtitle')}
                icon={<ShoppingCart className="w-5 h-5" />}
            />
            <SalesShell
                tabs={tabsWithLabels}
                activeTab={activeTab}
                lang={lang}
            >
                {tabContent}
            </SalesShell>
        </div>
    )
}
