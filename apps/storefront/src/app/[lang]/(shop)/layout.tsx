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
import { DeferredChatWidget } from '@/components/chat/DeferredChatWidget'
import CookieConsentBanner from '@/components/consent/CookieConsentBanner'
import CompareBarWrapper from '@/components/products/CompareBar'
import { createClient } from '@/lib/supabase/server'
import type { ChatTier } from '@/lib/chat/client-config'

export default async function ShopLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags, planLimits, planExpired } = await getConfig()
    const currentCurrency = await getCurrency(config.default_currency)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // ── Resolve auth + chat tier (visitor / customer / premium) ──
    let chatTier: ChatTier = 'visitor'
    let isAuthenticated = false
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            isAuthenticated = true
            chatTier = 'customer'
            // Check if paying customer (has active subscriptions)
            const { data: subs } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .limit(1)
            if (subs && subs.length > 0) {
                chatTier = 'premium'
            }
        }
    } catch { /* fallback to visitor */ }

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
                maxLanguages={planLimits.max_languages}
                maxCurrencies={planLimits.max_currencies}
                isAuthenticated={isAuthenticated}
            />
            <main id="main-content" className="flex-1">
                {children}
            </main>
            <Footer config={config} featureFlags={featureFlags} dictionary={dictionary} lang={lang} />
            <CartDrawer config={config} featureFlags={featureFlags} />

            {/* WhatsApp floating CTA — gated by enable_whatsapp_contact (NOT checkout) */}
            {featureFlags.enable_whatsapp_contact && config.whatsapp_number && (
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

            {/* AI Chatbot — gated by enable_chatbot feature flag */}
            {featureFlags.enable_chatbot && (
                <DeferredChatWidget
                    enabled={true}
                    locale={lang}
                    tier={chatTier}
                    businessName={config.business_name}
                    planMessageLimit={planLimits.max_chatbot_messages_month}
                />
            )}

            {/* Product Comparisons Bar — gated by enable_product_comparisons */}
            {featureFlags.enable_product_comparisons && (
                <CompareBarWrapper lang={lang} />
            )}

            {/* Cookie Consent Banner — gated by enable_cookie_consent */}
            {featureFlags.enable_cookie_consent && (
                <CookieConsentBanner />
            )}
        </>
    )
}

