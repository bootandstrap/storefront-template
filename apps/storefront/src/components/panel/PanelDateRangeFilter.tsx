'use client'

/**
 * PanelDateRangeFilter — Date range picker with preset options
 *
 * Provides quick presets (7d, 30d, 90d, YTD) and a custom date range picker.
 * Used in Analytics, Orders, Revenue pages.
 *
 * Usage:
 *   <PanelDateRangeFilter value={range} onChange={setRange} />
 */

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

export interface DateRange {
    from: Date
    to: Date
    preset: string
}

interface PanelDateRangeFilterProps {
    value: DateRange
    onChange: (range: DateRange) => void
    /** Custom presets override */
    presets?: { id: string; label: string; days: number }[]
    /** Additional className */
    className?: string
}

const DEFAULT_PRESETS = [
    { id: '7d', label: '7 días', days: 7 },
    { id: '30d', label: '30 días', days: 30 },
    { id: '90d', label: '90 días', days: 90 },
    { id: 'ytd', label: 'Este año', days: -1 },
]

function getPresetRange(preset: { id: string; days: number }): { from: Date; to: Date } {
    const to = new Date()
    to.setHours(23, 59, 59, 999)

    if (preset.id === 'ytd') {
        const from = new Date(to.getFullYear(), 0, 1)
        return { from, to }
    }

    const from = new Date()
    from.setDate(from.getDate() - preset.days)
    from.setHours(0, 0, 0, 0)
    return { from, to }
}

export function getDefaultDateRange(): DateRange {
    const { from, to } = getPresetRange(DEFAULT_PRESETS[1]) // 30d default
    return { from, to, preset: '30d' }
}

export default function PanelDateRangeFilter({
    value,
    onChange,
    presets = DEFAULT_PRESETS,
    className = '',
}: PanelDateRangeFilterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const activePreset = presets.find(p => p.id === value.preset)
    const displayLabel = activePreset?.label || 'Personalizado'

    const handlePresetClick = (preset: typeof presets[0]) => {
        const { from, to } = getPresetRange(preset)
        onChange({ from, to, preset: preset.id })
        setIsOpen(false)
    }

    const handleCustomApply = () => {
        if (customFrom && customTo) {
            const from = new Date(customFrom)
            from.setHours(0, 0, 0, 0)
            const to = new Date(customTo)
            to.setHours(23, 59, 59, 999)
            onChange({ from, to, preset: 'custom' })
            setIsOpen(false)
        }
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sf-3 bg-sf-0 text-sm font-medium text-tx hover:bg-sf-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soft"
            >
                <Calendar className="w-4 h-4 text-tx-muted" />
                <span>{displayLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-tx-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 glass rounded-xl border border-sf-3 shadow-xl p-2 min-w-[240px] animate-fade-in-up">
                    {/* Presets */}
                    <div className="space-y-0.5 mb-2">
                        {presets.map(preset => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handlePresetClick(preset)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                    value.preset === preset.id
                                        ? 'bg-brand-subtle text-brand font-medium'
                                        : 'text-tx hover:bg-sf-1'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom range */}
                    <div className="border-t border-sf-3 pt-2 mt-2">
                        <p className="text-[11px] text-tx-faint uppercase tracking-wider font-semibold px-3 mb-2">
                            Personalizado
                        </p>
                        <div className="space-y-2 px-1">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={e => setCustomFrom(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft"
                            />
                            <input
                                type="date"
                                value={customTo}
                                onChange={e => setCustomTo(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft"
                            />
                            <button
                                type="button"
                                onClick={handleCustomApply}
                                disabled={!customFrom || !customTo}
                                className="w-full px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
