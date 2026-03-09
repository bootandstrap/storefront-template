/**
 * (panel) group layout — Owner Panel chrome
 *
 * Auth guard: owner only.
 * Feature flag gate: enable_owner_panel must be true.
 * Includes: PanelSidebar + content area.
 * OnboardingWizard shows on first access when config.onboarding_completed is false.
 */

import { redirect } from 'next/navigation'
import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { isPanelRole } from '@/lib/panel-access-policy'
import PanelSidebar from '@/components/panel/PanelSidebar'
import PanelOnboarding from '@/components/panel/PanelOnboarding'

export default async function PanelLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags, planLimits } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Auth guard: check owner role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${lang}/login`)
    }

    // Check role in profiles table
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!isPanelRole(profile?.role)) {
        // Not authorized for panel — redirect to customer account
        redirect(`/${lang}/cuenta`)
    }

    // Feature flag gate: enable_owner_panel controls all panel access
    if (!featureFlags.enable_owner_panel) {
        redirect(`/${lang}`)
    }

    // ── Feature-flag sub-route guard (Defense in Depth) ──
    const { headers } = await import('next/headers')
    const { shouldAllowPanelRoute } = await import('@/lib/panel-policy')
    const headersList = await headers()
    // x-invoke-path contains the current requested path in App Router
    const pathname = headersList.get('x-invoke-path') || headersList.get('x-middleware-invoke') || ''
    const pathSegments = pathname.split('/').filter(Boolean)
    const panelIndex = pathSegments.indexOf('panel')
    if (panelIndex !== -1 && pathSegments[panelIndex + 1]) {
        const routeSegment = pathSegments[panelIndex + 1]
        // Cast to panel route key since the runtime segments might include unknowns
        if (!shouldAllowPanelRoute(routeSegment as import('@/lib/panel-policy').PanelRouteKey, featureFlags)) {
            redirect(`/${lang}/panel`)
        }
    }

    // Determine store URL for onboarding
    const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || `/${lang}`

    // Count active modules from feature flags
    const moduleFlags = [
        featureFlags.enable_carousel,
        featureFlags.enable_whatsapp_checkout,
        featureFlags.enable_cms_pages,
        featureFlags.enable_analytics,
        featureFlags.enable_chatbot,
        featureFlags.enable_self_service_returns,
        featureFlags.enable_crm,
        featureFlags.enable_reviews,
    ]
    const activeModuleCount = moduleFlags.filter(Boolean).length

    return (
        <div className="min-h-screen bg-surface-0 md:flex">
            <PanelSidebar
                lang={lang}
                businessName={config.business_name}
                featureFlags={{
                    enable_carousel: featureFlags.enable_carousel,
                    enable_whatsapp_checkout: featureFlags.enable_whatsapp_checkout,
                    enable_cms_pages: featureFlags.enable_cms_pages,
                    enable_analytics: featureFlags.enable_analytics,
                    enable_chatbot: featureFlags.enable_chatbot,
                    enable_self_service_returns: featureFlags.enable_self_service_returns,
                    enable_crm: featureFlags.enable_crm,
                    enable_reviews: featureFlags.enable_reviews,
                    owner_lite_enabled: featureFlags.owner_lite_enabled,
                    owner_advanced_modules_enabled: featureFlags.owner_advanced_modules_enabled,
                }}
                labels={{
                    dashboard: t('panel.nav.dashboard'),
                    catalog: t('panel.nav.catalog'),
                    orders: t('panel.nav.orders'),
                    customers: t('panel.nav.customers'),
                    storeConfig: t('panel.nav.storeConfig'),
                    shipping: t('panel.nav.shipping'),
                    myProject: t('panel.nav.myProject'),
                    modules: t('panel.nav.modules'),
                    carousel: t('panel.nav.carousel'),
                    whatsapp: t('panel.nav.whatsapp'),
                    pages: t('panel.nav.pages'),
                    analytics: t('panel.nav.analytics'),
                    badges: t('panel.nav.badges'),
                    chatbot: t('panel.nav.chatbot'),
                    returns: t('panel.nav.returns'),
                    crm: t('panel.nav.crm'),
                    reviews: t('panel.nav.reviews'),
                    ownerPanel: t('panel.nav.ownerPanel'),
                    backToStore: t('panel.nav.backToStore'),
                }}
                planName={planLimits.plan_name}
            />
            <div className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8">
                    {/* Onboarding — welcome + guided tour on first panel access */}
                    {!config.onboarding_completed && (
                        <PanelOnboarding
                            storeName={config.business_name}
                            storeUrl={storeUrl}
                            locale={lang}
                            domain={process.env.NEXT_PUBLIC_STORE_DOMAIN || null}
                            currency={config.default_currency || 'EUR'}
                            language={config.language || 'en'}
                            moduleCount={activeModuleCount}
                            hasLogo={!!config.logo_url}
                            hasContact={!!config.whatsapp_number || !!config.store_email}
                            translations={Object.fromEntries(
                                Object.keys(dictionary)
                                    .filter(k => k.startsWith('welcome.') || k.startsWith('tour.') || k.startsWith('onboarding.'))
                                    .map(k => [k, (dictionary as Record<string, string>)[k]])
                            )}
                        />
                    )}
                    {children}
                </div>
            </div>
        </div>
    )
}

