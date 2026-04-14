import React from 'react'
import { SotaGlassCard } from './SotaGlassCard'
import { AnimatedStatValue, AnimatedStringValue } from '../AnimatedStatValue'
import Link from 'next/link'
import MiniChart from '../MiniChart'

interface SotaMetricProps {
    label: string
    value: string | number
    icon: React.ReactNode
    isCurrency?: boolean
    locale?: string
    href?: string
    /** Subtitle text (e.g. 'este mes', 'this month') */
    subtitle?: string
    trend?: { value: number; label: string }
    sparklineData?: number[]
    accentColor?: string
    glowColor?: 'brand' | 'accent' | 'danger' | 'warning' | 'blue' | 'purple' | 'gold' | 'emerald' | 'none'
    className?: string
}

export function SotaMetric({
    label,
    value,
    icon,
    isCurrency,
    locale = 'es',
    href,
    subtitle,
    trend,
    sparklineData,
    accentColor = '#8BC34A',
    glowColor = 'brand',
    className = ''
}: SotaMetricProps) {
    const isString = typeof value === 'string'
    
    // Convert accentColor to Tailwind arbitrary value or use directly if valid
    
    const content = (
        <SotaGlassCard 
            className={`group h-full ${className}`} 
            glowColor={glowColor}
        >
            <div className="flex items-start justify-between gap-4 mb-4">
                <div 
                    className="p-3 rounded-2xl shadow-inner border border-sf-0/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                    style={{ 
                        background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`,
                        color: accentColor 
                    }}
                >
                    {icon}
                </div>
                
                {trend && (
                    <div className={trend.value >= 0 ? 'metric-trend-up' : 'metric-trend-down'}>
                        <span>{trend.value > 0 ? '↑' : '↓'}</span>
                        {Math.abs(trend.value)}%
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col justify-end">
                <h3 className="text-sm font-medium text-tx-sec opacity-80 uppercase tracking-widest mb-1.5">{label}</h3>
                <div className="sota-metric-value mb-1">
                    {isString ? (
                        <AnimatedStringValue value={value as string} />
                    ) : (
                        <AnimatedStatValue value={value as number} locale={locale} />
                    )}
                </div>
                {subtitle && (
                    <span className="text-[11px] text-tx-faint font-medium tracking-wide">{subtitle}</span>
                )}
            </div>

            {sparklineData && sparklineData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-sf-3/30 relative z-10 w-full h-12">
                    <MiniChart data={sparklineData} height={40} label={label} />
                </div>
            )}
        </SotaGlassCard>
    )

    if (href) {
        return (
            <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-2xl">
                {content}
            </Link>
        )
    }

    return <div className="h-full">{content}</div>
}
