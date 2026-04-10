'use client'

/**
 * SettingsShell — Thin tab navigation shell for the Ajustes hub.
 */

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import PanelTabNav, { type TabItem } from '@/components/panel/PanelTabNav'
import {
    Store, Truck, Globe, BarChart3, Mail, CreditCard, Kanban, Wifi,
} from 'lucide-react'

const TAB_ICONS: Record<string, React.ReactNode> = {
    tienda: <Store className="w-4 h-4" />,
    envios: <Truck className="w-4 h-4" />,
    idiomas: <Globe className="w-4 h-4" />,
    analiticas: <BarChart3 className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    suscripcion: <CreditCard className="w-4 h-4" />,
    proyecto: <Kanban className="w-4 h-4" />,
    wifi: <Wifi className="w-4 h-4" />,
}

interface SettingsShellProps {
    tabs: TabItem[]
    activeTab: string
    lang: string
    children: React.ReactNode
}

export default function SettingsShell({ tabs, activeTab, lang, children }: SettingsShellProps) {
    const router = useRouter()

    const handleTabChange = useCallback((tab: string) => {
        router.push(`/${lang}/panel/ajustes?tab=${tab}`)
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
