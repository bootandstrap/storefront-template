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
    getAdminOrders,
} from '@/lib/medusa/admin'
import { resolveCurrencyContext, sumRevenueByCurrency, revenueByDayAndCurrency, formatAmount, type CurrencyRevenue } from '@/lib/currency-engine'
import { calculateStoreReadiness } from '@/lib/store-readiness'
import { evaluateAchievements, ACHIEVEMENT_DEFS, getAchievementsGrouped, type AchievementContext } from '@/lib/achievements'
import { evaluateSmartTips, type SmartTipContext } from '@/lib/smart-tips'
import {
    UsageMeter, EmptyState, SetupProgress, StoreHealthCard,
    SmartTip, SectionHeader, ActivityFeed, PanelBadge,
    PanelTableLegacy as PanelTable, PanelThead, PanelTbody, PanelTr, PanelThCell as PanelTh, PanelTd,
    type ActivityEvent,
    SotaBentoGrid, SotaBentoItem, SotaGlassCard, SotaPillAction, SotaMetric, SotaFeatureGateWrapper
} from '@/components/panel'
import DashboardChart from './DashboardChart'
import {
    Plus,
    BarChart3,
    Settings,
    Tag,
    Inbox,
    Store,
    UserCheck,
    Zap,
    Activity,
    Gauge,
    DollarSign,
    ShoppingCart,
    User,
    Users,
    FolderTree,
    ExternalLink,
    Package
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
    let monthOrders: import('@/lib/medusa/admin').AdminOrderFull[] = []
    let customerCount = 0
    let adminCount = 0
    let medusaDegraded = false

    try {
        const scope = await getTenantMedusaScope(tenantId)
        const supabase = await createClient()
        const [pc, cc, otm, ro, monthOrdersRes, customerCountRes, adminCountRes] = await Promise.all([
            getProductCount(scope),
            getCategoryCount(scope),
            getOrdersThisMonth(scope),
            getRecentOrders(5, scope),
            // Fetch ALL orders this month for accurate revenue calculation
            getAdminOrders({ limit: 500, status: 'all' }, scope),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('role', 'customer'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('role', ['owner', 'super_admin']),
        ])
        productCount = pc
        categoryCount = cc
        ordersThisMonth = otm
        recentOrders = ro
        monthOrders = monthOrdersRes.orders
        customerCount = customerCountRes.count ?? 0
        adminCount = adminCountRes.count ?? 0
    } catch (err) {
        console.error('[Panel Dashboard] Medusa scope/data fetch failed:', err instanceof Error ? err.message : err)
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

    // Revenue calculation — multi-currency aware via CurrencyEngine
    // CRITICAL: Use monthOrders (all orders) for revenue, NOT recentOrders (5-item sample)
    const currencyCtx = resolveCurrencyContext(storeConfig, featureFlags)
    const revenueBreakdown = sumRevenueByCurrency(monthOrders, currencyCtx)
    const primaryRevenue = revenueBreakdown.find(r => r.code === currencyCtx.primary) ?? {
        code: currencyCtx.primary, amount: 0, orderCount: 0, avgOrderValue: 0
    }
    const secondaryRevenues = revenueBreakdown.filter(r => r.code !== currencyCtx.primary && r.amount > 0)
    const formattedRevenue = formatAmount(primaryRevenue.amount, primaryRevenue.code, lang)
    const revenueThisMonth = primaryRevenue.amount

    // POS vs Online revenue split
    const posOrders = monthOrders.filter(o => {
        const metadata = o.metadata as Record<string, unknown> | null;
        const source = metadata?.source;
        return source === 'pos' || source === 'pos-kiosk' || (o as any).tags?.some((tag: any) => tag.value?.includes('pos'));
    });
    const onlineOrders = monthOrders.filter(o => {
        const metadata = o.metadata as Record<string, unknown> | null;
        const source = metadata?.source;
        return source !== 'pos' && source !== 'pos-kiosk' && !(o as any).tags?.some((tag: any) => tag.value?.includes('pos'));
    });
    const posRevenue = sumRevenueByCurrency(posOrders, currencyCtx)
    const onlineRevenue = sumRevenueByCurrency(onlineOrders, currencyCtx)
    const posPrimary = posRevenue.find(r => r.code === currencyCtx.primary)?.amount ?? 0
    const onlinePrimary = onlineRevenue.find(r => r.code === currencyCtx.primary)?.amount ?? 0
    const hasPosOrders = posOrders.length > 0

    // Simple sparkline data — create 7-bar data from month orders (more accurate)
    const sparklineOrders = (() => {
        const data = new Array(7).fill(0)
        for (const order of monthOrders) {
            if (order.created_at) {
                const day = new Date(order.created_at).getDay()
                data[day]++
            }
        }
        return data
    })()

    // Chart data — revenue × currency + orders by day (last 7 days)
    const revenueByDay = revenueByDayAndCurrency(monthOrders, currencyCtx, 7)

    const ordersByDay = (() => {
        const days: { date: string; orders: number }[] = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            const count = monthOrders.filter(o => o.created_at?.startsWith(dateStr)).length
            days.push({ date: dateStr, orders: count })
        }
        return days
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
        featureFlags.enable_pos,
        featureFlags.enable_traffic_expansion,
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
        ...(featureFlags.enable_pos ? [{
            icon: <Store className="w-5 h-5" />,
            label: t('panel.quickActions.pos') || 'POS',
            href: `/${lang}/panel/pos`,
            priority: 40,
        }] : []),
        ...(featureFlags.enable_crm ? [{
            icon: <UserCheck className="w-5 h-5" />,
            label: t('panel.quickActions.crm') || 'CRM',
            href: `/${lang}/panel/crm`,
            priority: 35,
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
        <SotaBentoGrid className="mb-20">
            {/* Medusa degraded banner */}
            {medusaDegraded && (
                <SotaBentoItem colSpan={{ base: 12 }}>
                    <div className="rounded-2xl border-2 border-amber-400/50 bg-amber-50/20 px-5 py-4 backdrop-blur-md flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-600 text-lg">⚠️</div>
                            <div>
                                <p className="text-sm font-semibold text-amber-800">{t('panel.dashboard.medusaDegraded')}</p>
                                <p className="text-xs text-amber-600 mt-0.5">Las estadísticas de productos, pedidos e ingresos no están disponibles. Verifica que Medusa esté corriendo en el puerto 9000.</p>
                            </div>
                        </div>
                        <Link
                            href={`/${lang}/panel`}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 text-xs font-medium hover:bg-amber-500/30 transition-colors"
                        >
                            Reintentar
                        </Link>
                    </div>
                </SotaBentoItem>
            )}

            {/* Smart Tips — contextual suggestions */}
            {smartTips.length > 0 && (
                <SotaBentoItem colSpan={{ base: 12 }}>
                    <div className="space-y-2">
                        {smartTips.map(tip => (
                            <SmartTip
                                key={tip.id}
                                tipId={tip.id}
                                emoji={tip.emoji}
                                message={t(tip.messageKey)}
                                actionLabel={t(tip.actionKey)}
                                actionHref={tip.actionHref}
                                lang={lang}
                            />
                        ))}
                    </div>
                </SotaBentoItem>
            )}

            {/* Welcome Hero Banner — Animated mesh gradient */}
            <SotaBentoItem colSpan={{ base: 12 }}>
                <div className="hero-welcome p-6 md:p-8 lg:p-10 rounded-[32px] w-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-white mb-2">
                                {t('panel.dashboard.title')}
                            </h1>
                            <p className="text-white/80 mt-1 text-sm md:text-base font-medium max-w-xl">
                                {t('panel.dashboard.subtitle')}
                            </p>
                        </div>
                        {storeConfig.onboarding_completed && (
                            <div className="flex items-center gap-3 flex-wrap">
                                <a
                                    href={`/${lang}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 text-white text-sm font-semibold shadow-xl transition-all hover:scale-105 hover:bg-white/30 duration-300"
                                    title="View Public Storefront"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    {t('panel.dashboard.viewStorefront') || 'Storefront'}
                                </a>
                                <a
                                    href={`/api/admin/simulate_client_panel?lang=${lang}`}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-500/80 backdrop-blur-xl border border-indigo-300/30 text-white text-sm font-semibold shadow-xl transition-all hover:scale-105 hover:bg-indigo-500 duration-300"
                                    title="Simulate Client Panel (My Account)"
                                >
                                    <User className="w-4 h-4" />
                                    Simulation Mode
                                </a>
                                <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl transition-transform hover:scale-105 duration-300 cursor-default`}>
                                    <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] ${
                                        readiness.score >= 80 ? 'bg-[#98FF98]' :
                                        readiness.score >= 40 ? 'bg-[#FFD700]' : 'bg-[#FF6B6B]'
                                    }`} />
                                    <span className="text-sm font-bold text-white tracking-wide tabular-nums">
                                        {readiness.score}% {t('storeHealth.title')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SotaBentoItem>

            {/* Persistent setup progress — if not complete */}
            {readiness.score < 100 && (
                <SotaBentoItem colSpan={{ base: 12 }}>
                    <SetupProgress
                        checks={readiness.checks}
                        labels={{
                            title: t('panel.setup.title'),
                            subtitle: t('panel.setup.subtitle'),
                            collapsed: t('panel.setup.collapsed'),
                            complete: t('panel.setup.complete'),
                            expand: t('panel.setup.expand'),
                            collapse: t('panel.setup.collapse'),
                            unlockWith: t('panel.setup.unlockWith'),
                            categories: {
                                setup: t('panel.setup.cat.setup'),
                                content: t('panel.setup.cat.content'),
                                sales: t('panel.setup.cat.sales'),
                                growth: t('panel.setup.cat.growth'),
                            },
                        }}
                        checkLabels={Object.fromEntries(
                            readiness.checks.map(c => [c.id, t(c.labelKey)])
                        )}
                        moduleUpsells={{
                            active_modules: {
                                moduleName: t('panel.setup.modulesLabel'),
                                href: `/${lang}/panel/modulos`,
                            },
                        }}
                        lang={lang}
                    />
                </SotaBentoItem>
            )}

            {/* Store Health + Achievements row */}
            {storeConfig.onboarding_completed && (
                <>
                    <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                        <StoreHealthCard
                            readiness={readiness}
                            labels={{
                                title: t('storeHealth.title'),
                                completed: t('storeHealth.completed'),
                                expand: t('storeHealth.expand'),
                                collapse: t('storeHealth.collapse'),
                                levelLabels: {
                                    setup: t('storeHealth.level.setup'),
                                    growing: t('storeHealth.level.growing'),
                                    thriving: t('storeHealth.level.thriving'),
                                },
                                checkLabels: Object.fromEntries(
                                    readiness.checks.map(c => [c.id, t(c.labelKey)])
                                ),
                                nextActionLabel: readiness.nextAction ? t(readiness.nextAction.descKey) : undefined,
                                replayTourLabel: t('panel.health.replayTour'),
                                languageLabel: t('panel.health.language'),
                            }}
                            lang={lang}
                        />
                    </SotaBentoItem>

                    <SotaBentoItem colSpan={{ base: 12, lg: 8 }}>
                        <SotaGlassCard className="h-full flex flex-col justify-center">
                            <h3 className="text-sm font-bold text-tx mb-4 flex items-center gap-2">
                                <span className="text-xl">🏆</span> {t('achievement.title')}
                                <span className="ml-auto text-xs font-mono text-tx-muted px-2 py-1 bg-sf-0 rounded-lg border border-sf-3">
                                    {unlockedIds.length}/{ACHIEVEMENT_DEFS.length} {t('achievement.unlocked')}
                                </span>
                            </h3>
                            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-x-2 gap-y-4">
                                {[...achievementsGrouped.setup, ...achievementsGrouped.sales, ...achievementsGrouped.growth].map(ach => (
                                    <div
                                        key={ach.id}
                                        title={t(ach.titleKey)}
                                        className={`achievement-badge transition-all hover:scale-110 ${ach.unlocked ? 'unlocked shadow-lg shadow-brand-500/20' : 'locked opacity-50 grayscale'}`}
                                    >
                                        <span className="text-2xl drop-shadow-md">{ach.emoji}</span>
                                        <span className="text-[9px] font-medium text-tx-muted leading-tight line-clamp-1 mt-1 text-center w-full">
                                            {t(ach.titleKey)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </SotaGlassCard>
                    </SotaBentoItem>
                </>
            )}

            {/* Quick Actions */}
            <SotaBentoItem colSpan={{ base: 12 }}>
                <SectionHeader
                    title={t('panel.quickActions.title') || 'Quick Actions'}
                    icon={<Zap className="w-5 h-5 text-brand" />}
                />
                <div className="flex flex-wrap gap-3 mt-4">
                    {quickActions.map((action, i) => (
                        <div key={action.href} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                            <SotaPillAction
                                href={action.href}
                                icon={action.icon}
                                label={action.label}
                                variant={i === 0 ? 'brand' : 'default'}
                            />
                        </div>
                    ))}
                </div>
            </SotaBentoItem>


            {/* KPI ROW 1 */}
            <SotaBentoItem colSpan={{ base: 12, sm: 6 }}>
                <SotaMetric
                    label={t('panel.stats.revenue') || 'Revenue'}
                    value={formattedRevenue}
                    icon={<DollarSign className="w-6 h-6" />}
                    href={`/${lang}/panel/pedidos`}
                    accentColor="#16a34a"
                />
                {/* Multi-currency sub-badges */}
                {secondaryRevenues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 px-4 pb-2">
                        {secondaryRevenues.map(r => (
                            <span key={r.code} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sf-2/80 text-tx-sec border border-sf-3/30">
                                {formatAmount(r.amount, r.code, lang)}
                            </span>
                        ))}
                    </div>
                )}
                {/* POS vs Online revenue split */}
                {hasPosOrders && (
                    <div className="flex items-center gap-3 mt-1 px-4 pb-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-semibold text-tx-muted">
                                POS {formatAmount(posPrimary, currencyCtx.primary, lang)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-semibold text-tx-muted">
                                Online {formatAmount(onlinePrimary, currencyCtx.primary, lang)}
                            </span>
                        </div>
                    </div>
                )}
            </SotaBentoItem>
            
            <SotaBentoItem colSpan={{ base: 12, sm: 6 }}>
                <SotaMetric
                    label={t('panel.stats.ordersMonth') || 'Orders'}
                    value={ordersThisMonth}
                    icon={<ShoppingCart className="w-6 h-6" />}
                    sparklineData={sparklineOrders}
                    href={`/${lang}/panel/pedidos`}
                    locale={lang}
                    accentColor="#8BC34A"
                />
            </SotaBentoItem>

            {/* KPI ROW 2: Products, Customers, Categories */}
            <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                <SotaMetric
                    label={t('panel.stats.products') || 'Products'}
                    value={productCount}
                    icon={<Package className="w-5 h-5" />}
                    href={`/${lang}/panel/catalogo`}
                    locale={lang}
                    accentColor="#6366f1"
                />
            </SotaBentoItem>
            
            <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                <SotaMetric
                    label={t('panel.stats.customers') || 'Customers'}
                    value={customerCount}
                    icon={<Users className="w-5 h-5" />}
                    href={`/${lang}/panel/clientes`}
                    locale={lang}
                    accentColor="#0ea5e9"
                />
            </SotaBentoItem>
            
            <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                <SotaMetric
                    label={t('panel.stats.categories') || 'Categories'}
                    value={categoryCount}
                    icon={<FolderTree className="w-5 h-5" />}
                    href={`/${lang}/panel/categorias`}
                    locale={lang}
                    accentColor="#f59e0b"
                />
            </SotaBentoItem>

            {/* Chart */}
            <SotaBentoItem colSpan={{ base: 12 }}>
                <SotaGlassCard glowColor="blue">
                    <SectionHeader
                        title={t('panel.stats.chart') || 'Revenue Overview'}
                        icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
                    />
                    <div className="mt-6">
                        <DashboardChart
                            revenueByDay={revenueByDay}
                            ordersByDay={ordersByDay}
                            currencyCtx={currencyCtx}
                            lang={lang}
                            labels={{
                                revenue: t('panel.stats.revenue') || 'Revenue',
                                orders: t('panel.stats.ordersMonth') || 'Orders',
                                chartTitle: t('panel.stats.chart') || 'Revenue Overview',
                            }}
                        />
                    </div>
                </SotaGlassCard>
            </SotaBentoItem>

            {/* Feed & Usage */}
            <SotaBentoItem colSpan={{ base: 12, lg: 8 }}>
                <SotaGlassCard className="h-full">
                    <SectionHeader
                        title={t('panel.activity.title')}
                        icon={<Activity className="w-5 h-5 text-indigo-500" />}
                    />
                    <div className="mt-6">
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
                </SotaGlassCard>
            </SotaBentoItem>
            
            <SotaBentoItem colSpan={{ base: 12, lg: 4 }}>
                <SotaGlassCard className="h-full flex flex-col">
                    <SectionHeader
                        title={t('panel.usage.title')}
                        icon={<Gauge className="w-5 h-5 text-rose-500" />}
                        description={t('panel.usage.planInfo', { plan: planLimits.plan_name })}
                    />
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {realMeters.map((meter) => (
                            <UsageMeter
                                key={meter.label}
                                label={meter.label}
                                result={meter.result}
                                variant="radial"
                                upgradeHref={`/${lang}/panel/modulos`}
                                upgradeLabel={t('limits.exceeded.upgrade') || 'Upgrade →'}
                            />
                        ))}
                    </div>
                    {extendedMeters.length > 0 && (
                        <div className="grid grid-cols-1 gap-4 mt-6 pt-6 border-t border-sf-3/30">
                            {extendedMeters.map((meter) => (
                                <UsageMeter
                                    key={meter.label}
                                    label={meter.label}
                                    result={meter.result}
                                    variant="bar"
                                    upgradeHref={`/${lang}/panel/modulos`}
                                    upgradeLabel={t('limits.exceeded.upgrade') || 'Upgrade →'}
                                />
                            ))}
                        </div>
                    )}
                </SotaGlassCard>
            </SotaBentoItem>

            {/* Recent Orders Bottom Table */}
            <SotaBentoItem colSpan={{ base: 12 }}>
                <SotaGlassCard className="p-0 overflow-hidden">
                    <div className="p-6 border-b border-sf-3/30">
                        <SectionHeader
                            title={t('panel.dashboard.recentOrders')}
                            icon={<Inbox className="w-5 h-5 text-emerald-500" />}
                            action={
                                recentOrders.length > 0 ? (
                                    <Link
                                        href={`/${lang}/panel/pedidos`}
                                        className="text-sm text-brand hover:text-brand-600 font-semibold transition-colors flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-full"
                                    >
                                        {t('panel.dashboard.viewAll') || 'View all'} →
                                    </Link>
                                ) : undefined
                            }
                        />
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                icon={<Inbox className="w-8 h-8 opacity-50" />}
                                title={t('panel.dashboard.noOrders') || 'No orders yet'}
                                description={t('panel.dashboard.noOrdersDesc') || 'When customers place orders, they will appear here. Share your store to start receiving orders!'}
                                actionLabel={t('panel.dashboard.shareStore') || 'Share your store'}
                                actionHref={`/${lang}/panel/tienda`}
                            />
                        </div>
                    ) : (
                        <PanelTable ariaLabel="Recent orders">
                            <PanelThead>
                                <PanelTr>
                                    <PanelTh>{t('panel.dashboard.orderId')}</PanelTh>
                                    <PanelTh>{t('panel.dashboard.customer')}</PanelTh>
                                    <PanelTh className="hidden sm:table-cell">{t('panel.dashboard.status')}</PanelTh>
                                    <PanelTh align="right">{t('panel.dashboard.total')}</PanelTh>
                                </PanelTr>
                            </PanelThead>
                            <PanelTbody>
                                {recentOrders.map((order) => (
                                    <PanelTr key={order.id} className="cursor-pointer group hover:bg-sf-0/50 transition-colors">
                                        <PanelTd>
                                            <Link href={`/${lang}/panel/pedidos?search=${order.display_id}`} className="block">
                                                <span className="font-semibold text-tx">
                                                    #{order.display_id}
                                                </span>
                                                {order.created_at && (
                                                    <span className="text-xs text-tx-muted ml-2 font-mono">
                                                        {relativeTime(order.created_at)}
                                                    </span>
                                                )}
                                            </Link>
                                        </PanelTd>
                                        <PanelTd className="text-tx-sec font-medium">
                                            {order.customer
                                                ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() || order.customer.email
                                                : '—'}
                                        </PanelTd>
                                        <PanelTd className="hidden sm:table-cell">
                                            <PanelBadge
                                                variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'canceled' ? 'error' : 'info'}
                                                size="sm"
                                                dot
                                            >
                                                {t(`order.${order.status}`) || order.status}
                                            </PanelBadge>
                                        </PanelTd>
                                        <PanelTd align="right" className="font-bold text-tx text-lg tracking-tight">
                                            {formatAmount(order.total, order.currency_code ?? storeConfig.default_currency, lang)}
                                        </PanelTd>
                                    </PanelTr>
                                ))}
                            </PanelTbody>
                        </PanelTable>
                    )}
                </SotaGlassCard>
            </SotaBentoItem>
        </SotaBentoGrid>
    )
}
