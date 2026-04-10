'use client'

/**
 * MyStoreShell — Thin tab navigation shell for the Mi Tienda hub.
 *
 * Renders the tab strip (PanelTabNav) and the server-rendered children.
 * Tab clicks navigate via router.push (which triggers server re-render).
 */

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import PanelTabNav, { type TabItem } from '@/components/panel/PanelTabNav'
import {
    Package,
    FolderTree,
    Warehouse,
    Tag,
    Image,
    FileText,
} from 'lucide-react'

const TAB_ICONS: Record<string, React.ReactNode> = {
    productos: <Package className="w-4 h-4" />,
    categorias: <FolderTree className="w-4 h-4" />,
    inventario: <Warehouse className="w-4 h-4" />,
    insignias: <Tag className="w-4 h-4" />,
    carrusel: <Image className="w-4 h-4" />,
    paginas: <FileText className="w-4 h-4" />,
}

interface MyStoreShellProps {
    tabs: TabItem[]
    activeTab: string
    lang: string
    children: React.ReactNode
}

export default function MyStoreShell({ tabs, activeTab, lang, children }: MyStoreShellProps) {
    const router = useRouter()

    const handleTabChange = useCallback((tab: string) => {
        // Navigate — triggers full server re-render (RSC Slot pattern)
        router.push(`/${lang}/panel/mi-tienda?tab=${tab}`)
    }, [router, lang])

    // Enrich tabs with icons
    const tabsWithIcons: TabItem[] = tabs.map(tab => ({
        ...tab,
        icon: TAB_ICONS[tab.key],
    }))

    return (
        <div className="space-y-6">
            <PanelTabNav
                tabs={tabsWithIcons}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
            <div id={`panel-tab-content-${activeTab}`} role="tabpanel">
                {children}
            </div>
        </div>
    )
}
