import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { checkLimit } from '@/lib/limits'
import { requirePanelAuth } from '@/lib/panel-auth'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import {
    getProductCount,
    getCategoryCount,
    getOrdersThisMonth,
    getRecentOrders,
} from '@/lib/medusa/admin'
import StatCard from '@/components/panel/StatCard'
import UsageMeter from '@/components/panel/UsageMeter'
import { Package, ShoppingCart, Users, FolderTree } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

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
    const { tenantId } = await requirePanelAuth()
    const { planLimits } = await getConfigForTenant(tenantId)
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

    // Pending metrics — data sources not yet available in storefront
    // These show the limit but mark current usage as "not tracked yet"
    // TODO: daily traffic → query analytics_daily_summary.page_views (needs analytics module active + table deployed)
    // TODO: storage → query Supabase Storage bucket usage for tenant (needs storage instrumentation)
    // TODO: emails → query email_sends counter table (needs transactional email tracking)
    const pendingMeters = [
        { label: t('panel.usage.trafficDay'), result: checkLimit(planLimits, 'max_requests_day', 0), pending: true },
        { label: t('panel.usage.storage'), result: checkLimit(planLimits, 'storage_limit_mb', 0), pending: true },
        { label: t('panel.usage.emailsMonth'), result: checkLimit(planLimits, 'max_email_sends_month', 0), pending: true },
    ]

    return (
        <div className="space-y-8">
            {/* Medusa degraded banner */}
            {medusaDegraded && (
                <div className="rounded-xl border border-amber-300/30 bg-amber-50/10 px-4 py-3 text-sm text-amber-700">
                    ⚠️ Medusa no está conectado — las estadísticas de productos, pedidos y categorías no están disponibles.
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
                    {realMeters.map((meter) => (
                        <UsageMeter
                            key={meter.label}
                            label={meter.label}
                            result={meter.result}
                        />
                    ))}
                </div>
                {pendingMeters.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 opacity-60">
                        {pendingMeters.map((meter) => (
                            <UsageMeter
                                key={meter.label}
                                label={`${meter.label} (${t('panel.usage.comingSoon') || 'Próximamente'})`}
                                result={meter.result}
                            />
                        ))}
                    </div>
                )}
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
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-text-primary">
                                            {new Intl.NumberFormat('en', {
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
