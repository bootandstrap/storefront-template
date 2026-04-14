'use client'

/**
 * PanelTopbar — SOTA 2026 Owner Panel Header
 *
 * Features:
 * - Time-of-day greeting with emoji + animated transition
 * - Breadcrumb with styled / divider + clickable root
 * - ⌘K search button (opens CommandPalette)
 * - Premium avatar dropdown with glass card
 * - Setup nudge with micro progress indicator
 * - Liquid glass background
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { Menu, LogOut, Store, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import OrderNotifications from '@/components/panel/OrderNotifications'
import PanelLanguageSwitch from '@/components/panel/PanelLanguageSwitch'
import PanelThemeToggle from '@/components/panel/PanelThemeToggle'

interface PanelTopbarProps {
    ownerName: string
    businessName: string
    lang: string
    breadcrumbMap: Record<string, string>
    greetings: {
        morning: string
        afternoon: string
        evening: string
    }
    labels: {
        ownerPanel: string
        backToStore: string
        logout: string
    }
    /** Optional setup nudge shown inline next to greeting */
    setupNudge?: {
        label: string   // e.g. "4 setup steps left"
        href: string    // links to dashboard
    } | null
    /** Governance SSOT currency for notification formatting */
    defaultCurrency: string
    onMenuClick: () => void
}

function getGreeting(greetings: PanelTopbarProps['greetings']): { text: string; emoji: string } {
    const hour = new Date().getHours()
    if (hour < 12) return { text: greetings.morning, emoji: '☀️' }
    if (hour < 18) return { text: greetings.afternoon, emoji: '🌤️' }
    return { text: greetings.evening, emoji: '🌙' }
}

export default function PanelTopbar({
    ownerName,
    businessName,
    lang,
    breadcrumbMap,
    greetings,
    labels,
    setupNudge,
    defaultCurrency,
    onMenuClick,
}: PanelTopbarProps) {
    const pathname = usePathname()
    const [avatarOpen, setAvatarOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close avatar dropdown on outside click or Escape
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setAvatarOpen(false)
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape' && avatarOpen) {
                setAvatarOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [avatarOpen])

    // Resolve current breadcrumb from pathname
    const currentSection = useMemo(() => {
        const segments = pathname.split('/').filter(Boolean)
        const panelIdx = segments.indexOf('panel')
        if (panelIdx === -1 || !segments[panelIdx + 1]) return null
        const segment = segments[panelIdx + 1]
        return breadcrumbMap[segment] || segment
    }, [pathname, breadcrumbMap])

    const { text: greetingText, emoji: greetingEmoji } = getGreeting(greetings)
    const initial = (ownerName || businessName || 'U')[0].toUpperCase()

    // ⌘K handler
    const openCommandPalette = () => {
        const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
        })
        document.dispatchEvent(event)
    }

    return (
        <header data-panel-topbar className="sticky top-0 z-40 liquid-glass" style={{ borderBottom: '1px solid rgba(45,80,22,0.08)' }}>
            <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
                {/* Left: hamburger (mobile) + greeting + breadcrumb */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={onMenuClick}
                        aria-label="Open panel menu"
                        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-sf-3 text-tx hover:bg-sf-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="min-w-0">
                        {/* Greeting (desktop) */}
                        <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-tx">
                            <span className="text-base" role="img" aria-hidden="true">{greetingEmoji}</span>
                            <span className="truncate">
                                {greetingText}, <span className="text-brand dark:text-brand-300">{ownerName || businessName}</span>
                            </span>
                            {setupNudge && (
                                <Link
                                    href={setupNudge.href}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-all ml-2 px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span>{setupNudge.label}</span>
                                </Link>
                            )}
                        </div>
                        {/* Mobile: business name */}
                        <div className="md:hidden text-sm font-semibold text-tx truncate">
                            {businessName}
                        </div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1.5 text-[11px] text-tx-muted">
                            <Link href={`/${lang}/panel`} className="hover:text-tx transition-colors">
                                {labels.ownerPanel}
                            </Link>
                            {currentSection && (
                                <>
                                    <span className="text-tx-faint font-light">/</span>
                                    <span className="font-medium text-tx-sec">{currentSection}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: search + notifications + theme + lang + avatar */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* ⌘K Search */}
                    <button
                        type="button"
                        onClick={openCommandPalette}
                        className="cmd-k-button hidden sm:inline-flex"
                        aria-label="Open search"
                    >
                        <Search className="w-3.5 h-3.5" />
                        <kbd>⌘K</kbd>
                    </button>
                    {/* Mobile search icon */}
                    <button
                        type="button"
                        onClick={openCommandPalette}
                        className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-tx-muted hover:text-tx hover:bg-sf-1 transition-colors"
                        aria-label="Search"
                    >
                        <Search className="w-4 h-4" />
                    </button>

                    <OrderNotifications defaultCurrency={defaultCurrency} />
                    <PanelThemeToggle />
                    <PanelLanguageSwitch currentLang={lang} />

                    {/* Avatar */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setAvatarOpen(!avatarOpen)}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand-light text-white font-bold text-sm flex items-center justify-center avatar-online-ring transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            aria-label="User menu"
                            aria-expanded={avatarOpen}
                        >
                            {initial}
                        </button>

                        {avatarOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 liquid-glass rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                                {/* User info card */}
                                <div className="px-4 py-3.5 border-b border-sf-2 bg-gradient-to-r from-brand-subtle to-transparent">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-light text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-brand/20">
                                            {initial}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-tx truncate">{ownerName || businessName}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-muted text-brand">Owner</span>
                                                <span className="text-[10px] text-tx-faint truncate">{businessName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Menu items */}
                                <div className="py-1.5">
                                    <a
                                        href={`/${lang}`}
                                        className="flex items-center gap-3 px-4 py-2.5 min-h-[44px] text-sm text-tx-sec hover:bg-sf-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-inset"
                                    >
                                        <Store className="w-4 h-4" />
                                        {labels.backToStore}
                                    </a>
                                    <form action="/api/auth/signout" method="POST">
                                        <button
                                            type="submit"
                                            className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[44px] text-sm text-red-400 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-inset"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            {labels.logout}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
