'use client'

/**
 * SalesShell — Tab shell for Ventas hub (SOTA 2026 Revamp)
 *
 * Wraps tab content with glass card and renders PanelTabNav.
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import PanelTabNav, { type TabItem } from '@/components/panel/PanelTabNav'

interface SalesShellProps {
    tabs: TabItem[]
    activeTab: string
    lang: string
    children: React.ReactNode
}

export default function SalesShell({ tabs, activeTab, lang, children }: SalesShellProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="space-y-4 panel-page-enter">
            <PanelTabNav
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
            <div className="glass rounded-2xl p-4 md:p-5" id={`panel-tab-content-${activeTab}`} role="tabpanel">
                {children}
            </div>
        </div>
    )
}
