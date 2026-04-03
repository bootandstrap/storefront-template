import DashboardChart from './DashboardChart'
import SectionHeader from '@/components/panel/SectionHeader'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import { SotaMetric } from '@/components/panel/sota/SotaMetric'
import { AnimatedStatValue, AnimatedStringValue } from '@/components/panel/AnimatedStatValue'
import {
    Package,
    ShoppingCart,
    Users,
    FolderTree,
    DollarSign,
    BarChart3,
} from 'lucide-react'

interface DashboardMetricsPanelProps {
    formattedRevenue: string
    ordersThisMonth: number
    sparklineOrders: number[]
    productCount: number
    customerCount: number
    categoryCount: number
    revenueByDay: { date: string; revenue: number }[]
    ordersByDay: { date: string; orders: number }[]
    currency: string
    lang: string
    labels: {
        statsTitle: string
        revenue: string
        ordersMonth: string
        products: string
        customers: string
        categories: string
        chartTitle: string
    }
}

export default function DashboardMetricsPanel({
    formattedRevenue,
    ordersThisMonth,
    sparklineOrders,
    productCount,
    customerCount,
    categoryCount,
    revenueByDay,
    ordersByDay,
    currency,
    lang,
    labels,
}: DashboardMetricsPanelProps) {
    return (
        <div className="space-y-8">
            {/* ── Key Metrics ── */}
            <div>
                <SectionHeader
                    title={labels.statsTitle}
                    icon={<BarChart3 className="w-5 h-5" />}
                    accent
                />
                
                <SotaBentoGrid className="mt-6">
                    {/* Hero row: Revenue + Orders */}
                    <SotaBentoItem colSpan={{ base: 12, lg: 6 }}>
                        <SotaMetric
                            label={labels.revenue}
                            value={formattedRevenue}
                            icon={<DollarSign className="w-6 h-6" />}
                            glowColor="emerald"
                            accentColor="#16a34a"
                            href={`/${lang}/panel/pedidos`}
                        />
                    </SotaBentoItem>
                    
                    <SotaBentoItem colSpan={{ base: 12, lg: 6 }}>
                        <SotaMetric
                            label={labels.ordersMonth}
                            value={ordersThisMonth}
                            locale={lang}
                            icon={<ShoppingCart className="w-6 h-6" />}
                            sparklineData={sparklineOrders}
                            glowColor="blue"
                            accentColor="#8BC34A"
                            href={`/${lang}/panel/pedidos`}
                        />
                    </SotaBentoItem>

                    {/* Secondary row: Products, Customers, Categories */}
                    <SotaBentoItem colSpan={{ base: 12, sm: 4 }}>
                        <SotaMetric
                            label={labels.products}
                            value={productCount}
                            locale={lang}
                            icon={<Package className="w-5 h-5" />}
                            glowColor="purple"
                            accentColor="#6366f1"
                            href={`/${lang}/panel/catalogo`}
                        />
                    </SotaBentoItem>
                    
                    <SotaBentoItem colSpan={{ base: 12, sm: 4 }}>
                        <SotaMetric
                            label={labels.customers}
                            value={customerCount}
                            locale={lang}
                            icon={<Users className="w-5 h-5" />}
                            glowColor="brand"
                            accentColor="#0ea5e9"
                            href={`/${lang}/panel/clientes`}
                        />
                    </SotaBentoItem>
                    
                    <SotaBentoItem colSpan={{ base: 12, sm: 4 }}>
                        <SotaMetric
                            label={labels.categories}
                            value={categoryCount}
                            locale={lang}
                            icon={<FolderTree className="w-5 h-5" />}
                            glowColor="gold"
                            accentColor="#f59e0b"
                            href={`/${lang}/panel/categorias`}
                        />
                    </SotaBentoItem>
                </SotaBentoGrid>
            </div>

            {/* ── Revenue & Orders Chart ── */}
            <SotaBentoGrid>
                <SotaBentoItem colSpan={12}>
                    <SotaGlassCard glowColor="brand" className="p-1 sm:p-5">
                        <SectionHeader
                            title={labels.chartTitle}
                            icon={<BarChart3 className="w-5 h-5" />}
                        />
                        <div className="mt-4">
                            <DashboardChart
                                revenueByDay={revenueByDay}
                                ordersByDay={ordersByDay}
                                currency={currency}
                                lang={lang}
                                labels={{
                                    revenue: labels.revenue,
                                    orders: labels.ordersMonth,
                                    chartTitle: labels.chartTitle,
                                }}
                            />
                        </div>
                    </SotaGlassCard>
                </SotaBentoItem>
            </SotaBentoGrid>
        </div>
    )
}
