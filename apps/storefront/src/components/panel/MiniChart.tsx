/**
 * MiniChart — CSS-only sparkline/bar chart
 *
 * Zero dependencies. Uses flexbox bars with CSS animations.
 * Designed for inline use in StatCards and dashboard widgets.
 */

interface MiniChartProps {
    /** Array of numeric values to visualize */
    data: number[]
    /** Chart height in pixels */
    height?: number
    /** Optional label for accessibility */
    label?: string
    /** CSS class for bar color override */
    className?: string
}

export default function MiniChart({
    data,
    height = 32,
    label = 'Chart',
    className = '',
}: MiniChartProps) {
    if (!data.length) return null

    const max = Math.max(...data, 1)

    return (
        <div
            className={`sparkline ${className}`}
            style={{ height }}
            role="img"
            aria-label={label}
        >
            {data.map((value, i) => (
                <div
                    key={i}
                    className="sparkline-bar"
                    style={{
                        height: `${Math.max((value / max) * 100, 4)}%`,
                        animationDelay: `${i * 50}ms`,
                    }}
                    title={String(value)}
                />
            ))}
        </div>
    )
}
