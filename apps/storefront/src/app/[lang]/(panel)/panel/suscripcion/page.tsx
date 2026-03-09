import { createClient } from '@/lib/supabase/server'
import { withPanelGuard } from '@/lib/panel-guard'
import SubscriptionClient from './SubscriptionClient'
import { getActiveModulesForTenant } from '@/lib/active-modules'

export const dynamic = 'force-dynamic'

/**
 * /panel/suscripcion — Modules & Billing overview
 *
 * Shows the owner's active modules, available add-ons,
 * maintenance status, and billing management.
 * Auth-guarded by withPanelGuard().
 */
export default async function SubscriptionPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId, appConfig } = await withPanelGuard()
    const { tenantStatus, maintenanceDaysRemaining } = appConfig

    // Check if tenant has Stripe customer
    const supabase = await createClient()
    const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', tenantId)
        .single()

    const hasStripeCustomer = !!tenant?.stripe_customer_id

    // Now get commercial active modules
    const activeModuleOrders = await getActiveModulesForTenant(tenantId)

    return (
        <SubscriptionClient
            activeModuleOrders={activeModuleOrders}
            tenantStatus={tenantStatus}
            maintenanceDaysRemaining={maintenanceDaysRemaining}
            hasStripeCustomer={hasStripeCustomer}
            lang={lang}
        />
    )
}
