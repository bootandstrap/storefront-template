'use client'

/**
 * TierProgressBar — WoW-style talent point progression
 * Shows tier dots with current progress indicator.
 */

interface TierProgressBarProps {
    totalTiers: number
    activeTiers: number  // 0 = none, 1+ = which tier is active
    tierNames?: string[]
    compact?: boolean
}

export function TierProgressBar({ totalTiers, activeTiers, tierNames, compact = false }: TierProgressBarProps) {
    if (totalTiers === 0) return null

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: totalTiers }, (_, i) => {
                const isActive = i < activeTiers
                const isCurrent = i === activeTiers - 1
                const isNext = i === activeTiers

                return (
                    <div key={i} className="flex items-center gap-1">
                        {/* Dot */}
                        <div
                            className={`
                                relative rounded-full transition-all duration-300
                                ${compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}
                                ${isActive
                                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                                    : isNext
                                        ? 'bg-slate-300 ring-2 ring-emerald-200 ring-offset-1'
                                        : 'bg-slate-200'
                                }
                            `}
                            title={tierNames?.[i] ?? `Tier ${i + 1}`}
                        >
                            {/* Current tier pulse */}
                            {isCurrent && (
                                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25" />
                            )}
                        </div>

                        {/* Connector line between dots */}
                        {i < totalTiers - 1 && (
                            <div
                                className={`
                                    transition-all duration-300
                                    ${compact ? 'w-2 h-0.5' : 'w-4 h-0.5'}
                                    ${isActive ? 'bg-emerald-300' : 'bg-slate-200'}
                                `}
                            />
                        )}
                    </div>
                )
            })}
            {/* Counter */}
            {!compact && (
                <span className="text-[10px] font-bold text-slate-400 ml-1">
                    {activeTiers}/{totalTiers}
                </span>
            )}
        </div>
    )
}
