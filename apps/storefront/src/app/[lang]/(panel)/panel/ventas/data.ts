/**
 * Ventas — Server-side data fetchers
 *
 * RSC Slot data layer for the Sales hub.
 * KPI metrics (revenue, counts) come from the unified panel-data-service.
 * Paginated order list is fetched independently for table display.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminOrders, getAdminCustomers } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { parsePanelListQuery } from '@/lib/panel-list-query'
import { getPanelMetrics } from '@/lib/panel-data-service'
import { formatAmount } from '@/lib/currency-engine'
import { checkLimit } from '@/lib/limits'
import { fetchReturns } from '../devoluciones/actions'
import { getReviews } from '../resenas/actions'

// ── Orders Data ───────────────────────────────────────────────────────────

export async function fetchOrdersData(
    tenantId: string,
    lang: string,
    rawSearchParams: Record<string, string | string[] | undefined>,
) {
    const scope = await getTenantMedusaScope(tenantId)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Shared metrics — same data as dashboard (React cache() dedup)
    const shared = await getPanelMetrics(tenantId, lang)

    const query = parsePanelListQuery(rawSearchParams, {
        defaultLimit: 20,
        allowedStatuses: ['all', 'pending', 'completed', 'canceled'],
    })

    // Paginated order list for the table (independent fetch)
    const { orders, count } = await getAdminOrders({
        limit: query.limit,
        offset: query.offset,
        q: query.q,
        status: query.status,
    }, scope)

    const pendingCount = orders.filter(o => o.status === 'pending').length
    const completedCount = orders.filter(o => o.status === 'completed').length

    // Revenue metrics from shared data — guaranteed consistent with dashboard
    const { revenue } = shared
    const formattedRevenue = revenue.formattedRevenue
    const secondaryRevenues = revenue.secondaryRevenues
        .map(r => `+${formatAmount(r.amount, r.code, lang)}`)
        .join(' ')

    // POS/Online counts from shared month orders
    const posOrderCount = shared.monthOrders.filter(o =>
        (o.metadata as Record<string, unknown> | null)?.source === 'pos'
    ).length
    const onlineOrderCount = shared.monthOrders.length - posOrderCount
    const rawChannel = rawSearchParams?.channel as string | undefined
    const initialChannel = (rawChannel === 'pos' || rawChannel === 'online') ? rawChannel : 'all'

    const labels = {
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
    }

    return {
        orders,
        totalCount: count,
        currentPage: query.page,
        pageSize: query.limit,
        initialSearch: query.q ?? '',
        initialStatus: (query.status as 'all' | 'pending' | 'completed' | 'canceled' | undefined) ?? 'all',
        initialChannel: initialChannel as 'all' | 'pos' | 'online',
        metrics: { pendingCount, completedCount, formattedRevenue, secondaryRevenues, posOrderCount, onlineOrderCount },
        lang,
        labels,
    }
}

// ── Customers Data ────────────────────────────────────────────────────────

export async function fetchCustomersData(
    tenantId: string,
    lang: string,
    rawSearchParams: Record<string, string | string[] | undefined>,
) {
    const scope = await getTenantMedusaScope(tenantId)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const query = parsePanelListQuery(rawSearchParams, { defaultLimit: 20 })

    const { customers, count } = await getAdminCustomers({
        limit: query.limit,
        offset: query.offset,
        q: query.q,
    }, scope)

    const labels = {
        title: t('panel.customers.title'),
        subtitle: t('panel.customers.subtitle'),
        searchPlaceholder: t('panel.customers.searchPlaceholder'),
        noCustomers: t('panel.customers.noCustomers'),
        noCustomersHint: t('panel.customers.noCustomersHint'),
        customer: t('panel.customers.customer'),
        email: t('panel.customers.email'),
        orders: t('panel.customers.orders'),
        totalSpent: t('panel.customers.totalSpent'),
        joinedDate: t('panel.customers.joinedDate'),
        total: t('panel.orders.total'),
        previous: t('pagination.previous'),
        next: t('pagination.next'),
        noOrders: t('panel.customers.noOrders'),
    }

    return {
        customers,
        totalCount: count,
        currentPage: query.page,
        pageSize: query.limit,
        initialSearch: query.q ?? '',
        lang,
        labels,
    }
}

// ── Returns Data ──────────────────────────────────────────────────────────

export async function fetchReturnsData(lang: string) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const { returns } = await fetchReturns()

    return {
        returns: returns ?? [],
        labels: {
            title: t('panel.returns.title'),
            subtitle: t('panel.returns.subtitle'),
            noRequests: t('panel.returns.noRequests'),
            customer: t('panel.returns.customer'),
            order: t('panel.returns.order'),
            reason: t('panel.returns.reason'),
            date: t('panel.returns.date'),
            status: t('panel.returns.status'),
            items: t('panel.returns.items'),
            actions: t('panel.returns.actions'),
        },
    }
}

// ── Reviews Data ──────────────────────────────────────────────────────────

export async function fetchReviewsData(lang: string) {
    const dictionary = await getDictionary(lang as Locale)
    const { reviews, stats } = await getReviews()

    return {
        reviews: reviews ?? [],
        stats: stats ?? { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0 },
        dictionary,
    }
}

// ── Promotions Data ───────────────────────────────────────────────────────

export async function fetchPromotionsData(tenantId: string, lang: string) {
    const scope = await getTenantMedusaScope(tenantId)
    const shared = await getPanelMetrics(tenantId, lang)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Import dynamically to avoid circular deps — promotions module is standalone
    const { getPromotions } = await import('@/lib/medusa/admin-promotions')
    const { promotions, count } = await getPromotions({ limit: 100 }, scope)

    // Governance: active promotions limit
    const activeCount = promotions.filter(p => !p.is_disabled).length
    const promotionLimitResult = checkLimit(shared.planLimits, 'max_promotions_active', activeCount)

    return {
        promotions,
        totalCount: count,
        promotionLimitResult,
        lang,
        labels: {
            title: t('panel.promotions.title') || 'Promotions',
            subtitle: t('panel.promotions.subtitle') || 'Manage discounts and coupons',
            create: t('panel.promotions.create') || 'Create Coupon',
            code: t('panel.promotions.code') || 'Code',
            type: t('panel.promotions.type') || 'Type',
            value: t('panel.promotions.value') || 'Value',
            usageLimit: t('panel.promotions.usageLimit') || 'Usage Limit',
            usageCount: t('panel.promotions.usageCount') || 'uses',
            startsAt: t('panel.promotions.startsAt') || 'Starts at',
            endsAt: t('panel.promotions.endsAt') || 'Ends at',
            noPromotions: t('panel.promotions.noPromotions') || 'No promotions yet',
            noPromotionsDesc: t('panel.promotions.noPromotionsDesc') || 'Create your first coupon to attract customers',
            percentage: t('panel.promotions.percentage') || 'Percentage',
            fixed: t('panel.promotions.fixed') || 'Fixed Amount',
            freeShipping: t('panel.promotions.freeShipping') || 'Free Shipping',
            active: t('panel.promotions.active') || 'Active',
            disabled: t('panel.promotions.disabled') || 'Disabled',
            save: t('panel.promotions.save') || 'Save',
            cancel: t('panel.promotions.cancel') || 'Cancel',
            delete: t('panel.promotions.delete') || 'Delete',
            confirmDelete: t('panel.promotions.confirmDelete') || 'Are you sure you want to delete this promotion?',
            unlimited: t('panel.promotions.unlimited') || 'Unlimited',
            codeCopied: t('panel.promotions.codeCopied') || 'Code copied',
            creating: t('panel.promotions.creating') || 'Creating...',
            saving: t('panel.promotions.saving') || 'Saving...',
        },
    }
}
