/**
 * Owner Panel Dashboard
 *
 * Displays: 4 stat cards, usage meters for plan limits,
 * and recent orders from Medusa Admin API.
 */

import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/limits'
import {
    getProductCount,
    getCategoryCount,
    getOrdersThisMonth,
    getRecentOrders,
} from '@/lib/medusa/admin'
import StatCard from '@/components/panel/StatCard'
import UsageMeter from '@/components/panel/UsageMeter'
import { Package, ShoppingCart, Users, FolderTree } from 'lucide-react'

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
    const { planLimits } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Fetch counts in parallel
    const [productCount, categoryCount, ordersThisMonth, recentOrders, customerCountRes] =
        await Promise.all([
            getProductCount(),
            getCategoryCount(),
            getOrdersThisMonth(),
            getRecentOrders(5),
            (await createClient()).from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', getRequiredTenantId()).eq('role', 'customer'),
        ])

    const customerCount = customerCountRes.count ?? 0

    // Usage meter data
    const usageMeters = [
        { label: t('panel.usage.products'), result: checkLimit(planLimits, 'max_products', productCount) },
        { label: t('panel.usage.categories'), result: checkLimit(planLimits, 'max_categories', categoryCount) },
        { label: t('panel.usage.ordersMonth'), result: checkLimit(planLimits, 'max_orders_month', ordersThisMonth) },
        { label: t('panel.usage.customers'), result: checkLimit(planLimits, 'max_customers', customerCount) },
    ]

    return (
        <div className="space-y-8">
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
                    {usageMeters.map((meter) => (
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
