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
    /** Accent color for icon background (default: brand green) */
    accentColor?: string
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
    accentColor,
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
        'stat-card-premium rounded-2xl',
        isHero
            ? 'bg-sf-0/50 backdrop-blur-md shadow-sm border border-brand-300 dark:border-brand-800 p-6'
            : isCompact
                ? 'bg-sf-0/50 backdrop-blur-md shadow-sm border border-sf-3/30 p-4'
                : 'bg-sf-0/50 backdrop-blur-md shadow-sm border border-sf-3/30 p-5',
        href ? 'cursor-pointer hover:bg-sf-1/50 transition-colors' : '',
        className,
    ].filter(Boolean).join(' ')

    const staggerStyle = stagger > 0
        ? { animationDelay: `${stagger * 80}ms` } as React.CSSProperties
        : undefined

    const content = (
        <div className={cardClasses} style={staggerStyle}>
            {/* Hero gradient accent line at top */}
            {isHero && (
                <div
                    className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60"
                    style={{
                        background: accentColor
                            ? `linear-gradient(90deg, ${accentColor}, transparent)`
                            : 'linear-gradient(90deg, #8BC34A, #2D5016, transparent)',
                    }}
                />
            )}

            <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isHero ? 'text-sm text-brand dark:text-brand-300' : 'text-sm text-tx-muted'}`}>
                        {label}
                    </p>
                    <p className={`font-bold font-display text-tx mt-1 tabular-nums tracking-tight ${isHero ? 'text-3xl lg:text-4xl' : isCompact ? 'text-xl' : 'text-2xl'}`}>
                        {value}
                    </p>
                    {trend && TrendIcon && (
                        <div className={`inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 rounded-full text-xs font-semibold ${trendClass} transition-transform duration-300`}>
                            <TrendIcon className="w-3.5 h-3.5" />
                            <span>{Math.abs(trend.value)}%</span>
                            <span className="text-[10px] font-medium opacity-70 ml-0.5">{trend.label}</span>
                        </div>
                    )}
                </div>

                {/* Icon ring with 3D float on hover */}
                <div
                    className={`stat-icon-ring flex-shrink-0 ${
                        isHero
                            ? 'p-3 rounded-2xl'
                            : 'p-2.5 rounded-xl'
                    }`}
                    style={{
                        background: accentColor
                            ? `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`
                            : undefined,
                        color: accentColor || undefined,
                    }}
                >
                    <div className={!accentColor ? 'bg-gradient-to-br from-brand-muted to-brand-subtle text-brand rounded-xl p-0.5' : ''}>
                        {icon}
                    </div>
                </div>
            </div>

            {/* Sparkline — 7 bars for weekly data */}
            {sparklineData && sparklineData.length > 0 && (
                <div className={`relative z-10 border-t border-sf-2 dark:border-sf-3/30 ${isHero ? 'mt-4 pt-4' : 'mt-3 pt-3'}`}>
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
