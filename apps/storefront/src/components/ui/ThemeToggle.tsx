'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * ThemeToggle — cycles between light → dark → system.
 * Powered by next-themes (no manual DOM manipulation needed).
 * Shows a smooth icon transition. Only renders after hydration.
 */
export default function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    // Prevent hydration mismatch — placeholder until mounted
    if (!mounted) return <div className="w-8 h-8" />

    const cycle = () => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
    }

    const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun
    const label =
        theme === 'dark' ? 'Dark mode' :
        theme === 'system' ? 'System theme' :
        'Light mode'

    return (
        <button
            onClick={cycle}
            className="p-2 rounded-full hover:bg-sf-1 transition-colors"
            aria-label={label}
            title={label}
        >
            <Icon className="w-4.5 h-4.5 text-tx-sec transition-transform duration-200 hover:rotate-12" />
        </button>
    )
}
