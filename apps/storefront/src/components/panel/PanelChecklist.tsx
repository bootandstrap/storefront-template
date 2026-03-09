'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Circle } from 'lucide-react'

export const PANEL_CHECKLIST_SKIPPED_KEY = 'panel_checklist_skipped'

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem'>

export function isChecklistSkipped(storage?: StorageReader | null): boolean {
    try {
        return storage?.getItem(PANEL_CHECKLIST_SKIPPED_KEY) === '1'
    } catch {
        return false
    }
}

export function markChecklistSkipped(storage?: StorageWriter | null): void {
    try {
        storage?.setItem(PANEL_CHECKLIST_SKIPPED_KEY, '1')
    } catch {
        // localStorage may be unavailable in private mode / hardened browsers
    }
}

export interface PanelChecklistItem {
    id: string
    label: string
    done: boolean
    href: string
}

interface PanelChecklistProps {
    items: PanelChecklistItem[]
    title: string
    subtitle: string
    skipLabel: string
}

export default function PanelChecklist({
    items,
    title,
    subtitle,
    skipLabel,
}: PanelChecklistProps) {
    const [hidden, setHidden] = useState(false)

    useEffect(() => {
        setHidden(isChecklistSkipped(window.localStorage))
    }, [])

    if (hidden || items.length === 0) return null

    const completedCount = items.filter(item => item.done).length
    if (completedCount === items.length) return null
    const progress = (completedCount / items.length) * 100

    return (
        <div className="glass rounded-2xl p-6 border border-primary/20">
            <div className="flex items-center gap-4 mb-5">
                <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" className="text-surface-3" strokeWidth="4" />
                        <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="currentColor"
                            className="text-primary transition-all duration-700"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${progress * 1.508} 150.8`}
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-primary">
                        {completedCount}/{items.length}
                    </span>
                </div>
                <div>
                    <h2 className="text-lg font-bold font-display text-text-primary">
                        {title}
                    </h2>
                    <p className="text-sm text-text-muted">
                        {subtitle}
                    </p>
                </div>
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${item.done
                            ? 'bg-green-500/5 text-text-secondary'
                            : 'bg-surface-2/50 hover:bg-primary/5 text-text-primary'
                            }`}
                    >
                        {item.done ? (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                            <Circle className="w-5 h-5 text-text-muted/40 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium flex-1 ${item.done ? 'line-through opacity-60' : ''}`}>
                            {item.label}
                        </span>
                        {!item.done && <ArrowRight className="w-4 h-4 text-text-muted" />}
                    </Link>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    onClick={() => {
                        markChecklistSkipped(window.localStorage)
                        setHidden(true)
                    }}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-2/60"
                >
                    {skipLabel}
                </button>
            </div>
        </div>
    )
}
