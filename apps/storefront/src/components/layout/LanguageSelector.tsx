'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { LOCALE_LABELS, type Locale } from '@/lib/i18n'

interface LanguageSelectorProps {
    activeLanguages: string[]
    maxLanguages?: number
}

export default function LanguageSelector({ activeLanguages, maxLanguages }: LanguageSelectorProps) {
    const { locale } = useI18n()
    const router = useRouter()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    // Filter to only active + valid locales, capped by plan limit
    let locales = activeLanguages.filter(
        (l): l is Locale => l in LOCALE_LABELS
    )
    if (maxLanguages && maxLanguages > 0) {
        locales = locales.slice(0, maxLanguages)
    }

    // Don't render if only 1 language
    if (locales.length <= 1) return null

    const current = LOCALE_LABELS[locale]

    function switchLocale(newLocale: Locale) {
        // Replace current locale segment in pathname: /es/productos → /en/productos
        const segments = pathname.split('/')
        // segments[0] is '', segments[1] is the current locale
        if (segments[1] && segments[1] in LOCALE_LABELS) {
            segments[1] = newLocale
        }
        const newPath = segments.join('/') || `/${newLocale}`
        setOpen(false)
        router.push(newPath)
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-primary hover:bg-surface-1 transition-all"
                aria-label="Change language"
            >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{current.flag}</span>
                <span className="uppercase text-xs font-bold">{locale}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[160px] glass-strong rounded-xl border border-surface-3/50 shadow-xl z-50 animate-slide-up">
                    {locales.map((l) => {
                        const info = LOCALE_LABELS[l]
                        const isActive = l === locale
                        return (
                            <button
                                key={l}
                                onClick={() => switchLocale(l)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
                                    }`}
                            >
                                <span className="text-lg">{info.flag}</span>
                                <span>{info.label}</span>
                                {isActive && (
                                    <span className="ml-auto text-primary text-xs">✓</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
