/**
 * (panel) group layout — Owner Panel chrome
 *
 * Auth guard: owner only.
 * Feature flag gate: enable_owner_panel must be true.
 * Includes: PanelShell (Topbar + Sidebar) + content area.
 * OnboardingWizard shows on first access when config.onboarding_completed is false.
 */

import { redirect } from 'next/navigation'
import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { isPanelRole } from '@/lib/panel-access-policy'
import PanelShell from '@/components/panel/PanelShell'
import PanelOnboarding from '@/components/panel/PanelOnboarding'
import AchievementProvider from '@/components/panel/AchievementProvider'
import { calculateStoreReadiness } from '@/lib/store-readiness'
import { evaluateAchievements, type AchievementContext } from '@/lib/achievements'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import {
    getProductCount,
    getCategoryCount,
    getOrdersThisMonth,
    getRecentOrders,
} from '@/lib/medusa/admin'

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
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .single()

    if (!isPanelRole(profile?.role)) {
        redirect(`/${lang}/cuenta`)
    }

    // Feature flag gate
    if (!featureFlags.enable_owner_panel) {
        redirect(`/${lang}`)
    }

    // ── Feature-flag sub-route guard (Defense in Depth) ──
    const { headers } = await import('next/headers')
    const { shouldAllowPanelRoute } = await import('@/lib/panel-policy')
    const headersList = await headers()
    const pathname = headersList.get('x-invoke-path') || headersList.get('x-middleware-invoke') || ''
    const pathSegments = pathname.split('/').filter(Boolean)
    const panelIndex = pathSegments.indexOf('panel')
    if (panelIndex !== -1 && pathSegments[panelIndex + 1]) {
        const routeSegment = pathSegments[panelIndex + 1]
        if (!shouldAllowPanelRoute(routeSegment as import('@/lib/panel-policy').PanelRouteKey, featureFlags)) {
            redirect(`/${lang}/panel`)
        }
    }

    // Determine store URL for onboarding
    const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || `/${lang}`

    // Count active modules
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

    // ── Achievement evaluation for provider ──
    let achievementUnlockedIds: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storedAchievements: string[] = (config as any).achievements_unlocked || []

    if (config.onboarding_completed) {
        try {
            const tenantId = config.tenant_id || ''
            const readiness = await calculateStoreReadiness(tenantId, lang)

            let productCount = 0
            let categoryCount = 0
            let ordersThisMonth = 0
            let revenueThisMonth = 0

            try {
                const scope = await getTenantMedusaScope(tenantId)
                const [pc, cc, otm, ro] = await Promise.all([
                    getProductCount(scope),
                    getCategoryCount(scope),
                    getOrdersThisMonth(scope),
                    getRecentOrders(5, scope),
                ])
                productCount = pc
                categoryCount = cc
                ordersThisMonth = otm
                revenueThisMonth = ro.reduce((s, o) => s + (o.total ?? 0), 0)
            } catch { /* degrade */ }

            const achCtx: AchievementContext = {
                productCount,
                categoryCount,
                ordersThisMonth,
                hasLogo: !!config.logo_url,
                hasContact: !!config.whatsapp_number || !!config.store_email,
                hasPaymentMethod: featureFlags.enable_whatsapp_checkout || featureFlags.enable_online_payments || featureFlags.enable_cash_on_delivery || featureFlags.enable_bank_transfer,
                maintenanceOff: !featureFlags.enable_maintenance_mode,
                activeModuleCount,
                tourCompleted: !!config.onboarding_completed,
                readinessScore: readiness.score,
                revenueThisMonth,
            }
            achievementUnlockedIds = evaluateAchievements(achCtx)
        } catch {
            // Degrade gracefully
        }
    }

    // Build achievement label map
    const achievementLabels = Object.fromEntries(
        Object.keys(dictionary)
            .filter(k => k.startsWith('achievement.'))
            .map(k => [k, (dictionary as Record<string, string>)[k]])
    )

    // ── Owner name resolution ──
    const ownerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || config.business_name || ''

    // ── Breadcrumb map (segment → localized label) ──
    const breadcrumbMap: Record<string, string> = {
        catalogo: t('panel.nav.catalog'),
        pedidos: t('panel.nav.orders'),
        clientes: t('panel.nav.customers'),
        tienda: t('panel.nav.storeConfig'),
        envios: t('panel.nav.shipping'),
        'mi-proyecto': t('panel.nav.myProject'),
        modulos: t('panel.nav.modules'),
        carrusel: t('panel.nav.carousel'),
        mensajes: t('panel.nav.whatsapp'),
        paginas: t('panel.nav.pages'),
        analiticas: t('panel.nav.analytics'),
        insignias: t('panel.nav.badges'),
        chatbot: t('panel.nav.chatbot'),
        devoluciones: t('panel.nav.returns'),
        crm: t('panel.nav.crm'),
        resenas: t('panel.nav.reviews'),
        suscripcion: t('panel.nav.subscription'),
    }

    // ── Greetings ──
    const greetings = {
        morning: t('panel.greeting.morning'),
        afternoon: t('panel.greeting.afternoon'),
        evening: t('panel.greeting.evening'),
    }

    // ── Command Palette items ──
    const { getPanelNavigation } = await import('@/lib/panel-policy')
    const { essentialItems: navEssentialItems, moduleItems: navModuleItems } = getPanelNavigation({
        lang,
        labels: {
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
        },
        featureFlags,
    })

    const commandPaletteItems = [
        ...navEssentialItems.map(item => ({
            id: `nav-${item.key}`,
            label: item.label,
            group: 'navigation' as const,
            icon: item.key,
            href: item.href,
        })),
        ...navModuleItems.map(item => ({
            id: `nav-${item.key}`,
            label: item.label,
            group: 'navigation' as const,
            icon: item.key,
            href: item.href,
        })),
        // Quick actions
        {
            id: 'action-add-product',
            label: t('panel.cmdPalette.addProduct'),
            group: 'actions' as const,
            icon: 'addProduct',
            href: `/${lang}/panel/productos`,
            keywords: ['add', 'nuevo', 'product', 'crear'],
        },
        {
            id: 'action-settings',
            label: t('panel.cmdPalette.storeSettings'),
            group: 'actions' as const,
            icon: 'settings',
            href: `/${lang}/panel/tienda`,
            keywords: ['config', 'settings', 'ajustes', 'tienda'],
        },
    ]

    const commandPaletteLabels = {
        placeholder: t('panel.cmdPalette.placeholder'),
        navigation: t('panel.cmdPalette.navigation'),
        actions: t('panel.cmdPalette.actions'),
        noResults: t('panel.cmdPalette.noResults'),
        hint: t('panel.cmdPalette.hint'),
    }

    return (
        <PanelShell
            lang={lang}
            ownerName={ownerName}
            businessName={config.business_name}
            sidebarLabels={{
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
            breadcrumbMap={breadcrumbMap}
            greetings={greetings}
            topbarLabels={{
                ownerPanel: t('panel.nav.ownerPanel'),
                backToStore: t('panel.nav.backToStore'),
                logout: t('panel.topbar.logout'),
            }}
            planName={planLimits.plan_name}
            commandPaletteItems={commandPaletteItems}
            commandPaletteLabels={commandPaletteLabels}
        >
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
            <AchievementProvider
                currentlyUnlocked={achievementUnlockedIds}
                previouslyStored={storedAchievements}
                achievementLabels={achievementLabels}
                unlockLabel={t('achievement.unlocked')}
            >
                {children}
            </AchievementProvider>
        </PanelShell>
    )
}
