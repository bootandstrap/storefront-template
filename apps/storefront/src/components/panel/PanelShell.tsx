'use client'

/**
 * PanelShell — Client wrapper coordinating Topbar ↔ Sidebar ↔ CommandPalette
 *
 * Both PanelTopbar and PanelSidebar need shared mobileOpen state.
 * CommandPalette is mounted globally for ⌘K access.
 * This component wraps content area and passes connected callbacks.
 */

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRealtimeGovernance } from '@/lib/hooks/useRealtimeGovernance'
import PanelTopbar from '@/components/panel/PanelTopbar'
import PanelSidebar from '@/components/panel/PanelSidebar'
import CommandPalette from '@/components/panel/CommandPalette'
import PanelToaster from '@/components/panel/PanelToaster'
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
    children,
}: PanelShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const pathname = usePathname()
    const isPOS = pathname.includes('/pos')

    // ── Realtime governance: live push of flag/limit/module changes ──
    useRealtimeGovernance(tenantId)

    return (
        <div
            className={`bg-surface-0 md:flex ${isPOS ? 'overflow-hidden' : 'min-h-screen'}`}
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
                        onMenuClick={() => setMobileOpen(true)}
                    />
                )}
                {isPOS ? (
                    <div className="flex-1 min-h-0 overflow-hidden h-full">
                        {children}
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8">
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
            {/* Global Toast Provider — call toast() from anywhere */}
            <PanelToaster />
        </div>
    )
}
