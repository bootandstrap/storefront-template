import Link from 'next/link'
import MiniChart from './MiniChart'
import {
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react'

interface StatCardProps {
    label: string
    value: React.ReactNode
    icon: React.ReactNode
    trend?: { value: number; label: string }
    /** 7 data points for a mini sparkline */
    sparklineData?: number[]
    /** Optional link destination — makes the card clickable */
    href?: string
    /** Visual variant */
    variant?: 'default' | 'hero' | 'compact'
    /** Stagger animation delay index (0-based) */
    stagger?: number
    className?: string
}

export default function StatCard({
    label,
    value,
    icon,
    trend,
    sparklineData,
    href,
    variant = 'default',
    stagger = 0,
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

    const isHero = variant === 'hero'
    const isCompact = variant === 'compact'

    const cardClasses = [
        'rounded-2xl transition-all duration-300',
        isHero
            ? 'glass-strong p-6 bg-gradient-to-br from-primary/5 via-surface-0 to-secondary/5 border border-primary/10 shadow-lg shadow-primary/5'
            : isCompact
                ? 'glass p-4'
                : 'glass p-5',
        href ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : '',
        className,
    ].filter(Boolean).join(' ')

    const staggerStyle = stagger > 0
        ? { animationDelay: `${stagger * 80}ms` } as React.CSSProperties
        : undefined

    const content = (
        <div className={cardClasses} style={staggerStyle}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isHero ? 'text-sm text-primary/80' : 'text-sm text-text-muted'}`}>
                        {label}
                    </p>
                    <p className={`font-bold font-display text-text-primary mt-1 stat-value ${isHero ? 'text-3xl lg:text-4xl' : isCompact ? 'text-xl' : 'text-2xl'}`}>
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
                <div className={`flex-shrink-0 flex items-center justify-center ${
                    isHero
                        ? 'p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/15 text-primary shadow-sm'
                        : 'p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 text-primary'
                }`}>
                    {icon}
                </div>
            </div>

            {/* Sparkline — 7 bars for weekly data */}
            {sparklineData && sparklineData.length > 0 && (
                <div className={`border-t border-surface-2 ${isHero ? 'mt-4 pt-4' : 'mt-3 pt-3'}`}>
                    <MiniChart data={sparklineData} height={isHero ? 36 : 28} label={`${label} trend`} />
                </div>
            )}
        </div>
    )

    if (href) {
        return <Link href={href} className="block animate-fade-in-up" style={staggerStyle}>{content}</Link>
    }

    return <div className="animate-fade-in-up" style={staggerStyle}>{content}</div>
}
