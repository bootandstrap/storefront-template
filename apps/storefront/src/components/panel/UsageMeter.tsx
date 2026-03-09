import type { LimitCheckResult } from '@/lib/limits'
import { getLimitSeverity } from '@/lib/limits'

interface UsageMeterProps {
    label: string
    result: LimitCheckResult
    unit?: string
    /** Optional upgrade link for when usage is high */
    upgradeHref?: string
    upgradeLabel?: string
}

export default function UsageMeter({
    label,
    result,
    unit = '',
    upgradeHref,
    upgradeLabel,
}: UsageMeterProps) {
    const severity = getLimitSeverity(result)

    const barColor = {
        ok: 'bg-green-500',
        warning: 'bg-amber-500',
        critical: 'bg-red-500',
    }[severity]

    const textColor = {
        ok: 'text-green-600',
        warning: 'text-amber-600',
        critical: 'text-red-600',
    }[severity]

    const isCritical = severity === 'critical'

    return (
        <div className={`glass rounded-xl p-4 transition-all duration-300 ${isCritical ? 'usage-critical' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary">{label}</span>
                <span className={`text-sm font-bold ${textColor}`}>
                    {result.current}{unit} / {result.limit}{unit}
                </span>
            </div>

            {/* Progress bar with animated width */}
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                    style={{ width: `${Math.min(result.percentage, 100)}%` }}
                />
            </div>

            {/* Status row */}
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-text-muted">
                    {result.remaining} {unit} remaining
                </span>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${textColor}`}>
                        {result.percentage}%
                    </span>
                    {/* Show upgrade CTA when usage is high */}
                    {severity !== 'ok' && upgradeHref && upgradeLabel && (
                        <a
                            href={upgradeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-primary hover:underline"
                        >
                            {upgradeLabel} →
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}
