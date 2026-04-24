/**
 * KPIRow — Revenue, Orders, Products, Customers, Categories metrics
 *
 * Extracted from dashboard monolith. Shows primary KPIs with sparklines,
 * multi-currency sub-badges, and POS vs Online revenue split.
 */

import Link from 'next/link'
import {
    DollarSign,
    ShoppingCart,
    Package,
    Users,
    FolderTree,
} from 'lucide-react'
import { SotaBentoItem, SotaMetric } from '@/components/panel'
import { formatAmount } from '@/lib/currency-engine'
import type { DashboardContext } from '../_lib/dashboard-context'

interface KPIRowProps {
    ctx: DashboardContext
}

export default function KPIRow({ ctx }: KPIRowProps) {
    const { lang, t, productCount, categoryCount, ordersThisMonth, customerCount, revenue } = ctx
    const {
        formattedRevenue, secondaryRevenues, hasPosOrders,
        posPrimary, onlinePrimary, sparklineOrders, currencyCtx,
    } = revenue

    return (
        <>
            <SotaBentoItem colSpan={{ base: 12, sm: 6 }}>
                <SotaMetric
                    label={t('panel.stats.revenue') || 'Revenue'}
                    value={formattedRevenue}
                    icon={<DollarSign className="w-6 h-6" />}
                    href={`/${lang}/panel/pedidos`}
                    accentColor="#16a34a"
                    footer={
                        <>
                            {/* Multi-currency sub-badges */}
                            {secondaryRevenues.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {secondaryRevenues.map(r => (
                                        <span key={r.code} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sf-2/80 text-tx-sec border border-sf-3/30">
                                            {formatAmount(r.amount, r.code, lang)}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* POS vs Online revenue split */}
                            {hasPosOrders && (
                                <div className={`flex items-center gap-3 ${secondaryRevenues.length > 0 ? 'mt-2' : ''}`}>
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
                        </>
                    }
                />
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
        </>
    )
}
