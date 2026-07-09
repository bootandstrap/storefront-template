'use client'

/**
 * PanelShell — Client wrapper coordinating the panel chrome
 *
 * Orchestrates: Topbar ↔ Sidebar ↔ CommandPalette ↔ MobileNav ↔ KeyboardShortcuts
 * Both PanelTopbar and PanelSidebar need shared mobileOpen state.
 * CommandPalette is mounted globally for ⌘K access.
 * PanelMobileNav provides thumb-zone bottom tabs on mobile.
 * PanelKeyboardShortcuts shows an overlay on `?` press.
 *
 * SOTA Redesign: Sidebar now uses 6 sections (home, myStore, sales, modules, settings, pos).
 */

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useRealtimeGovernance } from '@/lib/hooks/useRealtimeGovernance'
import PanelTopbar from '@/components/panel/PanelTopbar'
import PanelSidebar from '@/components/panel/PanelSidebar'
import CommandPalette from '@/components/panel/CommandPalette'
import PanelToaster from '@/components/panel/PanelToaster'
import PanelMobileNav from '@/components/panel/PanelMobileNav'
import PanelKeyboardShortcuts, { DEFAULT_PANEL_SHORTCUTS } from '@/components/panel/PanelKeyboardShortcuts'
import type { CommandItem, CommandPaletteLabels } from '@/components/panel/CommandPalette'
import type { PanelFeatureFlags, PanelSidebarLabels } from '@/lib/panel-policy'
import type { OwnerExperienceMode } from '@bootandstrap/platform-contract'

interface PanelShellProps {
    tenantId?: string
    lang: string
    ownerName: string
    businessName: string
    sidebarLabels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
    ownerExperienceMode?: OwnerExperienceMode
    breadcrumbMap: Record<string, string>
    greetings: {
        morning: string
        afternoon: string
        evening: string
    }
    topbarLabels: {
        ownerPanel: string
        backToStore: string
        logout: string
    }
    commandPaletteItems: CommandItem[]
    commandPaletteLabels: CommandPaletteLabels
    planName?: string
    /** Inline setup nudge for the topbar greeting */
    setupNudge?: { label: string; href: string } | null
    /** Governance SSOT default currency */
    defaultCurrency: string
    /** Business logo URL for sidebar identity */
    logoUrl?: string
    /** Store readiness score for sidebar health indicator */
    readinessScore?: number
    /** Badge counts for sidebar navigation items */
    badges?: Record<string, number>
    children: React.ReactNode
}

export default function PanelShell({
    tenantId,
    lang,
    ownerName,
    businessName,
    sidebarLabels,
    featureFlags,
    ownerExperienceMode,
    breadcrumbMap,
    greetings,
    topbarLabels,
    commandPaletteItems,
    commandPaletteLabels,
    planName,
    setupNudge,
    defaultCurrency,
    logoUrl,
    readinessScore,
    badges,
    children,
}: PanelShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const pathname = usePathname()
    const isPOS = pathname.includes('/pos')
    const isStarterCollaborative = ownerExperienceMode === 'starter_collaborative'

    // ── Realtime governance: live push of flag/limit/module changes ──
    useRealtimeGovernance(tenantId)

    const handleMobileMore = useCallback(() => {
        setMobileOpen(true)
    }, [])

    return (
        <div
            className={`md:flex ${isPOS ? 'overflow-hidden' : 'min-h-screen'}`}
            style={isPOS ? { height: '100dvh' } : { background: '#f4f6f0', minHeight: '100vh' }}
        >
            {!isPOS && (
                <PanelSidebar
                    lang={lang}
                    businessName={businessName}
                    labels={sidebarLabels}
                    featureFlags={featureFlags}
                    ownerExperienceMode={ownerExperienceMode}
                    badges={badges}
                    planName={planName}
                    logoUrl={logoUrl}
                    readinessScore={readinessScore}
                    mobileOpen={mobileOpen}
                    onMobileOpenChange={setMobileOpen}
                    collapsed={sidebarCollapsed}
                    onCollapseChange={setSidebarCollapsed}
                />
            )}
            <div className={`flex-1 min-h-0 transition-all duration-300 ${isPOS ? 'overflow-hidden flex flex-col h-full' : 'overflow-auto'}`}>
                {!isPOS && (
                    <PanelTopbar
                        ownerName={ownerName}
                        businessName={businessName}
                        lang={lang}
                        breadcrumbMap={breadcrumbMap}
                        greetings={greetings}
                        labels={topbarLabels}
                        setupNudge={setupNudge}
                        defaultCurrency={defaultCurrency}
                        planName={planName}
                        onMenuClick={() => setMobileOpen(true)}
                    />
                )}
                {isPOS ? (
                    <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-hidden h-full">
                        {children}
                    </main>
                ) : (
                    <main id="main-content" tabIndex={-1} className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 pb-24 md:pb-8">
                        {children}
                    </main>
                )}
            </div>

            {/* Global Command Palette — ⌘K / Ctrl+K */}
            <CommandPalette
                items={commandPaletteItems}
                labels={commandPaletteLabels}
                lang={lang}
            />

            {/* Global Keyboard Shortcuts — ? key */}
            <PanelKeyboardShortcuts groups={DEFAULT_PANEL_SHORTCUTS} />

            {/* Mobile bottom tab bar */}
            {!isPOS && !isStarterCollaborative && (
                <PanelMobileNav
                    lang={lang}
                    labels={{
                        dashboard: sidebarLabels.home,
                        catalog: sidebarLabels.myStore,
                        orders: sidebarLabels.sales,
                        customers: sidebarLabels.settings,
                        more: '•••',
                    }}
                    onMoreClick={handleMobileMore}
                />
            )}

            {/* Global Toast Provider — call toast() from anywhere */}
            <PanelToaster />
        </div>
    )
}
