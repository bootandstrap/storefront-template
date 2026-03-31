'use client'

/**
 * PanelChart — Chart.js wrapper for Owner Panel
 *
 * Provides themed Bar, Line, and Doughnut chart presets.
 * Auto-reads brand CSS variables for consistent theming.
 * All charts are responsive and dark mode compatible.
 *
 * Usage:
 *   <PanelChart type="line" data={...} />
 *   <PanelChart type="bar" data={...} height={200} />
 *   <PanelChart type="doughnut" data={...} />
 */

import { useRef, useEffect, useMemo } from 'react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend
)

// ─── Types ──────────────────────────────────────────────────────────────────

type ChartType = 'bar' | 'line' | 'doughnut'

interface PanelChartProps {
    /** Chart type */
    type: ChartType
    /** Chart.js data object */
    data: ChartData<'bar'> | ChartData<'line'> | ChartData<'doughnut'>
    /** Optional Chart.js options override */
    options?: ChartOptions<'bar'> | ChartOptions<'line'> | ChartOptions<'doughnut'>
    /** Chart height in pixels (default: 250) */
    height?: number
    /** Hide legend (default: true for bar/line, false for doughnut) */
    hideLegend?: boolean
    /** Optional CSS class for the container */
    className?: string
    /** Accessible label */
    ariaLabel?: string
}

// ─── CSS Variable reader ────────────────────────────────────────────────────

function getCSSVar(name: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** Returns a palette of brand-harmonious colors for charts */
function useChartColors() {
    return useMemo(() => {
        const brand = getCSSVar('--color-brand', '#6366f1')
        return {
            brand,
            brandLight: getCSSVar('--color-brand-light', '#818cf8'),
            brandMuted: getCSSVar('--color-brand-muted', 'rgba(99,102,241,0.15)'),
            text: getCSSVar('--color-text-primary', '#1f2937'),
            textMuted: getCSSVar('--color-text-muted', '#6b7280'),
            border: getCSSVar('--color-surface-3', '#e5e7eb'),
            // Semantic colors for multi-series
            palette: [
                brand,
                getCSSVar('--color-success-500', '#22c55e'),
                getCSSVar('--color-warning-500', '#f59e0b'),
                getCSSVar('--color-error-500', '#ef4444'),
                '#8b5cf6', // violet
                '#06b6d4', // cyan
                '#ec4899', // pink
                '#f97316', // orange
            ],
        }
    }, [])
}

// ─── Default options ────────────────────────────────────────────────────────

function makeDefaultOptions(
    type: ChartType,
    colors: ReturnType<typeof useChartColors>,
    hideLegend: boolean
): ChartOptions<'bar'> | ChartOptions<'line'> | ChartOptions<'doughnut'> {
    const baseFont = {
        family: "'Inter', 'Outfit', system-ui, sans-serif",
        size: 12,
    }

    const gridColor = colors.border + '40' // 25% opacity

    if (type === 'doughnut') {
        return {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    display: !hideLegend,
                    position: 'bottom' as const,
                    labels: {
                        color: colors.textMuted,
                        font: baseFont,
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { ...baseFont, weight: 600 as const },
                    bodyFont: baseFont,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                },
            },
        } as ChartOptions<'doughnut'>
    }

    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
        plugins: {
            legend: {
                display: !hideLegend,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    color: colors.textMuted,
                    font: baseFont,
                    padding: 16,
                    usePointStyle: true,
                    pointStyleWidth: 8,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { ...baseFont, weight: 600 as const },
                bodyFont: baseFont,
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: colors.textMuted,
                    font: { ...baseFont, size: 11 },
                    maxRotation: 0,
                },
                border: {
                    display: false,
                },
            },
            y: {
                grid: {
                    color: gridColor,
                },
                ticks: {
                    color: colors.textMuted,
                    font: { ...baseFont, size: 11 },
                    padding: 8,
                },
                border: {
                    display: false,
                },
                beginAtZero: true,
            },
        },
    } as ChartOptions<'bar'>
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PanelChart({
    type,
    data,
    options: userOptions,
    height = 250,
    hideLegend,
    className = '',
    ariaLabel,
}: PanelChartProps) {
    const colors = useChartColors()
    const chartRef = useRef<ChartJS | null>(null)

    // Auto-determine legend visibility
    const legendHidden = hideLegend ?? (type !== 'doughnut')

    // Merge default options with user overrides
    const mergedOptions = useMemo(() => {
        const defaults = makeDefaultOptions(type, colors, legendHidden)
        if (!userOptions) return defaults
        return deepMerge(defaults, userOptions)
    }, [type, colors, legendHidden, userOptions])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            chartRef.current?.destroy()
        }
    }, [])

    const commonProps = {
        options: mergedOptions as never,
        data: data as never,
        height,
    }

    return (
        <div
            className={`relative ${className}`}
            style={{ height }}
            role="img"
            aria-label={ariaLabel || 'Chart'}
        >
            {type === 'bar' && <Bar {...commonProps} />}
            {type === 'line' && <Line {...commonProps} />}
            {type === 'doughnut' && <Doughnut {...commonProps} />}
        </div>
    )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Helper to create a standard line dataset with gradient fill
 */
export function makeLineDataset(
    label: string,
    data: number[],
    color?: string
) {
    const c = color || '#6366f1'
    return {
        label,
        data,
        borderColor: c,
        backgroundColor: c + '20',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: c,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
    }
}

/**
 * Helper to create a standard bar dataset
 */
export function makeBarDataset(
    label: string,
    data: number[],
    color?: string
) {
    const c = color || '#6366f1'
    return {
        label,
        data,
        backgroundColor: c + 'cc',
        hoverBackgroundColor: c,
        borderRadius: 6,
        borderSkipped: false as const,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
    }
}

/**
 * Helper to create a doughnut dataset
 */
export function makeDoughnutDataset(
    data: number[],
    colors?: string[]
) {
    const defaultColors = [
        '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
    ]
    const c = colors || defaultColors
    return {
        data,
        backgroundColor: c.slice(0, data.length),
        hoverBackgroundColor: c.slice(0, data.length).map(hex => hex + 'e6'),
        borderWidth: 0,
        hoverOffset: 4,
    }
}

// ─── Deep Merge ─────────────────────────────────────────────────────────────

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
    const output = { ...target } as Record<string, unknown>
    for (const key of Object.keys(source)) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === 'object' &&
            !Array.isArray(target[key])
        ) {
            output[key] = deepMerge(
                target[key] as Record<string, unknown>,
                source[key] as Record<string, unknown>
            )
        } else {
            output[key] = source[key]
        }
    }
    return output as T
}
