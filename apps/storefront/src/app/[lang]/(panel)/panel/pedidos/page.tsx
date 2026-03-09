/**
 * Orders Page — Owner Panel
 *
 * Server component fetches orders + plan limits, delegates to OrdersClient.
 * Tenant-scoped: all Medusa queries are scoped to the authenticated tenant.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminOrders } from '@/lib/medusa/admin'
import { withPanelGuard } from '@/lib/panel-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { parsePanelListQuery } from '@/lib/panel-list-query'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.orders.title') }
}

export default async function OrdersPage({
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

    // Resolve tenant scope — all admin queries MUST be scoped
    const { tenantId } = await withPanelGuard()
    const scope = await getTenantMedusaScope(tenantId)

    const query = parsePanelListQuery(rawSearchParams, {
        defaultLimit: 20,
        allowedStatuses: ['all', 'pending', 'completed', 'canceled'],
    })

    const { orders, count } = await getAdminOrders({
        limit: query.limit,
        offset: query.offset,
        q: query.q,
        status: query.status,
    }, scope)

    return (
        <div className="space-y-6">
            <OrdersClient
                orders={orders}
                totalCount={count}
                currentPage={query.page}
                pageSize={query.limit}
                initialSearch={query.q ?? ''}
                initialStatus={(query.status as 'all' | 'pending' | 'completed' | 'canceled' | undefined) ?? 'all'}
                lang={lang}
                labels={{
                    title: t('panel.orders.title'),
                    subtitle: t('panel.orders.subtitle'),
                    searchPlaceholder: t('panel.orders.searchPlaceholder'),
                    all: t('panel.orders.all'),
                    pending: t('panel.orders.pending'),
                    completed: t('panel.orders.completed'),
                    canceled: t('panel.orders.canceled'),
                    noOrders: t('panel.orders.noOrders'),
                    noOrdersDesc: t('panel.orders.noOrdersDesc'),
                    order: t('panel.orders.order'),
                    customer: t('panel.orders.customer'),
                    date: t('panel.orders.date'),
                    items: t('panel.orders.items'),
                    total: t('panel.orders.total'),
                    status: t('panel.orders.status'),
                    viewDetail: t('panel.orders.viewDetail'),
                    fulfill: t('panel.orders.fulfill'),
                    cancel: t('panel.orders.cancel'),
                    fulfillConfirm: t('panel.orders.fulfillConfirm'),
                    cancelConfirm: t('panel.orders.cancelConfirm'),
                    refund: t('panel.orders.refund'),
                    refundConfirm: t('panel.orders.refundConfirm'),
                    refundAmount: t('panel.orders.refundAmount'),
                    refundHint: t('panel.orders.refundHint'),
                    refundSuccess: t('panel.orders.refundSuccess'),
                    shippingAddress: t('panel.orders.shippingAddress'),
                    payment: t('panel.orders.payment'),
                    fulfilled: t('panel.orders.fulfilled'),
                    notFulfilled: t('panel.orders.notFulfilled'),
                    shipping: t('panel.orders.shipping'),
                    taxes: t('panel.orders.taxes'),
                    discount: t('panel.orders.discount'),
                    subtotal: t('panel.orders.subtotal'),
                    back: t('common.back'),
                    previous: t('pagination.previous'),
                    next: t('pagination.next'),
                }}
            />
        </div>
    )
}
