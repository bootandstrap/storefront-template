/**
 * (shop) group layout — storefront chrome
 *
 * Includes: Header, Footer, CartDrawer, WhatsApp floating CTA.
 * This layout wraps all public-facing pages and customer account pages.
 * The Owner Panel (`/panel/*`) uses (panel) group with its own layout.
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
    const { config, featureFlags } = await getConfig()
    const currentCurrency = await getCurrency(config.default_currency)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    return (
        <>
            <a href="#main-content" className="skip-to-content">
                {t('common.skipToContent')}
            </a>
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
            <Footer config={config} dictionary={dictionary} />
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
