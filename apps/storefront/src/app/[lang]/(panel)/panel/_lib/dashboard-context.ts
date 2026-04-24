/**
 * Dashboard Context Builder — Composes dashboard-specific data from the
 * unified PanelMetrics service + governance engines.
 *
 * The heavy lifting (Medusa, Supabase, revenue) is done by panel-data-service.ts.
 * This file ONLY adds dashboard-specific computations:
 *   - Store readiness (health ring)
 *   - Achievements (gamification)
 *   - Smart tips (contextual suggestions)
 *   - Usage meters (limit checks)
 *   - Quick actions (governance-sorted)
 *   - Module info list
 *   - Activity feed
 *
 * Zone: 🟡 EXTEND — add new dashboard widgets here
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getPanelMetrics, type PanelMetrics, type RevenueData } from '@/lib/panel-data-service'
import { checkLimit, type LimitCheckResult } from '@/lib/limits'
import { calculateStoreReadiness, type StoreReadinessResult } from '@/lib/store-readiness'
import {
    evaluateAchievements,
    getAchievementsGrouped,
    type AchievementContext,
} from '@/lib/achievements'
import { evaluateSmartTips, type SmartTipContext, type SmartTipDef } from '@/lib/smart-tips'
import { buildModuleInfoList, type ModuleInfo } from '@/lib/governance/build-module-info'
import type { ActivityEvent } from '@/components/panel'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantStorageUsage } from '@/lib/storage-usage'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { RevenueData } from '@/lib/panel-data-service'

export interface UsageMeterData {
    label: string
    result: LimitCheckResult
}

export interface GamificationData {
    readiness: StoreReadinessResult
    achievementsGrouped: ReturnType<typeof getAchievementsGrouped>
    unlockedIds: string[]
    storedAchievements: string[]
    smartTips: SmartTipDef[]
    activeModuleCount: number
}

export interface QuickAction {
    icon: string
    label: string
    href: string
    priority: number
}

export interface DashboardContext {
    // ── Shared metrics (from panel-data-service) ──
    metrics: PanelMetrics

    // ── Convenience re-exports (avoid metrics.xxx everywhere) ──
    appConfig: PanelMetrics['appConfig']
    storeConfig: PanelMetrics['storeConfig']
    featureFlags: PanelMetrics['featureFlags']
    planLimits: PanelMetrics['planLimits']
    tenantId: string
    lang: string
    productCount: number
    categoryCount: number
    ordersThisMonth: number
    customerCount: number
    adminCount: number
    medusaDegraded: boolean
    revenue: RevenueData
    recentOrders: PanelMetrics['recentOrders']
    monthOrders: PanelMetrics['monthOrders']
    topProducts: PanelMetrics['topProducts']
    lowStockItems: PanelMetrics['lowStockItems']
    pendingOrderCount: number
    lowStockCount: number

    // ── Dashboard-specific ──
    realMeters: UsageMeterData[]
    extendedMeters: UsageMeterData[]
    gamification: GamificationData
    activityEvents: ActivityEvent[]
    quickActions: QuickAction[]
    moduleInfoList: ModuleInfo[]
    t: ReturnType<typeof createTranslator>
    dictionary: Awaited<ReturnType<typeof getDictionary>>
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export async function buildDashboardContext(
    tenantId: string,
    lang: string,
): Promise<DashboardContext> {
    // ── Unified data fetch (cached per request) ──
    const metrics = await getPanelMetrics(tenantId, lang)
    const {
        appConfig, storeConfig, featureFlags, planLimits,
        productCount, categoryCount, ordersThisMonth, customerCount, adminCount,
        revenue, recentOrders, monthOrders, topProducts, lowStockItems,
        pendingOrderCount, lowStockCount, medusaDegraded,
    } = metrics

    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // ── Usage Meters ──
    const realMeters: UsageMeterData[] = [
        { label: t('panel.usage.products'), result: checkLimit(planLimits, 'max_products', productCount) },
        { label: t('panel.usage.categories'), result: checkLimit(planLimits, 'max_categories', categoryCount) },
        { label: t('panel.usage.ordersMonth'), result: checkLimit(planLimits, 'max_orders_month', ordersThisMonth) },
        { label: t('panel.usage.customers'), result: checkLimit(planLimits, 'max_customers', customerCount) },
        { label: t('panel.usage.adminUsers'), result: checkLimit(planLimits, 'max_admin_users', adminCount) },
    ]

    // Extended meters — email + traffic + storage
    let emailSendsThisMonth = 0
    let dailyPageViews = 0
    let storageMb = 0
    try {
        const admin = createAdminClient()
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const today = new Date().toISOString().split('T')[0]

        const [emailRes, trafficRes, storageUsage] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            getTenantStorageUsage((storeConfig as unknown as Record<string, string>).slug || tenantId),
        ])
        emailSendsThisMonth = emailRes.count ?? 0
        dailyPageViews = trafficRes.data?.page_views ?? 0
        storageMb = storageUsage.total.mb
    } catch { /* Gracefully degrade */ }

    const extendedMeters: UsageMeterData[] = [
        { label: t('panel.usage.emailsMonth'), result: checkLimit(planLimits, 'max_email_sends_month', emailSendsThisMonth) },
        { label: t('panel.usage.trafficDay'), result: checkLimit(planLimits, 'max_requests_day', dailyPageViews) },
        { label: t('panel.usage.storage'), result: checkLimit(planLimits, 'storage_limit_mb', storageMb) },
    ]

    // ── Gamification ──
    const readiness = await calculateStoreReadiness(tenantId, lang)

    const hasPaymentMethod =
        featureFlags.enable_whatsapp_checkout ||
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
        revenueThisMonth: revenue.revenueThisMonth,
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
        productLimitPct: realMeters[0]?.result.percentage ?? 0,
        orderLimitPct: realMeters[2]?.result.percentage ?? 0,
        chatbotAvailableNotActive: !featureFlags.enable_chatbot,
        seoAvailableNotActive: !featureFlags.enable_seo,
        crmAvailableNotActive: !featureFlags.enable_crm,
        planName: planLimits.plan_name as string | undefined,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dismissedTips: string[] = (storeConfig as any).dismissed_tips || []
    const smartTips = evaluateSmartTips(tipCtx, 'panel', dismissedTips)

    // ── Module Info List ──
    const moduleInfoList = buildModuleInfoList(
        featureFlags as unknown as Record<string, boolean>,
        planLimits as unknown as Record<string, number | string | null>,
    )

    // ── Quick Actions (smart-sorted) ──
    const quickActions: QuickAction[] = [
        {
            icon: 'Plus',
            label: t('panel.quickActions.addProduct') || 'Add Product',
            href: `/${lang}/panel/catalogo`,
            priority: productCount === 0 ? 100 : 1,
        },
        {
            icon: 'Inbox',
            label: t('panel.quickActions.processOrders') || 'Orders',
            href: `/${lang}/panel/pedidos`,
            priority: ordersThisMonth > 0 ? 80 : 10,
        },
        {
            icon: 'Tag',
            label: t('panel.quickActions.categories') || 'Categories',
            href: `/${lang}/panel/categorias`,
            priority: categoryCount === 0 && productCount > 0 ? 70 : 5,
        },
        {
            icon: 'Settings',
            label: t('panel.quickActions.settings') || 'Settings',
            href: `/${lang}/panel/tienda`,
            priority: !storeConfig.logo_url ? 60 : 3,
        },
        ...(featureFlags.enable_analytics ? [{
            icon: 'BarChart3',
            label: t('panel.quickActions.analytics') || 'Analytics',
            href: `/${lang}/panel/analiticas`,
            priority: ordersThisMonth >= 5 ? 50 : 2,
        }] : []),
        ...(featureFlags.enable_pos ? [{
            icon: 'Store',
            label: t('panel.quickActions.pos') || 'POS',
            href: `/${lang}/panel/pos`,
            priority: 40,
        }] : []),
        ...(featureFlags.enable_crm ? [{
            icon: 'UserCheck',
            label: t('panel.quickActions.crm') || 'CRM',
            href: `/${lang}/panel/crm`,
            priority: 35,
        }] : []),
    ].sort((a, b) => b.priority - a.priority).slice(0, 5)

    // ── Activity Feed ──
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

    return {
        metrics,
        appConfig,
        storeConfig,
        featureFlags,
        planLimits,
        tenantId,
        lang,
        productCount,
        categoryCount,
        ordersThisMonth,
        customerCount,
        adminCount,
        medusaDegraded,
        revenue,
        recentOrders,
        monthOrders,
        topProducts,
        lowStockItems,
        pendingOrderCount,
        lowStockCount,
        realMeters,
        extendedMeters,
        gamification: {
            readiness,
            achievementsGrouped,
            unlockedIds,
            storedAchievements,
            smartTips,
            activeModuleCount,
        },
        activityEvents,
        quickActions,
        moduleInfoList,
        t,
        dictionary,
    }
}
