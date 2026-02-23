'use client'

import { Menu } from 'lucide-react'

interface PanelTopbarProps {
    businessName: string
    ownerPanelLabel: string
    onMenuClick: () => void
}

export default function PanelTopbar({
    businessName,
    ownerPanelLabel,
    onMenuClick,
}: PanelTopbarProps) {
    return (
        <header className="md:hidden sticky top-0 z-40 glass-strong border-b border-surface-3">
            <div className="h-14 px-4 flex items-center justify-between">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">
                        {businessName}
                    </div>
                    <div className="text-[11px] text-text-muted truncate">
                        {ownerPanelLabel}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open panel menu"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-surface-3 text-text-primary hover:bg-surface-1"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}

