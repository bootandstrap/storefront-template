import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
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
    await params
    const { config, featureFlags } = await getConfig()

    // Bank details are stored as optional columns in config
    // Cast via unknown to access potential bank-related fields
    const configAny = config as unknown as Record<string, unknown>
    const bankDetails = {
        bank_name: (configAny.bank_name as string) ?? null,
        bank_account_number: (configAny.bank_account_number as string) ?? null,
        bank_account_holder: (configAny.bank_account_holder as string) ?? null,
        bank_account_type: (configAny.bank_account_type as string) ?? null,
        bank_nit: (configAny.bank_nit as string) ?? null,
    }

    return (
        <CheckoutPageClient
            config={config}
            featureFlags={featureFlags}
            bankDetails={bankDetails}
        />
    )
}
