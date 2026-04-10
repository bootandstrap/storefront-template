'use client'

/**
 * SalesShell — Thin tab navigation shell for the Ventas hub.
 */

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import PanelTabNav, { type TabItem } from '@/components/panel/PanelTabNav'
import { ShoppingBag, Users, RotateCcw, Star } from 'lucide-react'

const TAB_ICONS: Record<string, React.ReactNode> = {
    pedidos: <ShoppingBag className="w-4 h-4" />,
    clientes: <Users className="w-4 h-4" />,
    devoluciones: <RotateCcw className="w-4 h-4" />,
    resenas: <Star className="w-4 h-4" />,
}

interface SalesShellProps {
    tabs: TabItem[]
    activeTab: string
    lang: string
    children: React.ReactNode
}

export default function SalesShell({ tabs, activeTab, lang, children }: SalesShellProps) {
    const router = useRouter()

    const handleTabChange = useCallback((tab: string) => {
        router.push(`/${lang}/panel/ventas?tab=${tab}`)
    }, [router, lang])

    const tabsWithIcons: TabItem[] = tabs.map(tab => ({
        ...tab,
        icon: TAB_ICONS[tab.key],
    }))

    return (
        <div className="space-y-6">
            <PanelTabNav tabs={tabsWithIcons} activeTab={activeTab} onTabChange={handleTabChange} />
            <div id={`panel-tab-content-${activeTab}`} role="tabpanel">
                {children}
            </div>
        </div>
    )
}
