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
import StatCard from '@/components/panel/StatCard'
import UsageMeter from '@/components/panel/UsageMeter'
import { Package, ShoppingCart, Users, FolderTree, CheckCircle, ArrowRight, Circle } from 'lucide-react'
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

    // Usage meter data
    // Real metrics — backed by Medusa admin API and Supabase queries
    const realMeters = [
        { label: t('panel.usage.products'), result: checkLimit(planLimits, 'max_products', productCount) },
        { label: t('panel.usage.categories'), result: checkLimit(planLimits, 'max_categories', categoryCount) },
        { label: t('panel.usage.ordersMonth'), result: checkLimit(planLimits, 'max_orders_month', ordersThisMonth) },
        { label: t('panel.usage.customers'), result: checkLimit(planLimits, 'max_customers', customerCount) },
        { label: t('panel.usage.adminUsers'), result: checkLimit(planLimits, 'max_admin_users', adminCount) },
    ]

    // Load email and traffic stats (uses admin client for service-role access)
    let emailSendsThisMonth = 0
    let dailyPageViews = 0
    try {
        const admin = createAdminClient()
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

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

    // Storage estimate: ~2MB per product (avg images per product × avg image size)
    // This is an estimate — actual Supabase storage metering requires bucket-level API
    const estimatedStorageMb = Math.round(productCount * 2)

    // Meters backed by real data
    const extendedMeters = [
        { label: t('panel.usage.emailsMonth'), result: checkLimit(planLimits, 'max_email_sends_month', emailSendsThisMonth) },
        { label: t('panel.usage.trafficDay'), result: checkLimit(planLimits, 'max_requests_day', dailyPageViews) },
        { label: `${t('panel.usage.storage')} (est.)`, result: checkLimit(planLimits, 'storage_limit_mb', estimatedStorageMb) },
    ]

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

            {/* Store Readiness Checklist — shows after onboarding when store is new */}
            {storeConfig.onboarding_completed && (() => {
                const checklistItems = [
                    {
                        id: 'product',
                        label: t('panel.checklist.addProduct') || 'Add your first product',
                        done: productCount > 0,
                        href: `/${lang}/panel/catalogo`,
                    },
                    {
                        id: 'logo',
                        label: t('panel.checklist.setLogo') || 'Set up your store appearance',
                        done: !!storeConfig.logo_url,
                        href: `/${lang}/panel/tienda`,
                    },
                    {
                        id: 'payments',
                        label: t('panel.checklist.configPayments') || 'Review payment methods',
                        done: featureFlags.enable_whatsapp_checkout || featureFlags.enable_online_payments || featureFlags.enable_cash_on_delivery || featureFlags.enable_bank_transfer,
                        href: `/${lang}/panel/tienda`,
                    },
                    {
                        id: 'contact',
                        label: t('panel.checklist.setContact') || 'Add contact information',
                        done: !!storeConfig.whatsapp_number || !!storeConfig.store_email,
                        href: `/${lang}/panel/tienda`,
                    },
                    {
                        id: 'publish',
                        label: t('panel.checklist.publish') || 'Publish your store',
                        done: !featureFlags.enable_maintenance_mode,
                        href: `/${lang}/panel/tienda`,
                    },
                ]
                const completedCount = checklistItems.filter(i => i.done).length
                const allDone = completedCount === checklistItems.length
                if (allDone) return null
                const progress = (completedCount / checklistItems.length) * 100

                return (
                    <div className="glass rounded-2xl p-6 border border-primary/20">
                        <div className="flex items-center gap-4 mb-5">
                            {/* Progress ring */}
                            <div className="relative w-14 h-14 flex-shrink-0">
                                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" className="text-surface-3" strokeWidth="4" />
                                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" className="text-primary transition-all duration-700" strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray={`${progress * 1.508} 150.8`} />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-primary">
                                    {completedCount}/{checklistItems.length}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold font-display text-text-primary">
                                    {t('panel.checklist.title') || '🚀 Getting Started'}
                                </h2>
                                <p className="text-sm text-text-muted">
                                    {t('panel.checklist.subtitle') || 'Complete these steps to launch your store'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {checklistItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${item.done
                                        ? 'bg-green-500/5 text-text-secondary'
                                        : 'bg-surface-2/50 hover:bg-primary/5 text-text-primary'
                                        }`}
                                >
                                    {item.done ? (
                                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-text-muted/40 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm font-medium flex-1 ${item.done ? 'line-through opacity-60' : ''}`}>
                                        {item.label}
                                    </span>
                                    {!item.done && <ArrowRight className="w-4 h-4 text-text-muted" />}
                                </Link>
                            ))}
                        </div>
                    </div>
                )
            })()}

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label={t('panel.stats.products')}
                    value={productCount}
                    icon={<Package className="w-5 h-5" />}
                />
                <StatCard
                    label={t('panel.stats.ordersMonth')}
                    value={ordersThisMonth}
                    icon={<ShoppingCart className="w-5 h-5" />}
                />
                <StatCard
                    label={t('panel.stats.customers')}
                    value={customerCount}
                    icon={<Users className="w-5 h-5" />}
                />
                <StatCard
                    label={t('panel.stats.categories')}
                    value={categoryCount}
                    icon={<FolderTree className="w-5 h-5" />}
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
                <h2 className="text-lg font-bold font-display text-text-primary mb-4">
                    {t('panel.dashboard.recentOrders')}
                </h2>
                {recentOrders.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                        <p className="text-text-muted">{t('panel.dashboard.noOrders')}</p>
                    </div>
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
                                    <th className="text-left px-4 py-3 font-medium">
                                        {t('panel.dashboard.status')}
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium">
                                        {t('panel.dashboard.total')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="border-b border-surface-2 last:border-0">
                                        <td className="px-4 py-3 font-medium text-text-primary">
                                            #{order.display_id}
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary">
                                            {order.customer
                                                ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() || order.customer.email
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
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
