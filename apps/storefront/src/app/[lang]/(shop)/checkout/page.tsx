import { redirect } from 'next/navigation'
import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getRegions } from '@/lib/medusa/region'
import CheckoutPageClient from './CheckoutPageClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('checkout.title') }
}

export default async function CheckoutPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags, planLimits, planExpired } = await getConfig()

    // -----------------------------------------------------------------------
    // Governance: require_auth_to_order / enable_guest_checkout
    // -----------------------------------------------------------------------
    if (featureFlags.require_auth_to_order || !featureFlags.enable_guest_checkout) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            redirect(`/${lang}/login?redirect=checkout`)
        }
    }

    // -----------------------------------------------------------------------
    // Governance: plan_expires_at
    // -----------------------------------------------------------------------
    if (planExpired) {
        const dictionary = await getDictionary(lang as Locale)
        const t = createTranslator(dictionary)
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="glass-strong rounded-2xl p-8 text-center max-w-md">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-tx mb-2">
                        {t('limits.planExpired')}
                    </h2>
                    <p className="text-tx-muted">
                        {t('limits.planExpiredDesc')}
                    </p>
                </div>
            </div>
        )
    }

    // -----------------------------------------------------------------------
    // Governance: max_orders_month
    // -----------------------------------------------------------------------
    // This is also enforced server-side in checkout actions, but we show a
    // friendly page here too for better UX
    // (Actual count check happens in actions.ts to avoid extra DB call here)

    // -----------------------------------------------------------------------
    // Medusa: region countries for address step
    // -----------------------------------------------------------------------
    const regions = await getRegions()
    const countryMap = new Map<string, string>()
    for (const region of regions) {
        for (const country of region.countries) {
            countryMap.set(country.iso_2, country.display_name)
        }
    }
    const countries = Array.from(countryMap.entries()).map(([iso_2, display_name]) => ({
        iso_2,
        display_name,
    }))

    // Bank details are now proper typed columns on StoreConfig
    const bankDetails = {
        bank_name: config.bank_name ?? null,
        bank_account_number: config.bank_account_number ?? null,
        bank_account_holder: config.bank_account_holder ?? null,
        bank_account_type: config.bank_account_type ?? null,
        bank_nit: config.bank_id_number ?? null,
    }

    return (
        <CheckoutPageClient
            config={config}
            featureFlags={featureFlags}
            planLimits={planLimits}
            countries={countries}
            bankDetails={bankDetails}
        />
    )
}
