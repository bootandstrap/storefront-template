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
import type { Metadata } from 'next'
import { getConfig } from '@/lib/config'
import { getCategories } from '@/lib/medusa/client'
import { getCurrency } from '@/lib/i18n/currencies'
import { getDictionary, type Locale } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import BottomNav from '@/components/layout/BottomNav'
import { DeferredChatWidget } from '@/components/chat/DeferredChatWidget'
import CookieConsentBanner from '@/components/consent/CookieConsentBanner'
import CompareBarWrapper from '@/components/products/CompareBar'
import { createClient } from '@/lib/supabase/server'
import type { ChatTier } from '@/lib/chat/client-config'
import Script from 'next/script'

/**
 * Shop layout metadata — provides title.template so every child page
 * automatically gets " | BusinessName" appended to its title.
 * Also sets OpenGraph siteName + locale for consistent social sharing.
 */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ lang: string }>
}): Promise<Metadata> {
    const { lang } = await params
    const { config } = await getConfig()
    const businessName = config.business_name || 'Store'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

    return {
        title: {
            template: `%s | ${businessName}`,
            default: config.meta_title || businessName,
        },
        openGraph: {
            siteName: businessName,
            locale: lang === 'es' ? 'es_ES' : 'en_US',
            url: siteUrl,
        },
        twitter: {
            card: 'summary_large_image',
        },
    }
}


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

    // Fetch categories for MegaMenu (top-level only)
    const allCategories = await getCategories()
    const rootCategories = allCategories.filter(c => !c.parent_category)

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
            <div className="min-h-screen flex items-center justify-center bg-sf-0 px-4">
                <div className="glass-strong rounded-2xl p-12 text-center max-w-lg">
                    <div className="text-6xl mb-6">🔧</div>
                    <h1 className="text-3xl font-bold font-display text-tx mb-3">
                        {t('maintenance.title')}
                    </h1>
                    <p className="text-tx-muted text-lg">
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


            {/* Governance: plan expiration banner */}
            {planExpired && (
                <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
                    ⚠️ {t('limits.planExpiredBanner')}
                </div>
            )}

            {/* Announcement bar */}
            {config.announcement_bar_enabled && config.announcement_bar_text && (
                <div className="bg-brand text-white text-center py-2 px-4 text-sm font-medium">
                    {config.announcement_bar_text}
                </div>
            )}

            {/* Skip-to-content — WCAG 2.1 AA */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand focus:text-white focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
            >
                {t('a11y.skipToContent') || 'Skip to content'}
            </a>

            <Header
                config={config}
                featureFlags={featureFlags}
                activeLanguages={config.active_languages ?? []}
                activeCurrencies={config.active_currencies ?? []}
                currentCurrency={currentCurrency}
                maxLanguages={planLimits.max_languages}
                maxCurrencies={planLimits.max_currencies}
                isAuthenticated={isAuthenticated}
                categories={rootCategories}
            />
            <main id="main-content" className="flex-1" tabIndex={-1}>
                {children}
            </main>
            <Footer config={config} featureFlags={featureFlags} dictionary={dictionary} lang={lang} />
            <CartDrawer config={config} featureFlags={featureFlags} planLimits={planLimits} />
            <BottomNav />

            {/* WhatsApp floating CTA — gated by enable_whatsapp_contact (NOT checkout) */}
            {featureFlags.enable_whatsapp_contact && config.whatsapp_number && (
                <a
                    href={`https://wa.me/${config.whatsapp_number}${(config as unknown as Record<string, string>).sales_whatsapp_greeting ? `?text=${encodeURIComponent((config as unknown as Record<string, string>).sales_whatsapp_greeting)}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-float"
                    aria-label={t('common.contactWhatsApp') || 'Contact via WhatsApp'}
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
                    chatbotName={(config as unknown as Record<string, string>).chatbot_name || undefined}
                    chatbotWelcomeMessage={(config as unknown as Record<string, string>).chatbot_welcome_message || undefined}
                    autoOpenDelay={Number((config as unknown as Record<string, unknown>).chatbot_auto_open_delay) || undefined}
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

            {/* Google Analytics 4 — reads ID from config (already cached) */}
            {featureFlags.enable_analytics && config.google_analytics_id && /^[A-Za-z0-9_-]+$/.test(config.google_analytics_id) && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${config.google_analytics_id}`}
                        strategy="afterInteractive"
                    />
                    <Script id="gtag-init" strategy="afterInteractive">
                        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.google_analytics_id}');`}
                    </Script>
                </>
            )}

            {/* Facebook Pixel — reads ID from config (already cached) */}
            {featureFlags.enable_analytics && config.facebook_pixel_id && /^[0-9]+$/.test(config.facebook_pixel_id) && (
                <Script id="fb-pixel" strategy="afterInteractive">
                    {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${config.facebook_pixel_id}');fbq('track','PageView');`}
                </Script>
            )}
        </>
    )
}

