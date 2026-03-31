'use client'

/**
 * PanelTopbar — SOTA Owner Panel Header (Phase 6)
 *
 * Always-visible sticky top bar with:
 * - Time-of-day greeting + owner name
 * - Breadcrumb (Panel / current section)
 * - Notification bell (OrderNotifications)
 * - User avatar dropdown (Back to Store + Logout)
 * - Mobile hamburger toggle
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { Menu, ChevronRight, LogOut, Store, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import OrderNotifications from '@/components/panel/OrderNotifications'

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
    onMenuClick: () => void
}

function getGreeting(greetings: PanelTopbarProps['greetings']): string {
    const hour = new Date().getHours()
    if (hour < 12) return greetings.morning
    if (hour < 18) return greetings.afternoon
    return greetings.evening
}

export default function PanelTopbar({
    ownerName,
    businessName,
    lang,
    breadcrumbMap,
    greetings,
    labels,
    setupNudge,
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

    const greeting = getGreeting(greetings)
    const initial = (ownerName || businessName || 'U')[0].toUpperCase()

    return (
        <header data-panel-topbar className="sticky top-0 z-40 bg-glass-heavy backdrop-blur-md border-b border-sf-2">
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
                            <span className="truncate">
                                {greeting}, <span className="text-brand">{ownerName || businessName}</span>
                            </span>
                            {setupNudge && (
                                <a
                                    href={setupNudge.href}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500/90 hover:text-amber-400 transition-colors ml-1"
                                >
                                    <span>⚡</span>
                                    <span>{setupNudge.label}</span>
                                </a>
                            )}
                        </div>
                        {/* Mobile: business name */}
                        <div className="md:hidden text-sm font-semibold text-tx truncate">
                            {businessName}
                        </div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1 text-[11px] text-tx-muted">
                            <span>{labels.ownerPanel}</span>
                            {currentSection && (
                                <>
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="font-medium text-tx-sec">{currentSection}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: notifications + avatar */}
                <div className="flex items-center gap-2 shrink-0">
                    <OrderNotifications />

                    {/* Avatar */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setAvatarOpen(!avatarOpen)}
                            className="w-8 h-8 rounded-full bg-brand-muted text-brand font-bold text-sm flex items-center justify-center hover:bg-brand-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            aria-label="User menu"
                            aria-expanded={avatarOpen}
                        >
                            {initial}
                        </button>

                        {avatarOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-sf-1 border border-sf-3 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                {/* User info */}
                                <div className="px-4 py-3 border-b border-sf-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-muted text-brand font-bold text-xs flex items-center justify-center">
                                            {initial}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-tx truncate">{ownerName || businessName}</p>
                                            <p className="text-[11px] text-tx-muted truncate">{businessName}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Menu items */}
                                <div className="py-1">
                                    <a
                                        href={`/${lang}`}
                                        className="flex items-center gap-3 px-4 py-2.5 min-h-[44px] text-sm text-tx-sec hover:bg-glass transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-inset"
                                    >
                                        <Store className="w-4 h-4" />
                                        {labels.backToStore}
                                    </a>
                                    <form action="/api/auth/logout" method="POST">
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
