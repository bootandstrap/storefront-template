import Link from 'next/link'
import MiniChart from './MiniChart'
import {
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react'

interface StatCardProps {
    label: string
    value: string | number
    icon: React.ReactNode
    trend?: { value: number; label: string }
    /** 7 data points for a mini sparkline */
    sparklineData?: number[]
    /** Optional link destination — makes the card clickable */
    href?: string
    className?: string
}

export default function StatCard({
    label,
    value,
    icon,
    trend,
    sparklineData,
    href,
    className = '',
}: StatCardProps) {
    const TrendIcon = trend
        ? trend.value > 0
            ? TrendingUp
            : trend.value < 0
                ? TrendingDown
                : Minus
        : null

    const trendClass = trend
        ? trend.value > 0
            ? 'trend-up'
            : trend.value < 0
                ? 'trend-down'
                : 'trend-neutral'
        : ''

    const content = (
        <div className={`glass rounded-2xl p-5 transition-all duration-200 ${href ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-muted font-medium truncate">{label}</p>
                    <p className="text-2xl font-bold font-display text-text-primary mt-1 stat-value">
                        {value}
                    </p>
                    {trend && TrendIcon && (
                        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${trendClass}`}>
                            <TrendIcon className="w-3 h-3" />
                            <span>{Math.abs(trend.value)}%</span>
                            <span className="text-[10px] font-medium opacity-75">{trend.label}</span>
                        </div>
                    )}
                </div>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 text-primary flex-shrink-0">
                    {icon}
                </div>
            </div>

            {/* Sparkline — 7 bars for weekly data */}
            {sparklineData && sparklineData.length > 0 && (
                <div className="mt-3 pt-3 border-t border-surface-2">
                    <MiniChart data={sparklineData} height={28} label={`${label} trend`} />
                </div>
            )}
        </div>
    )

    if (href) {
        return <Link href={href} className="block">{content}</Link>
    }

    return content
}
