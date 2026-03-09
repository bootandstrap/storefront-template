'use client'

import { Home, Search, ShoppingBag, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { useCart } from '@/contexts/CartContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

/**
 * Mobile-only bottom navigation bar.
 * Shows on screens < 768px via CSS (.bottom-nav class).
 * Uses safe-area-inset-bottom for notched devices.
 */
export default function BottomNav() {
    const { t, locale, localizedHref } = useI18n()
    const { itemCount } = useCart()
    const pathname = usePathname()

    const links = [
        { href: localizedHref('home'), icon: Home, label: t('nav.home'), id: 'home' },
        { href: localizedHref('products'), icon: Search, label: t('nav.products'), id: 'products' },
        { href: localizedHref('cart'), icon: ShoppingBag, label: t('nav.cart'), id: 'cart', badge: itemCount },
        { href: localizedHref('account'), icon: User, label: t('nav.account'), id: 'account' },
    ]

    // Determine active link
    const stripLocale = pathname.replace(`/${locale}`, '') || '/'

    return (
        <nav
            className="bottom-nav"
            aria-label={t('nav.home')}
        >
            {links.map((link) => {
                const Icon = link.icon
                const isActive = link.id === 'home'
                    ? stripLocale === '/'
                    : stripLocale.startsWith(link.href.replace(`/${locale}`, ''))

                return (
                    <Link
                        key={link.id}
                        href={link.href}
                        className={`bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`}
                    >
                        <span className="relative">
                            <Icon className="w-5 h-5" />
                            {link.badge ? (
                                <span className="bottom-nav-badge" aria-label={`${link.badge}`}>
                                    {link.badge > 9 ? '9+' : link.badge}
                                </span>
                            ) : null}
                        </span>
                        <span className="text-[10px] mt-0.5">{link.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}
