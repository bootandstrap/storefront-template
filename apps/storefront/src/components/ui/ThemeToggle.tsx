'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

/**
 * ThemeToggle — cycles between light / dark / auto (OS preference).
 *
 * How it works:
 * 1. Reads persisted preference from localStorage
 * 2. Applies .dark class and data-theme attribute to <html>
 * 3. 'auto' respects prefers-color-scheme media query via CSS (data-theme="auto")
 *
 * The CSS tokens in globals.css handle the actual color changes:
 * - .dark { ... }                      → explicit dark
 * - [data-theme="auto"] @media(dark)   → system dark
 */

type Theme = 'light' | 'dark' | 'auto'

const THEMES: Theme[] = ['light', 'dark', 'auto']
const STORAGE_KEY = 'theme-preference'

const ICONS: Record<Theme, typeof Sun> = {
    light: Sun,
    dark: Moon,
    auto: Monitor,
}

const LABELS: Record<Theme, string> = {
    light: 'Light mode',
    dark: 'Dark mode',
    auto: 'System theme',
}

function getSystemDark(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme) {
    const html = document.documentElement
    html.setAttribute('data-theme', theme)

    if (theme === 'dark' || (theme === 'auto' && getSystemDark())) {
        html.classList.add('dark')
    } else {
        html.classList.remove('dark')
    }
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    // Initialize from localStorage + server-rendered data-theme
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
        const current = document.documentElement.getAttribute('data-theme') as Theme | null

        // Priority: localStorage > server-rendered data-theme > 'light'
        const resolved = stored || current || 'light'
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(resolved as Theme)
        applyTheme(resolved as Theme)
        setMounted(true)
    }, [])

    // Listen for system theme changes when in auto mode
    useEffect(() => {
        if (theme !== 'auto') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => applyTheme('auto')
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme])

    const cycle = useCallback(() => {
        const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length
        const next = THEMES[nextIndex]
        setTheme(next)
        applyTheme(next)
        localStorage.setItem(STORAGE_KEY, next)
    }, [theme])

    // Prevent hydration mismatch — show nothing until mounted
    if (!mounted) return <div className="w-8 h-8" />

    const Icon = ICONS[theme]

    return (
        <button
            onClick={cycle}
            className="p-2 rounded-full hover:bg-surface-1 transition-colors"
            aria-label={LABELS[theme]}
            title={LABELS[theme]}
        >
            <Icon className="w-4.5 h-4.5 text-text-secondary transition-transform duration-200 hover:rotate-12" />
        </button>
    )
}
