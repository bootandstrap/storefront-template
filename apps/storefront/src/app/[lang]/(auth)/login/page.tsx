import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<{ error?: string; forgot?: string; redirect?: string }>
}) {
    const { lang } = await params
    const sp = await searchParams
    const { config, featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const businessName = config.business_name || 'Store'

    const emailEnabled = isFeatureEnabled(featureFlags, 'enable_email_auth')
    const googleEnabled = isFeatureEnabled(featureFlags, 'enable_google_oauth')
    const registrationEnabled = isFeatureEnabled(featureFlags, 'enable_user_registration')

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="glass-strong rounded-2xl p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold font-display text-tx">
                            {t('auth.login')}
                        </h1>
                        <p className="text-sm text-tx-muted mt-1">
                            {t('auth.loginSubtitle', { store: businessName })}
                        </p>
                    </div>

                    {/* OAuth error from callback */}
                    {sp.error === 'auth' && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                            {t('auth.oauthError')}
                        </div>
                    )}

                    {/* No auth methods available */}
                    {!emailEnabled && !googleEnabled && (
                        <div className="text-center py-6">
                            <div className="text-4xl mb-3">🔒</div>
                            <p className="text-sm text-tx-muted">
                                {t('auth.noMethodsAvailable')}
                            </p>
                        </div>
                    )}

                    {/* Email/Password form (client component) */}
                    {emailEnabled && (
                        <LoginForm
                            lang={lang}
                            showGoogleAuth={googleEnabled}
                            showRegistration={registrationEnabled}
                            redirectTo={sp.redirect}
                        />
                    )}

                    {/* Google-only (no email auth) */}
                    {!emailEnabled && googleEnabled && (
                        <LoginForm
                            lang={lang}
                            showGoogleAuth={true}
                            showRegistration={registrationEnabled}
                            redirectTo={sp.redirect}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
