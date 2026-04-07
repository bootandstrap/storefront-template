'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * PanelThemeToggle — SOTA-styled dark mode toggle for the Owner Panel.
 *
 * Cycles: light → dark → system.
 * Uses the panel-scoped next-themes provider (storageKey: "panel-theme").
 * Designed for the topbar with glass-morphism styling.
 */
export default function PanelThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    // Prevent hydration mismatch
    if (!mounted) return <div className="w-8 h-8" />

    const cycle = () => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
    }

    const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun
    const label =
        theme === 'dark' ? 'Dark mode' :
        theme === 'system' ? 'System' :
        'Light mode'

    return (
        <button
            onClick={cycle}
            className="relative p-2 rounded-xl hover:bg-sf-1 border border-transparent hover:border-sf-3/30 transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
            aria-label={`Theme: ${label}`}
            title={label}
        >
            <Icon className="w-4 h-4 text-tx-sec transition-transform duration-300 group-hover:rotate-12 group-hover:text-brand" />
        </button>
    )
}
