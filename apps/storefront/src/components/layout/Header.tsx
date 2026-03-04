'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Menu, X, User, MessageCircle, Search } from 'lucide-react'
import type { StoreConfig, FeatureFlags } from '@/lib/config'
import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n/provider'
import LanguageSelector from './LanguageSelector'
import CurrencySelector from './CurrencySelector'
import MegaMenu from './MegaMenu'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface HeaderProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    activeLanguages: string[]
    activeCurrencies: string[]
    currentCurrency: string
    maxLanguages?: number
    maxCurrencies?: number
    isAuthenticated?: boolean
    /** Product categories for MegaMenu dropdown */
    categories?: { id: string; name: string; handle: string; description?: string | null; category_children?: { id: string; name: string; handle: string }[] }[]
}

export default function Header({ config, featureFlags, activeLanguages, activeCurrencies, currentCurrency, maxLanguages, maxCurrencies, isAuthenticated = false, categories = [] }: HeaderProps) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const { itemCount, openDrawer } = useCart()
    const { t, localizedHref } = useI18n()
    const router = useRouter()

    // Manage body scroll and classes when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden'
            document.body.classList.add('drawer-open')
        } else {
            document.body.style.overflow = ''
            document.body.classList.remove('drawer-open')
        }
        return () => {
            document.body.style.overflow = ''
            document.body.classList.remove('drawer-open')
        }
    }, [mobileOpen])

    return (
        <>
            <header data-testid="main-header" className="glass-strong sticky top-0 z-40 border-b border-surface-3/50">
                <div className="container-page">
                    <div className="flex items-center justify-between h-16 md:h-18">
                        {/* Logo */}
                        <Link href={localizedHref('home')} className="flex items-center gap-2 shrink-0">
                            {config.logo_url ? (
                                <Image
                                    src={config.logo_url}
                                    alt={config.business_name}
                                    width={120}
                                    height={32}
                                    className="h-8 w-auto"
                                    priority
                                />
                            ) : (
                                <span className="text-xl font-bold font-display text-primary">
                                    {config.business_name}
                                </span>
                            )}
                        </Link>

                        {/* Desktop search + nav */}
                        {featureFlags.enable_product_search && (
                            <div className="hidden md:flex items-center gap-6 flex-1 max-w-md mx-8">
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        type="search"
                                        placeholder={t('product.searchPlaceholder')}
                                        className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-surface-1 border border-surface-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const value = (e.target as HTMLInputElement).value
                                                if (value.trim()) {
                                                    router.push(`${localizedHref('products')}?q=${encodeURIComponent(value.trim())}`)
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Desktop nav links */}
                        <nav className="hidden md:flex items-center gap-5">
                            {categories.length > 0 ? (
                                <MegaMenu categories={categories} label={t('nav.products')} />
                            ) : (
                                <Link
                                    href={localizedHref('products')}
                                    className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
                                >
                                    {t('nav.products')}
                                </Link>
                            )}
                            {featureFlags.enable_whatsapp_contact && (
                                <a
                                    href={`https://wa.me/${config.whatsapp_number}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    {t('footer.contact')}
                                </a>
                            )}
                        </nav>

                        {/* Language & Currency selectors — desktop */}
                        <div className="hidden md:flex items-center gap-1">
                            <ThemeToggle />
                            {featureFlags.enable_multi_language && (
                                <LanguageSelector activeLanguages={activeLanguages} maxLanguages={maxLanguages} />
                            )}
                            {featureFlags.enable_multi_currency && (
                                <CurrencySelector
                                    activeCurrencies={activeCurrencies}
                                    currentCurrency={currentCurrency}
                                    maxCurrencies={maxCurrencies}
                                />
                            )}
                        </div>

                        {/* Right actions */}
                        <div className="flex items-center gap-2">
                            {/* Mobile search toggle */}
                            {featureFlags.enable_product_search && (
                                <button
                                    onClick={() => setSearchOpen(!searchOpen)}
                                    className="md:hidden p-2 rounded-full hover:bg-surface-1 transition-colors"
                                    aria-label={t('common.search')}
                                >
                                    <Search className="w-5 h-5 text-text-primary" />
                                </button>
                            )}

                            {/* Cart button */}
                            <button
                                onClick={openDrawer}
                                className="relative p-2 rounded-full hover:bg-surface-1 transition-colors"
                                aria-label={t('cart.title')}
                            >
                                <ShoppingCart className="w-5 h-5 text-text-primary" />
                                {itemCount > 0 && (
                                    <span data-testid="cart-badge" className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center animate-pulse-badge">
                                        {itemCount > 9 ? '9+' : itemCount}
                                    </span>
                                )}
                            </button>

                            {/* Auth button — session-aware */}
                            {featureFlags.enable_customer_accounts && (
                                <Link
                                    href={isAuthenticated ? localizedHref('account') : localizedHref('login')}
                                    className="flex items-center gap-1.5 btn btn-primary text-sm py-2 px-4"
                                >
                                    <User className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        {isAuthenticated ? t('nav.account') : t('nav.login')}
                                    </span>
                                </Link>
                            )}

                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => setMobileOpen(!mobileOpen)}
                                className="md:hidden p-2 rounded-full hover:bg-surface-1 transition-colors"
                                aria-label={t('nav.menu')}
                            >
                                {mobileOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile search bar */}
                {searchOpen && (
                    <div className="md:hidden px-4 pb-3 animate-slide-up">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="search"
                                placeholder={t('product.searchPlaceholder')}
                                autoFocus
                                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full bg-surface-1 border border-surface-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = (e.target as HTMLInputElement).value
                                        if (value.trim()) {
                                            router.push(`${localizedHref('products')}?q=${encodeURIComponent(value.trim())}`)
                                            setSearchOpen(false)
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
            </header>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-30 md:hidden animate-fade-in">
                    <div
                        className="absolute inset-0 bg-black/30"
                        onClick={() => setMobileOpen(false)}
                    />
                    <nav className="absolute top-16 left-0 right-0 glass-strong border-b border-surface-3/50 p-6 flex flex-col gap-4 animate-slide-up">
                        <Link
                            href={localizedHref('products')}
                            className="text-base font-medium p-2 rounded-lg hover:bg-surface-1"
                            onClick={() => setMobileOpen(false)}
                        >
                            {t('nav.products')}
                        </Link>
                        {featureFlags.enable_whatsapp_contact && (
                            <a
                                href={`https://wa.me/${config.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base font-medium p-2 rounded-lg hover:bg-surface-1 flex items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                {t('checkout.whatsapp')}
                            </a>
                        )}

                        {/* Auth link — mobile */}
                        {featureFlags.enable_customer_accounts && (
                            <Link
                                href={isAuthenticated ? localizedHref('account') : localizedHref('login')}
                                className="text-base font-medium p-2 rounded-lg hover:bg-surface-1 flex items-center gap-2 text-primary"
                                onClick={() => setMobileOpen(false)}
                            >
                                <User className="w-4 h-4" />
                                {isAuthenticated ? t('nav.account') : t('nav.login')}
                            </Link>
                        )}

                        {/* Mobile theme toggle + language & currency selectors */}
                        <div className="border-t border-surface-3/50 pt-4 mt-2 flex items-center gap-2">
                            <ThemeToggle />
                            {featureFlags.enable_multi_language && (
                                <LanguageSelector activeLanguages={activeLanguages} maxLanguages={maxLanguages} />
                            )}
                            {featureFlags.enable_multi_currency && (
                                <CurrencySelector
                                    activeCurrencies={activeCurrencies}
                                    currentCurrency={currentCurrency}
                                    maxCurrencies={maxCurrencies}
                                />
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </>
    )
}
