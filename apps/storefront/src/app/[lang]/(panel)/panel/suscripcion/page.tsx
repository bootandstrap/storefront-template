import { getConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import SubscriptionClient from './SubscriptionClient'
import { getActiveModulesForTenant } from '@/lib/active-modules'

export const dynamic = 'force-dynamic'

/**
 * /panel/suscripcion — Modules & Billing overview
 *
 * Shows the owner's active modules, available add-ons,
 * maintenance status, and billing management.
 * Auth-guarded by the (panel) layout group.
 */
export default async function SubscriptionPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const appConfig = await getConfig()
    const { featureFlags, planLimits, tenantStatus, maintenanceDaysRemaining } = appConfig

    // Check if tenant has Stripe customer
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let hasStripeCustomer = false
    let profileTenantId = null
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (profile?.tenant_id) {
            profileTenantId = profile.tenant_id
            const { data: tenant } = await supabase
                .from('tenants')
                .select('stripe_customer_id')
                .eq('id', profile.tenant_id)
                .single()

            hasStripeCustomer = !!tenant?.stripe_customer_id
        }
    }

    // Build list of module flags and their status from feature_flags
    const moduleFlags: Record<string, boolean> = {}
    const flagKeys = Object.keys(featureFlags) as (keyof typeof featureFlags)[]
    for (const key of flagKeys) {
        if (key.startsWith('enable_')) {
            moduleFlags[key] = featureFlags[key] as boolean
        }
    }

    // Now get commercial active modules
    const activeModuleOrders = profileTenantId
        ? await getActiveModulesForTenant(profileTenantId)
        : []

    return (
        <SubscriptionClient
            moduleFlags={moduleFlags}
            activeModuleOrders={activeModuleOrders}
            planLimits={planLimits as unknown as Record<string, number | string>}
            tenantStatus={tenantStatus}
            maintenanceDaysRemaining={maintenanceDaysRemaining}
            hasStripeCustomer={hasStripeCustomer}
            lang={lang}
        />
    )
}
