import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { checkLimit } from '@/lib/limits'
import { createClient } from '@/lib/supabase/server'
import RegisterForm from './RegisterForm'

export const dynamic = 'force-dynamic'

export default async function RegistroPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags, planLimits } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const businessName = config.business_name || 'Store'

    if (!isFeatureEnabled(featureFlags, 'enable_user_registration')) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
                <p className="text-text-muted">{t('common.pageNotFound')}</p>
            </div>
        )
    }

    // -----------------------------------------------------------------------
    // Governance: max_customers plan limit
    // -----------------------------------------------------------------------
    const supabase = await createClient()
    const tenantId = getRequiredTenantId()
    const { count: customerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer')
        .eq('tenant_id', tenantId)

    const limitCheck = checkLimit(planLimits, 'max_customers', customerCount ?? 0)
    if (!limitCheck.allowed) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
                <div className="glass-strong rounded-2xl p-8 text-center max-w-md">
                    <div className="text-4xl mb-4">🚫</div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">
                        {t('limits.registrationClosed')}
                    </h2>
                    <p className="text-text-muted">
                        {t('limits.registrationClosedDesc')}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="glass-strong rounded-2xl p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold font-display text-text-primary">
                            {t('auth.createAccount')}
                        </h1>
                        <p className="text-sm text-text-muted mt-1">
                            {t('auth.registerSubtitle', { store: businessName })}
                        </p>
                    </div>

                    {/* Registration form (client component) */}
                    <RegisterForm
                        lang={lang}
                        showGoogleAuth={isFeatureEnabled(featureFlags, 'enable_google_auth')}
                    />
                </div>
            </div>
        </div>
    )
}
