/**
 * Customers Page — Owner Panel
 *
 * Server component fetches customers from Medusa Admin API,
 * delegates to CustomersClient for interactive UI.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminCustomers, getCustomerCount } from '@/lib/medusa/admin'
import CustomersClient from './CustomersClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.customers.title') }
}

export default async function CustomersPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const [{ customers }, totalCount] = await Promise.all([
        getAdminCustomers({ limit: 50 }),
        getCustomerCount(),
    ])

    return (
        <div className="space-y-6">
            <CustomersClient
                customers={customers}
                totalCount={totalCount}
                lang={lang}
                labels={{
                    title: t('panel.customers.title'),
                    subtitle: t('panel.customers.subtitle'),
                    searchPlaceholder: t('panel.customers.searchPlaceholder'),
                    noCustomers: t('panel.customers.noCustomers'),
                    customer: t('panel.customers.customer'),
                    email: t('panel.customers.email'),
                    orders: t('panel.customers.orders'),
                    totalSpent: t('panel.customers.totalSpent'),
                    joinedDate: t('panel.customers.joinedDate'),
                    total: t('panel.orders.total'),
                }}
            />
        </div>
    )
}
