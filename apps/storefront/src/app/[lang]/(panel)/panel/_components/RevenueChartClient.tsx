'use client'

/**
 * RevenueChartClient — SOTA 30-day canvas chart.
 *
 * Pure CSS + Canvas implementation — no external chart library.
 * Features:
 *   - Gradient area fill under the revenue curve
 *   - Order count bars overlay
 *   - Hover tooltip with day detail
 *   - Collapsible POS/Online split badge
 *   - Responsive canvas sizing
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { SotaGlassCard } from '@/components/panel'
import { formatAmount } from '@/lib/currency-engine'

export interface RevenueByDayEntry {
    date: string
    primaryAmount: number
    totalOrders: number
}

interface Props {
    ordersByDay: { date: string; orders: number }[]
    revenueByDay: RevenueByDayEntry[]
    formattedRevenue: string
    hasPosOrders: boolean
    posPrimary: number
    onlinePrimary: number
    primaryCurrency: string
    lang: string
    labels: {
        title: string
        orders: string
        last30: string
        pos: string
        online: string
        noData: string
    }
}

export default function RevenueChartClient({
    ordersByDay, revenueByDay, formattedRevenue,
    hasPosOrders, posPrimary, onlinePrimary, primaryCurrency,
    lang, labels,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{ x: number; date: string; revenue: string; orders: number } | null>(null)
    const [showSplit, setShowSplit] = useState(false)

    const hasData = ordersByDay.some(d => d.orders > 0) || revenueByDay.some(d => d.primaryAmount > 0)

    const drawChart = useCallback(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const dpr = window.devicePixelRatio || 1
        const rect = container.getBoundingClientRect()
        const w = rect.width
        const h = 180

        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, w, h)

        const padding = { top: 10, right: 12, bottom: 24, left: 12 }
        const chartW = w - padding.left - padding.right
        const chartH = h - padding.top - padding.bottom

        const days = ordersByDay.length
        if (days === 0) return

        // Revenue data per day (primary currency)
        const revValues = revenueByDay.map(d => d.primaryAmount)
        const orderValues = ordersByDay.map(d => d.orders)

        const maxRev = Math.max(...revValues, 1)
        const maxOrders = Math.max(...orderValues, 1)

        const stepX = chartW / (days - 1 || 1)

        // ── Order bars (background) ──
        const barWidth = Math.max(4, stepX * 0.4)
        ctx.fillStyle = 'rgba(99, 102, 241, 0.12)'
        for (let i = 0; i < days; i++) {
            const x = padding.left + i * stepX - barWidth / 2
            const barH = (orderValues[i] / maxOrders) * chartH * 0.6
            ctx.fillRect(x, padding.top + chartH - barH, barWidth, barH)
        }

        // ── Revenue curve ──
        const points: [number, number][] = revValues.map((v, i) => [
            padding.left + i * stepX,
            padding.top + chartH - (v / maxRev) * chartH * 0.85,
        ])

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH)
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)')
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.02)')

        ctx.beginPath()
        ctx.moveTo(points[0][0], padding.top + chartH)
        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                ctx.lineTo(points[i][0], points[i][1])
            } else {
                const cpx = (points[i - 1][0] + points[i][0]) / 2
                ctx.bezierCurveTo(cpx, points[i - 1][1], cpx, points[i][1], points[i][0], points[i][1])
            }
        }
        ctx.lineTo(points[points.length - 1][0], padding.top + chartH)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        // Line
        ctx.beginPath()
        for (let i = 0; i < points.length; i++) {
            if (i === 0) {
                ctx.moveTo(points[i][0], points[i][1])
            } else {
                const cpx = (points[i - 1][0] + points[i][0]) / 2
                ctx.bezierCurveTo(cpx, points[i - 1][1], cpx, points[i][1], points[i][0], points[i][1])
            }
        }
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 2
        ctx.stroke()

        // ── X-axis labels (every 5th day) ──
        ctx.fillStyle = 'rgba(150, 150, 150, 0.6)'
        ctx.font = '10px system-ui'
        ctx.textAlign = 'center'
        for (let i = 0; i < days; i += 5) {
            const d = new Date(ordersByDay[i].date)
            const label = `${d.getDate()}/${d.getMonth() + 1}`
            ctx.fillText(label, padding.left + i * stepX, h - 4)
        }
    }, [ordersByDay, revenueByDay, primaryCurrency])

    useEffect(() => {
        drawChart()
        const handler = () => drawChart()
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [drawChart])

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const days = ordersByDay.length
        const padding = 12
        const chartW = rect.width - padding * 2
        const idx = Math.round((x - padding) / (chartW / (days - 1 || 1)))
        if (idx >= 0 && idx < days) {
            const revDay = revenueByDay[idx]
            setTooltip({
                x: padding + idx * (chartW / (days - 1 || 1)),
                date: new Date(ordersByDay[idx].date).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' }),
                revenue: formatAmount(revDay?.primaryAmount ?? 0, primaryCurrency, lang),
                orders: ordersByDay[idx].orders,
            })
        }
    }

    return (
        <SotaGlassCard className="relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div>
                    <h3 className="text-sm font-bold text-tx">{labels.title}</h3>
                    <p className="text-2xl font-bold text-tx tracking-tight mt-0.5">{formattedRevenue}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-tx-muted bg-sf-1 px-2 py-0.5 rounded-full border border-sf-2">
                        {labels.last30}
                    </span>
                    {hasPosOrders && (
                        <button
                            onClick={() => setShowSplit(!showSplit)}
                            className="text-[10px] font-semibold text-tx-sec bg-sf-1 px-2 py-0.5 rounded-full border border-sf-2 hover:bg-sf-2/50 transition-colors"
                        >
                            {showSplit ? '✕' : 'POS / Online'}
                        </button>
                    )}
                </div>
            </div>

            {/* POS/Online split (collapsed by default) */}
            {showSplit && hasPosOrders && (
                <div className="flex items-center gap-4 mb-3 px-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-semibold text-tx-muted">
                            {labels.pos}: {formatAmount(posPrimary, primaryCurrency, lang)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[11px] font-semibold text-tx-muted">
                            {labels.online}: {formatAmount(onlinePrimary, primaryCurrency, lang)}
                        </span>
                    </div>
                </div>
            )}

            {/* Chart */}
            {hasData ? (
                <div ref={containerRef} className="relative w-full">
                    <canvas
                        ref={canvasRef}
                        className="w-full cursor-crosshair"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setTooltip(null)}
                    />
                    {/* Tooltip */}
                    {tooltip && (
                        <div
                            className="absolute top-0 bg-sf-0/95 backdrop-blur-md border border-sf-2 rounded-lg px-3 py-2 shadow-xl pointer-events-none z-10 transition-all duration-100"
                            style={{ left: Math.min(tooltip.x, (containerRef.current?.offsetWidth ?? 200) - 140), transform: 'translateX(-50%)' }}
                        >
                            <p className="text-[10px] font-medium text-tx-muted capitalize">{tooltip.date}</p>
                            <p className="text-sm font-bold text-tx">{tooltip.revenue}</p>
                            <p className="text-[10px] text-tx-sec">{tooltip.orders} {labels.orders.toLowerCase()}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center h-[180px] text-sm text-tx-muted font-medium">
                    {labels.noData}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 px-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-tx-muted font-medium">{labels.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-indigo-500/15" />
                    <span className="text-[10px] text-tx-muted font-medium">{labels.orders}</span>
                </div>
            </div>
        </SotaGlassCard>
    )
}
