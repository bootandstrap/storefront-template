import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { checkLimit } from '@/lib/limits'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import {
    getProductCount,
    getCategoryCount,
    getOrdersThisMonth,
    getRecentOrders,
} from '@/lib/medusa/admin'
import { calculateStoreReadiness } from '@/lib/store-readiness'
import { evaluateAchievements, ACHIEVEMENT_DEFS, getAchievementsGrouped, type AchievementContext } from '@/lib/achievements'
import { evaluateSmartTips, type SmartTipContext } from '@/lib/smart-tips'
import StatCard from '@/components/panel/StatCard'
import UsageMeter from '@/components/panel/UsageMeter'
import EmptyState from '@/components/panel/EmptyState'
import PanelChecklist from '@/components/panel/PanelChecklist'
import StoreHealthCard from '@/components/panel/StoreHealthCard'
import SmartTip from '@/components/panel/SmartTip'
import ActivityFeed, { type ActivityEvent } from '@/components/panel/ActivityFeed'
import {
    Package,
    ShoppingCart,
    Users,
    FolderTree,
    DollarSign,
    Plus,
    BarChart3,
    Settings,
    Tag,
    Inbox,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

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
    const appConfig = await getConfigForTenant(tenantId)
    const { planLimits } = appConfig
    const { config: storeConfig, featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Try to resolve Medusa scope — gracefully degrade if unavailable
    let productCount = 0
    let categoryCount = 0
    let ordersThisMonth = 0
    let recentOrders: Awaited<ReturnType<typeof getRecentOrders>> = []
    let customerCount = 0
    let adminCount = 0
    let medusaDegraded = false

    try {
        const scope = await getTenantMedusaScope(tenantId)
        const supabase = await createClient()
        const [pc, cc, otm, ro, customerCountRes, adminCountRes] = await Promise.all([
            getProductCount(scope),
            getCategoryCount(scope),
            getOrdersThisMonth(scope),
            getRecentOrders(5, scope),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('role', 'customer'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('role', ['owner', 'super_admin']),
        ])
        productCount = pc
        categoryCount = cc
        ordersThisMonth = otm
        recentOrders = ro
        customerCount = customerCountRes.count ?? 0
        adminCount = adminCountRes.count ?? 0
    } catch {
        medusaDegraded = true
        // Still try to get customer count from Supabase directly
        try {
            const supabase = await createClient()
            const [custRes, adminRes] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('role', 'customer'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('role', ['owner', 'super_admin']),
            ])
            customerCount = custRes.count ?? 0
            adminCount = adminRes.count ?? 0
        } catch { /* ignore */ }
    }

    // Revenue calculation from recent orders
    const revenueThisMonth = recentOrders.reduce((sum, order) => {
        return sum + (order.total ?? 0)
    }, 0)
    const currency = recentOrders[0]?.currency_code ?? storeConfig.default_currency ?? 'usd'
    const formattedRevenue = new Intl.NumberFormat(lang, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(revenueThisMonth / 100)

    // Simple sparkline data — create 7-bar data from recent orders
    // Group recent orders by day-of-week for the sparkline
    const sparklineOrders = (() => {
        const data = new Array(7).fill(0)
        for (const order of recentOrders) {
            if (order.created_at) {
                const day = new Date(order.created_at).getDay()
                data[day]++
            }
        }
        return data
    })()

    // Usage meter data
    const realMeters = [
        { label: t('panel.usage.products'), result: checkLimit(planLimits, 'max_products', productCount) },
        { label: t('panel.usage.categories'), result: checkLimit(planLimits, 'max_categories', categoryCount) },
        { label: t('panel.usage.ordersMonth'), result: checkLimit(planLimits, 'max_orders_month', ordersThisMonth) },
        { label: t('panel.usage.customers'), result: checkLimit(planLimits, 'max_customers', customerCount) },
        { label: t('panel.usage.adminUsers'), result: checkLimit(planLimits, 'max_admin_users', adminCount) },
    ]

    // Load email and traffic stats
    let emailSendsThisMonth = 0
    let dailyPageViews = 0
    try {
        const admin = createAdminClient()
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const today = new Date().toISOString().split('T')[0]

        const [emailRes, trafficRes] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
            (admin as any)
                .from('email_log')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .gte('sent_at', startOfMonth.toISOString()),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (admin as any)
                .from('analytics_daily_summary')
                .select('page_views')
                .eq('tenant_id', tenantId)
                .eq('date', today)
                .maybeSingle(),
        ])
        emailSendsThisMonth = emailRes.count ?? 0
        dailyPageViews = trafficRes.data?.page_views ?? 0
    } catch {
        // Gracefully degrade — show 0
    }

    const estimatedStorageMb = Math.round(productCount * 2)

    const extendedMeters = [
        { label: t('panel.usage.emailsMonth'), result: checkLimit(planLimits, 'max_email_sends_month', emailSendsThisMonth) },
        { label: t('panel.usage.trafficDay'), result: checkLimit(planLimits, 'max_requests_day', dailyPageViews) },
        { label: `${t('panel.usage.storage')} (est.)`, result: checkLimit(planLimits, 'storage_limit_mb', estimatedStorageMb) },
    ]

    // ── Gamification data ──────────────────────────────────────────────
    const readiness = await calculateStoreReadiness(tenantId, lang)

    const hasPaymentMethod = featureFlags.enable_whatsapp_checkout ||
        featureFlags.enable_online_payments ||
        featureFlags.enable_cash_on_delivery ||
        featureFlags.enable_bank_transfer

    const activeModuleCount = [
        featureFlags.enable_carousel,
        featureFlags.enable_analytics,
        featureFlags.enable_chatbot,
        featureFlags.enable_crm,
        featureFlags.enable_reviews,
        featureFlags.enable_whatsapp_checkout,
        featureFlags.enable_multi_language,
        featureFlags.enable_email_templates,
    ].filter(Boolean).length

    const achievementCtx: AchievementContext = {
        productCount,
        categoryCount,
        ordersThisMonth,
        hasLogo: !!storeConfig.logo_url,
        hasContact: !!storeConfig.whatsapp_number || !!storeConfig.store_email,
        hasPaymentMethod,
        maintenanceOff: !featureFlags.enable_maintenance_mode,
        activeModuleCount,
        tourCompleted: !!storeConfig.onboarding_completed,
        readinessScore: readiness.score,
        revenueThisMonth,
    }

    const unlockedIds = evaluateAchievements(achievementCtx)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storedAchievements: string[] = (storeConfig as any).achievements_unlocked || []
    const achievementsGrouped = getAchievementsGrouped(unlockedIds)

    const tipCtx: SmartTipContext = {
        productCount,
        categoryCount,
        ordersThisMonth,
        hasLogo: !!storeConfig.logo_url,
        hasContact: !!storeConfig.whatsapp_number || !!storeConfig.store_email,
        hasPaymentMethod,
        maintenanceOff: !featureFlags.enable_maintenance_mode,
        activeModuleCount,
        readinessScore: readiness.score,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dismissedTips: string[] = (storeConfig as any).dismissed_tips || []
    const smartTips = evaluateSmartTips(tipCtx, 'panel', dismissedTips)

    // Quick actions — smart-sorted by store state priority
    const allActions = [
        {
            icon: <Plus className="w-5 h-5" />,
            label: t('panel.quickActions.addProduct') || 'Add Product',
            href: `/${lang}/panel/catalogo`,
            priority: productCount === 0 ? 100 : 1,
        },
        {
            icon: <Inbox className="w-5 h-5" />,
            label: t('panel.quickActions.processOrders') || 'Orders',
            href: `/${lang}/panel/pedidos`,
            priority: ordersThisMonth > 0 ? 80 : 10,
        },
        {
            icon: <Tag className="w-5 h-5" />,
            label: t('panel.quickActions.categories') || 'Categories',
            href: `/${lang}/panel/categorias`,
            priority: categoryCount === 0 && productCount > 0 ? 70 : 5,
        },
        {
            icon: <Settings className="w-5 h-5" />,
            label: t('panel.quickActions.settings') || 'Settings',
            href: `/${lang}/panel/tienda`,
            priority: !storeConfig.logo_url ? 60 : 3,
        },
        ...(featureFlags.enable_analytics ? [{
            icon: <BarChart3 className="w-5 h-5" />,
            label: t('panel.quickActions.analytics') || 'Analytics',
            href: `/${lang}/panel/analiticas`,
            priority: ordersThisMonth >= 5 ? 50 : 2,
        }] : []),
    ]
    const quickActions = allActions.sort((a, b) => b.priority - a.priority).slice(0, 5)

    const relativeTime = (dateStr: string) => {
        const now = Date.now()
        const then = new Date(dateStr).getTime()
        const diff = now - then
        const minutes = Math.floor(diff / 60000)
        if (minutes < 60) return `${minutes}m`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h`
        const days = Math.floor(hours / 24)
        return `${days}d`
    }

    // Activity feed — try audit_log, fall back to recent orders
    let activityEvents: ActivityEvent[] = []
    try {
        const admin = createAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: auditRows } = await (admin as any)
            .from('audit_log')
            .select('id, action, entity_type, entity_id, metadata, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(5)

        if (auditRows && auditRows.length > 0) {
            activityEvents = auditRows.map((row: { id: string; action: string; entity_type: string; entity_id: string; metadata?: Record<string, unknown>; created_at: string }) => ({
                id: row.id,
                type: `${row.entity_type}_${row.action}`,
                description: `${row.entity_type} #${row.entity_id?.slice(0, 8) ?? '—'} — ${row.action}`,
                timestamp: row.created_at,
                meta: row.metadata ?? undefined,
            }))
        }
    } catch {
        // audit_log might not exist yet — graceful fallback
    }

    // Fallback: synthesize feed from recent orders if no audit data
    if (activityEvents.length === 0 && recentOrders.length > 0) {
        activityEvents = recentOrders.slice(0, 5).map(order => ({
            id: order.id,
            type: order.status === 'completed' ? 'order_completed' : 'order_created',
            description: `${t('panel.dashboard.orderId')} #${order.display_id} — ${t(`order.${order.status}`) || order.status}`,
            timestamp: order.created_at,
        }))
    }

    return (
        <div className="space-y-8">
            {/* Medusa degraded banner */}
            {medusaDegraded && (
                <div className="rounded-xl border border-amber-300/30 bg-amber-50/10 px-4 py-3 text-sm text-amber-700">
                    ⚠️ {t('panel.dashboard.medusaDegraded')}
                </div>
            )}

            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('panel.dashboard.title')}
                </h1>
                <p className="text-text-muted mt-1">
                    {t('panel.dashboard.subtitle')}
                </p>
            </div>

            {/* Smart Tips — contextual suggestions */}
            {smartTips.length > 0 && (
                <div className="space-y-2">
                    {smartTips.map(tip => (
                        <SmartTip key={tip.id} tip={tip} t={t} lang={lang} />
                    ))}
                </div>
            )}

            {/* Store Health + Achievements row */}
            {storeConfig.onboarding_completed && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Health Card — takes 1 column */}
                    <StoreHealthCard readiness={readiness} t={t} lang={lang} />

                    {/* Achievements — takes 2 columns */}
                    <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-surface-2)' }}>
                        <h3 className="text-sm font-bold text-text-primary mb-3">
                            🏆 {t('achievement.title')}
                        </h3>
                        <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                            {[...achievementsGrouped.setup, ...achievementsGrouped.sales, ...achievementsGrouped.growth].map(ach => (
                                <div
                                    key={ach.id}
                                    title={t(ach.titleKey)}
                                    className={`achievement-badge ${ach.unlocked ? 'unlocked' : 'locked'}`}
                                >
                                    <span className="text-xl">{ach.emoji}</span>
                                    <span className="text-[9px] text-text-muted leading-tight line-clamp-1">
                                        {t(ach.titleKey)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-text-muted mt-3">
                            {unlockedIds.length}/{ACHIEVEMENT_DEFS.length} {t('achievement.unlocked')}
                        </p>
                    </div>
                </div>
            )}

            {/* Legacy checklist fallback for pre-onboarding */}
            {storeConfig.onboarding_completed && readiness.score < 40 && (() => {
                const pendingChecks = readiness.checks.filter(c => !c.done).slice(0, 5)
                if (pendingChecks.length === 0) return null
                return (
                    <PanelChecklist
                        checks={pendingChecks}
                        dbSkipped={!!(storeConfig as Record<string, unknown>).checklist_skipped}
                        title={t('panel.checklist.title') || '🚀 Getting Started'}
                        subtitle={t('panel.checklist.subtitle') || 'Complete these steps to launch your store'}
                        skipLabel={t('panel.checklist.skip') || 'Skip'}
                        allDoneLabel={t('checklist.allDone')}
                    />
                )
            })()}

            {/* Stat cards — 5 cards with trends and sparklines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    label={t('panel.stats.revenue') || 'Revenue'}
                    value={formattedRevenue}
                    icon={<DollarSign className="w-5 h-5" />}
                    href={`/${lang}/panel/pedidos`}
                />
                <StatCard
                    label={t('panel.stats.products')}
                    value={productCount}
                    icon={<Package className="w-5 h-5" />}
                    href={`/${lang}/panel/catalogo`}
                />
                <StatCard
                    label={t('panel.stats.ordersMonth')}
                    value={ordersThisMonth}
                    icon={<ShoppingCart className="w-5 h-5" />}
                    sparklineData={sparklineOrders}
                    href={`/${lang}/panel/pedidos`}
                />
                <StatCard
                    label={t('panel.stats.customers')}
                    value={customerCount}
                    icon={<Users className="w-5 h-5" />}
                    href={`/${lang}/panel/clientes`}
                />
                <StatCard
                    label={t('panel.stats.categories')}
                    value={categoryCount}
                    icon={<FolderTree className="w-5 h-5" />}
                    href={`/${lang}/panel/categorias`}
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold font-display text-text-primary mb-4">
                    {t('panel.quickActions.title') || 'Quick Actions'}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="quick-action"
                        >
                            <div className="quick-action-icon">
                                {action.icon}
                            </div>
                            <span className="text-sm font-medium text-center leading-tight">
                                {action.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Activity Feed */}
            <div>
                <h2 className="text-lg font-bold font-display text-text-primary mb-4">
                    {t('panel.activity.title')}
                </h2>
                <ActivityFeed
                    events={activityEvents}
                    labels={{
                        title: t('panel.activity.title'),
                        noActivity: t('panel.activity.noActivity'),
                        noActivityDesc: t('panel.activity.noActivityDesc'),
                    }}
                    lang={lang}
                />
            </div>

            {/* Usage meters */}
            <div>
                <h2 className="text-lg font-bold font-display text-text-primary mb-4">
                    {t('panel.usage.title')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...realMeters, ...extendedMeters].map((meter) => (
                        <UsageMeter
                            key={meter.label}
                            label={meter.label}
                            result={meter.result}
                        />
                    ))}
                </div>
                <p className="text-xs text-text-muted mt-3">
                    {t('panel.usage.planInfo', { plan: planLimits.plan_name })}
                </p>
            </div>

            {/* Recent orders */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold font-display text-text-primary">
                        {t('panel.dashboard.recentOrders')}
                    </h2>
                    {recentOrders.length > 0 && (
                        <Link
                            href={`/${lang}/panel/pedidos`}
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            {t('panel.dashboard.viewAll') || 'View all'} →
                        </Link>
                    )}
                </div>
                {recentOrders.length === 0 ? (
                    <EmptyState
                        icon={<Inbox className="w-8 h-8" />}
                        title={t('panel.dashboard.noOrders') || 'No orders yet'}
                        description={t('panel.dashboard.noOrdersDesc') || 'When customers place orders, they will appear here. Share your store to start receiving orders!'}
                        actionLabel={t('panel.dashboard.shareStore') || 'Share your store'}
                        actionHref={`/${lang}/panel/tienda`}
                    />
                ) : (
                    <div className="glass rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-3 text-text-muted">
                                    <th className="text-left px-4 py-3 font-medium">
                                        {t('panel.dashboard.orderId')}
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium">
                                        {t('panel.dashboard.customer')}
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                                        {t('panel.dashboard.status')}
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium">
                                        {t('panel.dashboard.total')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="border-b border-surface-2 last:border-0 hover:bg-surface-1/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-4 py-3">
                                            <Link href={`/${lang}/panel/pedidos?search=${order.display_id}`} className="block">
                                                <span className="font-medium text-text-primary">
                                                    #{order.display_id}
                                                </span>
                                                {order.created_at && (
                                                    <span className="text-xs text-text-muted ml-2">
                                                        {relativeTime(order.created_at)}
                                                    </span>
                                                )}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary">
                                            {order.customer
                                                ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() || order.customer.email
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    order.status === 'canceled' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {t(`order.${order.status}`) || order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-text-primary">
                                            {new Intl.NumberFormat(lang, {
                                                style: 'currency',
                                                currency: order.currency_code ?? 'usd',
                                            }).format(order.total / 100)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
