/**
 * (shop) group layout — storefront chrome
 *
 * Includes: Header, Footer, CartDrawer, WhatsApp floating CTA.
 * Governance: maintenance mode, plan expiration banner, announcement bar.
 * This layout wraps all public-facing pages and customer account pages.
 * The Owner Panel (`/panel/*`) uses (panel) group with its own layout.
 *
 * NOTE: Tenant status check (paused/suspended) is now in [lang]/layout.tsx
 * so ALL routes are blocked, not just (shop).
 */

import { MessageCircle } from 'lucide-react'
import { getConfig } from '@/lib/config'
import { getCurrency } from '@/lib/i18n/currencies'
import { getDictionary, type Locale } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'

export default async function ShopLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags, planExpired } = await getConfig()
    const currentCurrency = await getCurrency(config.default_currency)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // -----------------------------------------------------------------------
    // Governance: maintenance mode
    // -----------------------------------------------------------------------
    if (featureFlags.enable_maintenance_mode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
                <div className="glass-strong rounded-2xl p-12 text-center max-w-lg">
                    <div className="text-6xl mb-6">🔧</div>
                    <h1 className="text-3xl font-bold font-display text-text-primary mb-3">
                        {t('maintenance.title')}
                    </h1>
                    <p className="text-text-muted text-lg">
                        {t('maintenance.description')}
                    </p>
                    {config.whatsapp_number && (
                        <a
                            href={`https://wa.me/${config.whatsapp_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp mt-6 inline-flex items-center gap-2"
                        >
                            <MessageCircle className="w-5 h-5" />
                            {t('maintenance.contactUs')}
                        </a>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <a href="#main-content" className="skip-to-content">
                {t('common.skipToContent')}
            </a>

            {/* Governance: plan expiration banner */}
            {planExpired && (
                <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
                    ⚠️ {t('limits.planExpiredBanner')}
                </div>
            )}

            {/* Announcement bar */}
            {config.announcement_bar_enabled && config.announcement_bar_text && (
                <div className="bg-primary text-white text-center py-2 px-4 text-sm font-medium">
                    {config.announcement_bar_text}
                </div>
            )}

            <Header
                config={config}
                featureFlags={featureFlags}
                activeLanguages={config.active_languages ?? []}
                activeCurrencies={config.active_currencies ?? []}
                currentCurrency={currentCurrency}
            />
            <main id="main-content" className="flex-1">
                {children}
            </main>
            <Footer config={config} featureFlags={featureFlags} dictionary={dictionary} lang={lang} />
            <CartDrawer />

            {/* WhatsApp floating CTA */}
            {featureFlags.enable_whatsapp_checkout && config.whatsapp_number && (
                <a
                    href={`https://wa.me/${config.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-float"
                    aria-label="Contact via WhatsApp"
                >
                    <MessageCircle className="w-6 h-6" />
                </a>
            )}
        </>
    )
}
