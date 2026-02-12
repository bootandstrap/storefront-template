'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, UserCircle, MapPin, Heart, LogOut } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import type { FeatureFlags } from '@/lib/config'

interface AccountSidebarProps {
    lang: string
    displayName: string
    email: string
    featureFlags: FeatureFlags
}

export default function AccountSidebar({ lang, displayName, email, featureFlags }: AccountSidebarProps) {
    const { t } = useI18n()
    const pathname = usePathname()

    const navItems = [
        { href: `/${lang}/cuenta`, label: t('account.dashboard'), icon: LayoutDashboard, exact: true, flag: true },
        ...(featureFlags.enable_order_tracking
            ? [{ href: `/${lang}/cuenta/pedidos`, label: t('nav.orders'), icon: ShoppingBag, exact: false, flag: true }]
            : []),
        { href: `/${lang}/cuenta/perfil`, label: t('nav.profile'), icon: UserCircle, exact: false, flag: true },
        ...(featureFlags.enable_address_management
            ? [{ href: `/${lang}/cuenta/direcciones`, label: t('nav.addresses'), icon: MapPin, exact: false, flag: true }]
            : []),
        ...(featureFlags.enable_wishlist
            ? [{ href: `/${lang}/cuenta/favoritos`, label: t('account.wishlist') || 'Favorites', icon: Heart, exact: false, flag: true }]
            : []),
    ]

    function isActive(href: string, exact: boolean) {
        if (exact) return pathname === href
        return pathname.startsWith(href)
    }

    return (
        <aside className="space-y-6">
            {/* User info */}
            <div className="glass rounded-xl p-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-semibold text-text-primary truncate">{displayName}</p>
                    <p className="text-xs text-text-muted truncate">{email}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="glass rounded-xl overflow-hidden">
                {navItems.map((item) => {
                    const active = isActive(item.href, item.exact)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 text-sm transition-all border-b border-surface-3 last:border-b-0 ${active
                                ? 'bg-primary/10 text-primary font-medium border-l-2 border-l-primary'
                                : 'text-text-secondary hover:bg-surface-2 hover:text-primary'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <form action="/api/auth/signout" method="POST">
                <button
                    type="submit"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full rounded-xl transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    {t('nav.logout')}
                </button>
            </form>
        </aside>
    )
}
