/**
 * Panel Dashboard — Command Center v3 (Business-First Layout)
 *
 * Design Principles:
 *   1. Business data FIRST — KPIs above the fold
 *   2. Governance data SECONDARY — compact strip
 *   3. Actionable alerts — only when needed
 *   4. Clean, intentional layout — no clutter
 *
 * Layout (top to bottom):
 *   [CompactHero]         — slim welcome bar with health dot + links
 *   [KPI Cards]           — Revenue, Orders, Products, Customers
 *   [Revenue Chart 30d]   — SOTA gradient chart
 *   [TodaysFocus]         — pending orders + low stock
 *   [RecentOrdersTable]   — last 5 orders
 *   [GovernanceStrip]     — collapsed health + modules + limits
 *   [SmartTips]           — only when tips exist
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { SotaBentoGrid } from '@/components/panel'
import { buildDashboardContext } from './_lib/dashboard-context'

// ── Dashboard sections ──
import CompactHero from './_components/CompactHero'
import KPIRow from './_components/KPIRow'
import RevenueChart30Day from './_components/RevenueChart30Day'
import TodaysFocus from './_components/TodaysFocus'
import RecentOrdersTable from './_components/RecentOrdersTable'
import GovernanceStrip from './_components/GovernanceStrip'
import SmartTipsBar from './_components/SmartTipsBar'
import MedusaDegradedBanner from './_components/MedusaDegradedBanner'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.dashboard.title') }
}

export default async function PanelDashboard({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId } = await withPanelGuard()

    // Single data fetch — all governance + Medusa + Supabase
    const ctx = await buildDashboardContext(tenantId, lang)

    return (
        <SotaBentoGrid className="mb-20 panel-page-enter bento-stagger">
            {/* System alert — slim toast when Medusa is down */}
            <MedusaDegradedBanner ctx={ctx} />

            {/* ── Row 1: Compact Welcome ── */}
            <CompactHero ctx={ctx} />

            {/* ── Row 2: Business KPIs — above the fold ── */}
            <KPIRow ctx={ctx} />

            {/* ── Row 3: 30-Day Revenue Chart ── */}
            <RevenueChart30Day ctx={ctx} />

            {/* ── Row 4: Actionable alerts ── */}
            <TodaysFocus ctx={ctx} />

            {/* ── Row 5: Recent Orders ── */}
            <RecentOrdersTable ctx={ctx} />

            {/* ── Row 6: Governance Strip (collapsed) ── */}
            <GovernanceStrip ctx={ctx} />

            {/* ── Row 7: Smart Tips (only if tips exist) ── */}
            {ctx.gamification.smartTips.length > 0 && (
                <SmartTipsBar ctx={ctx} />
            )}
        </SotaBentoGrid>
    )
}
