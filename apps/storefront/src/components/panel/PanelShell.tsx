'use client'

/**
 * PanelShell — Client wrapper coordinating the panel chrome
 *
 * Orchestrates: Topbar ↔ Sidebar ↔ CommandPalette ↔ MobileNav ↔ KeyboardShortcuts
 * Both PanelTopbar and PanelSidebar need shared mobileOpen state.
 * CommandPalette is mounted globally for ⌘K access.
 * PanelMobileNav provides thumb-zone bottom tabs on mobile.
 * PanelKeyboardShortcuts shows an overlay on `?` press.
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

interface PanelShellProps {
    tenantId?: string
    lang: string
    ownerName: string
    businessName: string
    sidebarLabels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
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
    onboardingCompleted?: boolean
    replayTourLabel?: string
    tourTranslations?: Record<string, string>
    /** Inline setup nudge for the topbar greeting */
    setupNudge?: { label: string; href: string } | null
    /** Governance SSOT default currency */
    defaultCurrency: string
    children: React.ReactNode
}

export default function PanelShell({
    tenantId,
    lang,
    ownerName,
    businessName,
    sidebarLabels,
    featureFlags,
    breadcrumbMap,
    greetings,
    topbarLabels,
    commandPaletteItems,
    commandPaletteLabels,
    planName,
    onboardingCompleted,
    replayTourLabel,
    tourTranslations,
    setupNudge,
    defaultCurrency,
    children,
}: PanelShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const pathname = usePathname()
    const isPOS = pathname.includes('/pos')

    // ── Realtime governance: live push of flag/limit/module changes ──
    useRealtimeGovernance(tenantId)

    const handleMobileMore = useCallback(() => {
        setMobileOpen(true)
    }, [])

    return (
        <div
            className={`bg-sf-0 md:flex ${isPOS ? 'overflow-hidden' : 'min-h-screen'}`}
            style={isPOS ? { height: '100dvh' } : undefined}
        >
            {!isPOS && (
                <PanelSidebar
                    lang={lang}
                    businessName={businessName}
                    labels={sidebarLabels}
                    featureFlags={featureFlags}
                    planName={planName}
                    onboardingCompleted={onboardingCompleted}
                    replayTourLabel={replayTourLabel}
                    tourTranslations={tourTranslations}
                    mobileOpen={mobileOpen}
                    onMobileOpenChange={setMobileOpen}
                    collapsed={sidebarCollapsed}
                    onCollapseChange={setSidebarCollapsed}
                />
            )}
            <div className={`flex-1 min-h-0 ${isPOS ? 'overflow-hidden flex flex-col h-full' : 'overflow-auto'}`}>
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
                        onMenuClick={() => setMobileOpen(true)}
                    />
                )}
                {isPOS ? (
                    <div className="flex-1 min-h-0 overflow-hidden h-full">
                        {children}
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 pb-24 md:pb-8">
                        {children}
                    </div>
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
            {!isPOS && (
                <PanelMobileNav
                    lang={lang}
                    labels={{
                        dashboard: sidebarLabels.dashboard,
                        catalog: sidebarLabels.catalog,
                        orders: sidebarLabels.orders,
                        customers: sidebarLabels.customers,
                        more: 'Más',
                    }}
                    onMoreClick={handleMobileMore}
                />
            )}

            {/* Global Toast Provider — call toast() from anywhere */}
            <PanelToaster />
        </div>
    )
}
