'use client'

/**
 * PanelShell — Client wrapper coordinating Topbar ↔ Sidebar ↔ CommandPalette
 *
 * Both PanelTopbar and PanelSidebar need shared mobileOpen state.
 * CommandPalette is mounted globally for ⌘K access.
 * This component wraps content area and passes connected callbacks.
 */

import { useState } from 'react'
import PanelTopbar from '@/components/panel/PanelTopbar'
import PanelSidebar from '@/components/panel/PanelSidebar'
import CommandPalette from '@/components/panel/CommandPalette'
import type { CommandItem, CommandPaletteLabels } from '@/components/panel/CommandPalette'
import type { PanelFeatureFlags, PanelSidebarLabels } from '@/lib/panel-policy'

interface PanelShellProps {
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
    children: React.ReactNode
}

export default function PanelShell({
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
    children,
}: PanelShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="min-h-screen bg-surface-0 md:flex">
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
            <div className="flex-1 overflow-auto">
                <PanelTopbar
                    ownerName={ownerName}
                    businessName={businessName}
                    lang={lang}
                    breadcrumbMap={breadcrumbMap}
                    greetings={greetings}
                    labels={topbarLabels}
                    onMenuClick={() => setMobileOpen(true)}
                />
                <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8">
                    {children}
                </div>
            </div>
            {/* Global Command Palette — ⌘K / Ctrl+K */}
            <CommandPalette
                items={commandPaletteItems}
                labels={commandPaletteLabels}
                lang={lang}
            />
        </div>
    )
}
