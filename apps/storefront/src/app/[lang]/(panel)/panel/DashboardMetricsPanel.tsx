import StatCard from '@/components/panel/StatCard'
import { AnimatedStatValue, AnimatedStringValue } from '@/components/panel/AnimatedStatValue'
import DashboardChart from './DashboardChart'
import SectionHeader from '@/components/panel/SectionHeader'
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
        <div className="space-y-10">
            {/* ── Key Metrics ── */}
            <div>
                <SectionHeader
                    title={labels.statsTitle}
                    icon={<BarChart3 className="w-4.5 h-4.5" />}
                />
                {/* Hero row: Revenue + Orders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <StatCard
                        label={labels.revenue}
                        value={<AnimatedStringValue value={formattedRevenue} />}
                        icon={<DollarSign className="w-6 h-6" />}
                        href={`/${lang}/panel/pedidos`}
                        variant="hero"
                        stagger={0}
                    />
                    <StatCard
                        label={labels.ordersMonth}
                        value={<AnimatedStatValue value={ordersThisMonth} locale={lang} />}
                        icon={<ShoppingCart className="w-6 h-6" />}
                        sparklineData={sparklineOrders}
                        href={`/${lang}/panel/pedidos`}
                        variant="hero"
                        stagger={1}
                    />
                </div>
                {/* Secondary row: Products, Customers, Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        label={labels.products}
                        value={<AnimatedStatValue value={productCount} locale={lang} />}
                        icon={<Package className="w-5 h-5" />}
                        href={`/${lang}/panel/catalogo`}
                        stagger={2}
                    />
                    <StatCard
                        label={labels.customers}
                        value={<AnimatedStatValue value={customerCount} locale={lang} />}
                        icon={<Users className="w-5 h-5" />}
                        href={`/${lang}/panel/clientes`}
                        stagger={3}
                    />
                    <StatCard
                        label={labels.categories}
                        value={<AnimatedStatValue value={categoryCount} locale={lang} />}
                        icon={<FolderTree className="w-5 h-5" />}
                        href={`/${lang}/panel/categorias`}
                        stagger={4}
                    />
                </div>
            </div>

            {/* ── Revenue & Orders Chart ── */}
            <div>
                <SectionHeader
                    title={labels.chartTitle}
                    icon={<BarChart3 className="w-4.5 h-4.5" />}
                />
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
        </div>
    )
}
