/**
 * (panel) group layout — Owner Panel chrome
 *
 * Auth guard: owner or super_admin only.
 * Includes: PanelSidebar + content area.
 * Panel access is ALWAYS available by role — never gated by feature flags.
 */

import { redirect } from 'next/navigation'
import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { isPanelRole } from '@/lib/panel-access-policy'
import PanelSidebar from '@/components/panel/PanelSidebar'

export default async function PanelLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Auth guard: check for owner or super_admin role
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
                    modules: t('panel.nav.modules'),
                    carousel: t('panel.nav.carousel'),
                    whatsapp: t('panel.nav.whatsapp'),
                    pages: t('panel.nav.pages'),
                    analytics: t('panel.nav.analytics'),
                    badges: t('panel.nav.badges'),
                    chatbot: t('panel.nav.chatbot'),
                    returns: t('panel.nav.returns'),
                    crm: t('panel.nav.crm'),
                    ownerPanel: t('panel.nav.ownerPanel'),
                    backToStore: t('panel.nav.backToStore'),
                }}
            />
            <div className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8">
                    {children}
                </div>
            </div>
        </div>
    )
}
