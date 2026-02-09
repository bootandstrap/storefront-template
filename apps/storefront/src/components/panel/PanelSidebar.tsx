'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Store,
    Image,
    MessageSquare,
    Award,
    FileText,
    BarChart3,
    ChevronLeft,
} from 'lucide-react'

interface SidebarItem {
    label: string
    href: string
    icon: React.ReactNode
}

interface PanelSidebarProps {
    lang: string
    businessName: string
    t: (key: string) => string
}

export default function PanelSidebar({ lang, businessName, t }: PanelSidebarProps) {
    const pathname = usePathname()

    const items: SidebarItem[] = [
        {
            label: t('panel.nav.dashboard'),
            href: `/${lang}/panel`,
            icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
            label: t('panel.nav.storeConfig'),
            href: `/${lang}/panel/tienda`,
            icon: <Store className="w-5 h-5" />,
        },
        {
            label: t('panel.nav.carousel'),
            href: `/${lang}/panel/carrusel`,
            icon: <Image className="w-5 h-5" />,
        },
        {
            label: t('panel.nav.messages'),
            href: `/${lang}/panel/mensajes`,
            icon: <MessageSquare className="w-5 h-5" />,
        },
        {
            label: t('panel.nav.badges'),
            href: `/${lang}/panel/insignias`,
            icon: <Award className="w-5 h-5" />,
        },
        {
            label: t('panel.nav.pages'),
            href: `/${lang}/panel/paginas`,
            icon: <FileText className="w-5 h-5" />,
        },
        {
            label: t('panel.nav.analytics'),
            href: `/${lang}/panel/analiticas`,
            icon: <BarChart3 className="w-5 h-5" />,
        },
    ]

    return (
        <aside className="w-64 min-h-screen glass-strong border-r border-surface-3 flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-surface-3">
                <h2 className="text-lg font-bold font-display text-text-primary truncate">
                    {businessName}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                    {t('panel.nav.ownerPanel')}
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                {items.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== `/${lang}/panel` && pathname.startsWith(item.href))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-200
                                ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
                                }
                            `}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Back to storefront */}
            <div className="p-3 border-t border-surface-3">
                <Link
                    href={`/${lang}`}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-1 transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {t('panel.nav.backToStore')}
                </Link>
            </div>
        </aside>
    )
}
