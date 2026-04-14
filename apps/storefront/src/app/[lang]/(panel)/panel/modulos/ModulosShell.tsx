'use client'

/**
 * ModulosShell — Thin tab navigation shell for the Módulos hub.
 *
 * Tabs are dynamic — marketplace + activated module tabs.
 */

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import PanelTabNav, { type TabItem } from '@/components/panel/PanelTabNav'
import {
    Blocks, Bot, Users, Search, Share2, MessageSquare,
    Zap, ShoppingCart, Gauge, Shield,
} from 'lucide-react'

const TAB_ICONS: Record<string, React.ReactNode> = {
    marketplace: <Blocks className="w-4 h-4" />,
    chatbot: <Bot className="w-4 h-4" />,
    crm: <Users className="w-4 h-4" />,
    seo: <Search className="w-4 h-4" />,
    'redes-sociales': <Share2 className="w-4 h-4" />,
    mensajes: <MessageSquare className="w-4 h-4" />,
    automatizaciones: <Zap className="w-4 h-4" />,
    canales: <ShoppingCart className="w-4 h-4" />,
    capacidad: <Gauge className="w-4 h-4" />,
    auth: <Shield className="w-4 h-4" />,
}

interface ModulosShellProps {
    tabs: TabItem[]
    activeTab: string
    lang: string
    children: React.ReactNode
}

export default function ModulosShell({ tabs, activeTab, lang, children }: ModulosShellProps) {
    const router = useRouter()

    const handleTabChange = useCallback((tab: string) => {
        router.push(`/${lang}/panel/modulos?tab=${tab}`)
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
