'use client'

/**
 * PanelLanguageSwitch — Compact language picker for the Owner Panel topbar
 *
 * Independent from the storefront LanguageSelector. This controls
 * the panel_language config field, which determines the panel UI language.
 * Persists via savePanelLanguageAction and triggers a full page navigation
 * to the new locale to re-render all server components.
 */

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { savePanelLanguageAction } from '@/app/[lang]/(panel)/panel/actions'

interface PanelLanguageSwitchProps {
    currentLang: string
}

export default function PanelLanguageSwitch({ currentLang }: PanelLanguageSwitchProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const ref = useRef<HTMLDivElement>(null)
    const router = useRouter()

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

    const current = LOCALE_LABELS[currentLang as Locale] ?? LOCALE_LABELS.es

    function handleSwitch(newLang: Locale) {
        if (newLang === currentLang) {
            setOpen(false)
            return
        }

        setOpen(false)
        startTransition(async () => {
            // Persist the new panel language
            const res = await savePanelLanguageAction(newLang)
            if (!res.success) {
                alert('Language change failed: ' + (res.error || 'Unknown error'))
                return
            }
            // Navigate to the same panel route but with the new locale
            const currentPath = window.location.pathname
            const newPath = currentPath.replace(`/${currentLang}/`, `/${newLang}/`)
            router.push(newPath)
            router.refresh()
        })
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-tx-sec hover:text-brand hover:bg-sf-1 transition-all disabled:opacity-50"
                aria-label="Panel language"
            >
                <Globe className="w-4 h-4" />
                <span className="text-base leading-none">{current.flag}</span>
                <span className="hidden sm:inline uppercase text-[11px] font-bold tracking-wider">{currentLang}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 py-1 min-w-[180px] glass-premium rounded-xl border border-sf-2 shadow-2xl z-50 animate-fade-in">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-tx-muted font-semibold">
                        Panel language
                    </div>
                    {SUPPORTED_LOCALES.map((l) => {
                        const info = LOCALE_LABELS[l]
                        const isActive = l === currentLang
                        return (
                            <button
                                key={l}
                                onClick={() => handleSwitch(l)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${isActive
                                    ? 'bg-brand-subtle text-brand font-semibold'
                                    : 'text-tx-sec hover:bg-sf-1 hover:text-tx'
                                    }`}
                            >
                                <span className="text-base">{info.flag}</span>
                                <span>{info.label}</span>
                                {isActive && (
                                    <span className="ml-auto text-brand text-xs">✓</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
