/**
 * Auth Advanced Dashboard — Owner Panel
 *
 * Provider configuration, roles, login activity log.
 * Gated by enable_auth_advanced feature flag (module: Auth Advanced).
 * SOTA 2026: ModuleShell wrapper with tier awareness.
 *
 * Data sources:
 * - Provider toggles: governance feature flags (read-only from owner's perspective)
 * - Activity: real profiles from Supabase (tenant-scoped)
 * - Security score: computed from real flag state
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import ModuleShell from '@/components/panel/ModuleShell'
import { Shield } from 'lucide-react'
import AuthClient from './AuthClient'
import { getAuthActivityAction } from './actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.auth.title') }
}

export default async function AuthPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const isLocked = !featureFlags.enable_auth_advanced

    const tierInfo = {
        currentTier: isLocked ? 'Free' : 'Activo',
        moduleKey: 'auth_advanced',
        nextTierFeatures: isLocked ? [
            t('panel.auth.feat.providers') || 'Configuración de proveedores OAuth',
            t('panel.auth.feat.roles') || 'Gestión de roles y permisos',
            t('panel.auth.feat.activity') || 'Log de actividad de login',
            t('panel.auth.feat.security') || 'Security score en tiempo real',
        ] : undefined,
        nextTierName: isLocked ? 'Auth Avanzado' : undefined,
        nextTierPrice: isLocked ? 10 : undefined,
    }

    const authConfig = !isLocked ? {
        emailAuth: featureFlags.enable_email_auth,
        googleAuth: featureFlags.enable_google_oauth,
        guestCheckout: featureFlags.enable_guest_checkout,
        requireAuthToOrder: featureFlags.require_auth_to_order,
        userRegistration: featureFlags.enable_user_registration,
    } : null

    // Fetch real auth activity data (only when unlocked)
    const authStats = !isLocked ? await getAuthActivityAction() : null

    return (
        <ModuleShell
            icon={<Shield className="w-5 h-5" />}
            title={t('panel.auth.title') || 'Autenticación Avanzada'}
            subtitle={t('panel.auth.subtitle') || 'Proveedores, roles y actividad de login'}
            isLocked={isLocked}
            gateFlag="enable_auth_advanced"
            tierInfo={tierInfo}
            lang={lang}
        >
            {authConfig && authStats && (
                <AuthClient
                    authConfig={authConfig}
                    authStats={authStats}
                    labels={{
                        providers: t('panel.auth.providers'),
                        loginActivity: t('panel.auth.loginActivity'),
                        securitySettings: t('panel.auth.securitySettings'),
                        emailProvider: t('panel.auth.emailProvider'),
                        googleProvider: t('panel.auth.googleProvider'),
                        guestAccess: t('panel.auth.guestAccess'),
                        requireAuth: t('panel.auth.requireAuth'),
                        registration: t('panel.auth.registration'),
                        totalLogins: t('panel.auth.totalLogins'),
                        activeProviders: t('panel.auth.activeProviders'),
                        securityScore: t('panel.auth.securityScore'),
                        tabProviders: t('panel.auth.tabProviders'),
                        tabActivity: t('panel.auth.tabActivity'),
                        tabSecurity: t('panel.auth.tabSecurity'),
                    }}
                    lang={lang}
                />
            )}
        </ModuleShell>
    )
}
