'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Menu, X, User, MessageCircle, Search } from 'lucide-react'
import type { StoreConfig, FeatureFlags } from '@/lib/config'
import { useCart } from '@/contexts/CartContext'
import LanguageSelector from './LanguageSelector'
import CurrencySelector from './CurrencySelector'

interface HeaderProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    activeLanguages: string[]
    activeCurrencies: string[]
    currentCurrency: string
}

export default function Header({ config, featureFlags, activeLanguages, activeCurrencies, currentCurrency }: HeaderProps) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const { itemCount, openDrawer } = useCart()

    return (
        <>
            <header className="glass-strong sticky top-0 z-40 border-b border-surface-3/50">
                <div className="container-page">
                    <div className="flex items-center justify-between h-16 md:h-18">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 shrink-0">
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
                        <div className="hidden md:flex items-center gap-6 flex-1 max-w-md mx-8">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="search"
                                    placeholder="Buscar productos..."
                                    className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-surface-1 border border-surface-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const value = (e.target as HTMLInputElement).value
                                            if (value.trim()) {
                                                window.location.href = `/productos?q=${encodeURIComponent(value.trim())}`
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Desktop nav links */}
                        <nav className="hidden md:flex items-center gap-5">
                            <Link
                                href="/productos"
                                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
                            >
                                Productos
                            </Link>
                            {featureFlags.enable_whatsapp_checkout && (
                                <a
                                    href={`https://wa.me/${config.whatsapp_number}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Contacto
                                </a>
                            )}
                        </nav>

                        {/* Language & Currency selectors — desktop */}
                        <div className="hidden md:flex items-center gap-1">
                            {featureFlags.enable_multi_language && (
                                <LanguageSelector activeLanguages={activeLanguages} />
                            )}
                            {featureFlags.enable_multi_currency && (
                                <CurrencySelector
                                    activeCurrencies={activeCurrencies}
                                    currentCurrency={currentCurrency}
                                />
                            )}
                        </div>

                        {/* Right actions */}
                        <div className="flex items-center gap-2">
                            {/* Mobile search toggle */}
                            <button
                                onClick={() => setSearchOpen(!searchOpen)}
                                className="md:hidden p-2 rounded-full hover:bg-surface-1 transition-colors"
                                aria-label="Buscar"
                            >
                                <Search className="w-5 h-5 text-text-primary" />
                            </button>

                            {/* Cart button */}
                            <button
                                onClick={openDrawer}
                                className="relative p-2 rounded-full hover:bg-surface-1 transition-colors"
                                aria-label="Carrito de compras"
                            >
                                <ShoppingCart className="w-5 h-5 text-text-primary" />
                                {itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center animate-pulse-badge">
                                        {itemCount > 9 ? '9+' : itemCount}
                                    </span>
                                )}
                            </button>

                            {/* Auth button — visible on mobile too */}
                            <Link
                                href="/login"
                                className="flex items-center gap-1.5 btn btn-primary text-sm py-2 px-4"
                            >
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline">Ingresar</span>
                            </Link>

                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => setMobileOpen(!mobileOpen)}
                                className="md:hidden p-2 rounded-full hover:bg-surface-1 transition-colors"
                                aria-label="Menú"
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
                                placeholder="Buscar productos..."
                                autoFocus
                                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full bg-surface-1 border border-surface-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = (e.target as HTMLInputElement).value
                                        if (value.trim()) {
                                            window.location.href = `/productos?q=${encodeURIComponent(value.trim())}`
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
                            href="/productos"
                            className="text-base font-medium p-2 rounded-lg hover:bg-surface-1"
                            onClick={() => setMobileOpen(false)}
                        >
                            Productos
                        </Link>
                        {featureFlags.enable_whatsapp_checkout && (
                            <a
                                href={`https://wa.me/${config.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base font-medium p-2 rounded-lg hover:bg-surface-1 flex items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Contacto por WhatsApp
                            </a>
                        )}

                        {/* Mobile language & currency selectors */}
                        {(featureFlags.enable_multi_language || featureFlags.enable_multi_currency) && (
                            <div className="border-t border-surface-3/50 pt-4 mt-2 flex items-center gap-2">
                                {featureFlags.enable_multi_language && (
                                    <LanguageSelector activeLanguages={activeLanguages} />
                                )}
                                {featureFlags.enable_multi_currency && (
                                    <CurrencySelector
                                        activeCurrencies={activeCurrencies}
                                        currentCurrency={currentCurrency}
                                    />
                                )}
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </>
    )
}
