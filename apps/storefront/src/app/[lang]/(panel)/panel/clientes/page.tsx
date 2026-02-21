/**
 * Customers Page — Owner Panel
 *
 * Server component fetches customers from Medusa Admin API,
 * delegates to CustomersClient for interactive UI.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminCustomers } from '@/lib/medusa/admin'
import { parsePanelListQuery } from '@/lib/panel-list-query'
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
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { lang } = await params
    const rawSearchParams = await searchParams
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const query = parsePanelListQuery(rawSearchParams, { defaultLimit: 20 })

    const { customers, count } = await getAdminCustomers({
        limit: query.limit,
        offset: query.offset,
        q: query.q,
    })

    return (
        <div className="space-y-6">
            <CustomersClient
                customers={customers}
                totalCount={count}
                currentPage={query.page}
                pageSize={query.limit}
                initialSearch={query.q ?? ''}
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
                    previous: t('pagination.previous'),
                    next: t('pagination.next'),
                }}
            />
        </div>
    )
}
