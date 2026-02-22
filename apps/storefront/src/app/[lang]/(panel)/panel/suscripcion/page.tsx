import { getConfig } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import SubscriptionClient from './SubscriptionClient'

export const dynamic = 'force-dynamic'

/**
 * /panel/suscripcion — Subscription management page
 *
 * Shows the owner's current plan, limits, and upgrade options.
 * Auth-guarded by the (panel) layout group.
 */
export default async function SubscriptionPage() {
    const appConfig = await getConfig()
    const { planLimits, tenantStatus, maintenanceDaysRemaining } = appConfig

    // Check if tenant has Stripe customer
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let hasStripeCustomer = false
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (profile?.tenant_id) {
            const { data: tenant } = await supabase
                .from('tenants')
                .select('stripe_customer_id')
                .eq('id', profile.tenant_id)
                .single()

            hasStripeCustomer = !!tenant?.stripe_customer_id
        }
    }

    return (
        <SubscriptionClient
            currentPlan={(planLimits.plan_name as string) || 'starter'}
            planLimits={planLimits as unknown as Record<string, number | string>}
            tenantStatus={tenantStatus}
            maintenanceDaysRemaining={maintenanceDaysRemaining}
            hasStripeCustomer={hasStripeCustomer}
        />
    )
}
