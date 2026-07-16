/**
 * (panel) group layout — Owner Panel chrome
 *
 * Auth guard: owner only.
 * Feature flag gate: enable_owner_panel must be true.
 * Includes: PanelShell (Topbar + Sidebar) + content area.
 * OnboardingWizard shows on first access when config.onboarding_completed is false.
 */

import { redirect } from 'next/navigation'
import { getConfigForTenant } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@bootandstrap/tenant-context'
import {
    PanelShell,
    PanelOnboarding,
    AchievementProvider,
    KeyboardShortcutsGuide,
} from '@/components/panel/layout-exports'
import '@/styles/panel-premium.css'
import { PanelThemeProvider } from '@/components/theme/PanelThemeProvider'
import { calculateStoreReadiness } from '@/lib/store-readiness'
import { evaluateAchievements, type AchievementContext } from '@/lib/achievements'
import { buildModuleInfoList } from '@/lib/governance/build-module-info'
import { isStarterPanelRouteAllowed, resolveOwnerExperienceModeForTenant } from '@/lib/starter-build/owner-mode'

export default async function PanelLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang: urlLang } = await params

    // Auth guard: check owner/super_admin role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${urlLang}/login`)
    }

    // Check role in profiles table — super_admin may not have a profile row
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, tenant_id')
        .eq('id', user.id)
        .single()

    const tenantContext = resolveTenantContext({
        profileRole: profile?.role ?? null,
        metadataRole: user.user_metadata?.role ?? null,
        profileTenantId: profile?.tenant_id ?? null,
        envTenantId: process.env.TENANT_ID ?? null,
    })

    if (!tenantContext.isPanelRole) {
        redirect(`/${urlLang}/cuenta`)
    }

    const tenantId = tenantContext.tenantId

    if (!tenantId) {
        redirect(`/${urlLang}/cuenta`)
    }

    const { config, featureFlags, planLimits } = await getConfigForTenant(tenantId)
    const ownerExperienceMode = await resolveOwnerExperienceModeForTenant({
        tenantId,
        supabase: supabase as unknown as NonNullable<Parameters<typeof resolveOwnerExperienceModeForTenant>[0]['supabase']>,
        config: config as Record<string, unknown>,
    })
    const isStarterCollaborative = ownerExperienceMode === 'starter_collaborative'

    // ── Panel language resolution ──
    // The panel language is independent from the storefront language.
    // Priority: panel_language (explicit) > config.language (legacy) > URL lang (fallback)
    const panelLang = (
        (config as Record<string, unknown>).panel_language as string
        ?? config.language
        ?? urlLang
    ) as Locale

    // If URL locale doesn't match the panel language, redirect to the correct one
    if (urlLang !== panelLang) {
        const { headers } = await import('next/headers')
        const headersList = await headers()
        const pathname = headersList.get('x-invoke-path') || headersList.get('x-url') || `/${urlLang}/panel`
        const correctedPath = pathname.replace(`/${urlLang}/`, `/${panelLang}/`)
        redirect(correctedPath)
    }

    const lang = panelLang
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Feature flag gate
    if (!featureFlags.enable_owner_panel) {
        redirect(`/${lang}`)
    }

    // ── Feature-flag sub-route guard (Defense in Depth) ──
    const { headers } = await import('next/headers')
    const { shouldAllowPanelRoute } = await import('@/lib/panel-policy')
    const headersList = await headers()
    const cspNonce = headersList.get('x-csp-nonce') ?? undefined
    const pathname = headersList.get('x-invoke-path') || headersList.get('x-middleware-invoke') || ''
    const pathSegments = pathname.split('/').filter(Boolean)
    const panelIndex = pathSegments.indexOf('panel')
    const routeSegment = (panelIndex !== -1 && pathSegments[panelIndex + 1]) ? pathSegments[panelIndex + 1] : undefined
    if (!isStarterPanelRouteAllowed(routeSegment, ownerExperienceMode)) {
        redirect(`/${lang}/panel`)
    }
    if (routeSegment) {
        if (!shouldAllowPanelRoute(routeSegment as import('@/lib/panel-policy').PanelRouteKey, featureFlags)) {
            redirect(`/${lang}/panel`)
        }
    }

    // Determine store URL for onboarding
    const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || `/${lang}`

    // ── Readiness / achievements (disabled in starter collaborative mode) ──
    let achievementUnlockedIds: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storedAchievements: string[] = (config as any).achievements_unlocked || []
    let readinessScore: number | undefined
    let readinessRemaining = 0
    let activeModuleCount = 0
    let readiness: Awaited<ReturnType<typeof calculateStoreReadiness>> | null = null

    if (!isStarterCollaborative) {
        const { getPanelMetrics } = await import('@/lib/panel-data-service')
        const metrics = await getPanelMetrics(tenantId, lang)
        activeModuleCount = [
            featureFlags.enable_carousel,
            featureFlags.enable_whatsapp_checkout,
            featureFlags.enable_cms_pages,
            featureFlags.enable_analytics,
            featureFlags.enable_chatbot,
            featureFlags.enable_self_service_returns,
            featureFlags.enable_crm,
            featureFlags.enable_reviews,
            featureFlags.enable_pos,
        ].filter(Boolean).length

        try {
            readiness = await calculateStoreReadiness(tenantId, lang)
            readinessScore = readiness.score
            readinessRemaining = readiness.checks.filter(c => !c.done).length
        } catch {
            // Degrade gracefully
        }

        if (config.onboarding_completed && readiness) {
            try {
                const achCtx: AchievementContext = {
                    productCount: metrics.productCount,
                    categoryCount: metrics.categoryCount,
                    ordersThisMonth: metrics.ordersThisMonth,
                    hasLogo: !!config.logo_url,
                    hasContact: !!config.whatsapp_number || !!config.store_email,
                    hasPaymentMethod: featureFlags.enable_whatsapp_checkout || featureFlags.enable_online_payments || featureFlags.enable_cash_on_delivery || featureFlags.enable_bank_transfer,
                    maintenanceOff: !featureFlags.enable_maintenance_mode,
                    activeModuleCount,
                    tourCompleted: !!config.onboarding_completed,
                    readinessScore: readiness.score,
                    revenueThisMonth: metrics.revenue.revenueThisMonth,
                }
                achievementUnlockedIds = evaluateAchievements(achCtx)
            } catch {
                // Degrade gracefully
            }
        }
    }

    // Pre-compute new IDs server-side so the client only gets truly new ones
    const storedSet = new Set(storedAchievements)
    const newAchievementIds = achievementUnlockedIds.filter(id => !storedSet.has(id))

    // Build achievement label map
    const achievementLabels = Object.fromEntries(
        Object.keys(dictionary)
            .filter(k => k.startsWith('achievement.'))
            .map(k => [k, (dictionary as Record<string, string>)[k]])
    )

    // ── Owner name resolution ──
    const ownerName = profile?.full_name || config.business_name || ''

    // ── Breadcrumb map (segment → localized label) ──
    const breadcrumbMap: Record<string, string> = {
        // ── New hub routes ──
        'mi-tienda': t('panel.section.myStore'),
        ventas: t('panel.section.sales'),
        ajustes: t('panel.section.settings'),
        modulos: t('panel.nav.modules'),
        pos: t('panel.nav.pos'),
        // ── Legacy route labels (still needed for redirects + module pages) ──
        catalogo: t('panel.nav.catalog'),
        pedidos: t('panel.nav.orders'),
        clientes: t('panel.nav.customers'),
        utilidades: t('panel.nav.utilities'),
        tienda: t('panel.nav.storeConfig'),
        envios: t('panel.nav.shipping'),
        'mi-proyecto': t('panel.nav.myProject'),
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
        seo: t('panel.nav.seo'),
        'redes-sociales': t('panel.nav.socialMedia'),
        idiomas: t('panel.nav.i18n'),
        automatizaciones: t('panel.nav.automations'),
        auth: t('panel.nav.authAdvanced'),
        canales: t('panel.nav.salesChannels'),
        capacidad: t('panel.nav.capacity') || 'Capacidad',
        email: t('panel.nav.email') || 'Email',
    }

    // ── Greetings ──
    const greetings = {
        morning: t('panel.greeting.morning'),
        afternoon: t('panel.greeting.afternoon'),
        evening: t('panel.greeting.evening'),
    }

    // ── Command Palette items ──
    const { getPanelSections } = await import('@/lib/panel-policy')
    const sections = getPanelSections({
        lang,
        labels: {
            home: isStarterCollaborative ? t('panel.nav.myProject') : t('panel.section.home'),
            myStore: t('panel.section.myStore'),
            sales: t('panel.section.sales'),
            modules: t('panel.section.modules'),
            settings: t('panel.section.settings'),
            pos: t('panel.section.pos'),
            ownerPanel: t('panel.nav.ownerPanel'),
            backToStore: t('panel.nav.backToStore'),
            health: t('storeHealth.title'),
        },
        featureFlags,
        ownerExperienceMode,
    })

    const commandPaletteItems = isStarterCollaborative
        ? sections.map(section => ({
            id: `nav-${section.key}`,
            label: section.label,
            group: 'navigation' as const,
            icon: section.icon,
            href: section.href,
        }))
        : [
            ...sections.map(section => ({
                id: `nav-${section.key}`,
                label: section.label,
                group: 'navigation' as const,
                icon: section.icon,
                href: section.href,
            })),
            {
                id: 'action-add-product',
                label: t('panel.cmdPalette.addProduct'),
                group: 'actions' as const,
                icon: 'addProduct',
                href: `/${lang}/panel/mi-tienda`,
                keywords: ['add', 'nuevo', 'product', 'crear', 'producto'],
            },
            {
                id: 'action-settings',
                label: t('panel.cmdPalette.storeSettings'),
                group: 'actions' as const,
                icon: 'settings',
                href: `/${lang}/panel/ajustes`,
                keywords: ['config', 'settings', 'ajustes', 'tienda'],
            },
            {
                id: 'action-orders',
                label: t('panel.nav.orders'),
                group: 'actions' as const,
                icon: 'orders',
                href: `/${lang}/panel/ventas`,
                keywords: ['orders', 'pedidos', 'ventas'],
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
        <PanelThemeProvider nonce={cspNonce}>
        <PanelShell
            tenantId={config.tenant_id ?? undefined}
            lang={lang}
            ownerName={ownerName}
            businessName={config.business_name}
            sidebarLabels={{
                home: isStarterCollaborative ? t('panel.nav.myProject') : t('panel.section.home'),
                myStore: t('panel.section.myStore'),
                sales: t('panel.section.sales'),
                modules: t('panel.section.modules'),
                settings: t('panel.section.settings'),
                pos: t('panel.section.pos'),
                ownerPanel: t('panel.nav.ownerPanel'),
                backToStore: t('panel.nav.backToStore'),
                health: t('storeHealth.title'),
            }}
            ownerExperienceMode={ownerExperienceMode}
            featureFlags={{
                enable_carousel: featureFlags.enable_carousel,
                enable_whatsapp_checkout: featureFlags.enable_whatsapp_checkout,
                enable_cms_pages: featureFlags.enable_cms_pages,
                enable_analytics: featureFlags.enable_analytics,
                enable_chatbot: featureFlags.enable_chatbot,
                enable_self_service_returns: featureFlags.enable_self_service_returns,
                enable_crm: featureFlags.enable_crm,
                enable_reviews: featureFlags.enable_reviews,
                enable_pos: featureFlags.enable_pos,
                enable_traffic_expansion: featureFlags.enable_traffic_expansion,
                enable_product_badges: featureFlags.enable_product_badges,
                enable_seo: featureFlags.enable_seo,
                enable_social_media: featureFlags.enable_social_media,
                enable_multi_language: featureFlags.enable_multi_language,
                enable_automations: featureFlags.enable_automations,
                enable_auth_advanced: featureFlags.enable_auth_advanced,
                enable_sales_channels: featureFlags.enable_sales_channels,
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
            planName={isStarterCollaborative ? undefined : planLimits.plan_name}
            commandPaletteItems={commandPaletteItems}
            commandPaletteLabels={commandPaletteLabels}
            setupNudge={!isStarterCollaborative && config.onboarding_completed && readinessScore != null && readinessScore < 60 && readinessRemaining > 0 ? {
                label: t('panel.topbar.stepsLeft').replace('{{count}}', String(readinessRemaining)),
                href: `/${lang}/panel`,
            } : null}
            defaultCurrency={config.default_currency}
            logoUrl={config.logo_url || undefined}
            readinessScore={readinessScore}
            badges={isStarterCollaborative ? undefined : { modules: activeModuleCount }}
        >
            {/* Onboarding — SOTA wizard on first panel access (suppressed on immersive routes like POS) */}
            {!isStarterCollaborative && !config.onboarding_completed && routeSegment !== 'pos' && (
                <PanelOnboarding
                    storeName={config.business_name}
                    storeUrl={storeUrl}
                    locale={lang}
                    domain={process.env.NEXT_PUBLIC_STORE_DOMAIN || null}
                    currency={config.default_currency}
                    language={config.language || 'en'}
                    modules={buildModuleInfoList(featureFlags, planLimits as Record<string, number | string | null>)}
                    featureFlags={featureFlags}
                    planLimits={planLimits as Record<string, number | string | null>}
                    config={config as unknown as Record<string, unknown>}
                    hasMultiLanguage={!!featureFlags.enable_multi_language}
                    maxLanguages={typeof planLimits.max_languages === 'number' ? planLimits.max_languages : 1}
                    activeLanguages={
                        Array.isArray((config as Record<string, unknown>).active_languages)
                            ? (config as Record<string, unknown>).active_languages as string[]
                            : [config.language || 'es']
                    }
                    translations={Object.fromEntries(
                        Object.keys(dictionary)
                            .filter(k =>
                                k.startsWith('welcome.') ||
                                k.startsWith('tour.') ||
                                k.startsWith('onboarding.')
                            )
                            .map(k => [k, (dictionary as Record<string, string>)[k]])
                    )}
                />
            )}
            <AchievementProvider
                currentlyUnlocked={achievementUnlockedIds}
                previouslyStored={storedAchievements}
                newAchievementIds={newAchievementIds}
                achievementLabels={achievementLabels}
                unlockLabel={t('achievement.unlocked')}
            >
                {children}
            </AchievementProvider>
            <KeyboardShortcutsGuide />
        </PanelShell>
        </PanelThemeProvider>
    )
}
