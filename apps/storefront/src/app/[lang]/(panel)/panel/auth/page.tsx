/**
 * Auth Advanced Dashboard — Owner Panel
 *
 * Provider configuration, roles, login activity log.
 * Gated by enable_auth_advanced feature flag (module: Auth Advanced).
 *
 * Data sources:
 * - Provider toggles: governance feature flags (read-only from owner's perspective)
 * - Activity: real profiles from Supabase (tenant-scoped)
 * - Security score: computed from real flag state
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
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

    if (!featureFlags.enable_auth_advanced) {
        return <FeatureGate flag="enable_auth_advanced" lang={lang} />
    }

    const authConfig = {
        emailAuth: featureFlags.enable_email_auth,
        googleAuth: featureFlags.enable_google_oauth,
        guestCheckout: featureFlags.enable_guest_checkout,
        requireAuthToOrder: featureFlags.require_auth_to_order,
        userRegistration: featureFlags.enable_user_registration,
    }

    // Fetch real auth activity data
    const authStats = await getAuthActivityAction()

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.auth.title')}
                subtitle={t('panel.auth.subtitle')}
                icon={<Shield className="w-5 h-5" />}
            />
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
        </div>
    )
}
