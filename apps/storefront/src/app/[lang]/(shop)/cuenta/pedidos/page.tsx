import Link from 'next/link'
import { Suspense } from 'react'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAuthCustomerOrders } from '@/lib/medusa/auth-medusa'
import { formatPrice } from '@/lib/i18n/currencies'
import { getConfig } from '@/lib/config'
import {
    Clock, CheckCircle2, XCircle, Truck, Loader2,
    Package, Eye, ChevronLeft, ChevronRight, ShieldX
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { icon: typeof Clock; colorClass: string; key: string }> = {
    pending: { icon: Clock, colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', key: 'order.pending' },
    processing: { icon: Loader2, colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', key: 'order.processing' },
    shipped: { icon: Truck, colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', key: 'order.shipped' },
    completed: { icon: CheckCircle2, colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', key: 'order.delivered' },
    delivered: { icon: CheckCircle2, colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', key: 'order.delivered' },
    canceled: { icon: XCircle, colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: 'order.cancelled' },
    cancelled: { icon: XCircle, colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: 'order.cancelled' },
    requires_action: { icon: Clock, colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', key: 'order.pending' },
}

function StatusBadge({ status, label }: { status: string; label: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.colorClass}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
        </span>
    )
}

// ─── Page size for pagination ─────────────────────────────────
const PAGE_SIZE = 10

// ─── Orders list (Suspense-wrapped) ───────────────────────────
async function OrdersList({
    lang,
    page,
}: {
    lang: string
    page: number
}) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const offset = (page - 1) * PAGE_SIZE
    const { orders, count } = await getAuthCustomerOrders({ limit: PAGE_SIZE, offset })
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

    if (orders.length === 0 && page === 1) {
        return (
            <div className="glass rounded-xl p-8 text-center">
                <Package className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                <p className="text-text-muted text-sm mb-1">{t('account.noOrders')}</p>
                <p className="text-text-muted text-xs">{t('account.noOrdersHint')}</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-3">
                {orders.map((order) => {
                    const date = new Date(order.created_at).toLocaleDateString(
                        lang === 'es' ? 'es-ES' : lang,
                        { day: 'numeric', month: 'short', year: 'numeric' }
                    )
                    const itemCount = order.items?.length ?? 0
                    const total = order.total
                        ? formatPrice(order.total, order.currency_code || 'eur', lang as Locale)
                        : '—'
                    const status = order.status || 'pending'
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending

                    return (
                        <Link
                            key={order.id}
                            href={`/${lang}/cuenta/pedidos/${order.id}`}
                            className="glass rounded-xl p-4 flex items-center justify-between hover:bg-surface-2 transition-all group"
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-text-primary">
                                    {t('order.number')}#{order.display_id ?? order.id.slice(-6)}
                                </p>
                                <p className="text-xs text-text-muted">{date}</p>
                                <StatusBadge status={status} label={t(cfg.key)} />
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-sm font-bold text-text-primary">{total}</p>
                                <p className="text-xs text-text-muted">
                                    {itemCount} {itemCount === 1 ? t('order.item') : t('order.items')}
                                </p>
                                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end">
                                    <Eye className="w-3 h-3" />
                                    {t('account.viewOrder')}
                                </span>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {page > 1 ? (
                        <Link
                            href={`/${lang}/cuenta/pedidos?page=${page - 1}`}
                            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg glass hover:bg-surface-2 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {t('pagination.previous') || 'Prev'}
                        </Link>
                    ) : (
                        <span className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg glass opacity-40 cursor-not-allowed">
                            <ChevronLeft className="w-4 h-4" />
                            {t('pagination.previous') || 'Prev'}
                        </span>
                    )}

                    <span className="text-sm text-text-muted px-3">
                        {page} / {totalPages}
                    </span>

                    {page < totalPages ? (
                        <Link
                            href={`/${lang}/cuenta/pedidos?page=${page + 1}`}
                            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg glass hover:bg-surface-2 transition-colors"
                        >
                            {t('pagination.next') || 'Next'}
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    ) : (
                        <span className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg glass opacity-40 cursor-not-allowed">
                            {t('pagination.next') || 'Next'}
                            <ChevronRight className="w-4 h-4" />
                        </span>
                    )}
                </div>
            )}
        </>
    )
}

// ─── Loading skeleton ─────────────────────────────────────────
function OrdersSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="glass rounded-xl p-4 flex items-center justify-between animate-pulse">
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-text-muted/10 rounded" />
                        <div className="h-3 w-32 bg-text-muted/10 rounded" />
                        <div className="h-5 w-20 bg-text-muted/10 rounded-full" />
                    </div>
                    <div className="text-right space-y-2">
                        <div className="h-4 w-16 bg-text-muted/10 rounded ml-auto" />
                        <div className="h-3 w-12 bg-text-muted/10 rounded ml-auto" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────
export default async function PedidosPage({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<{ page?: string }>
}) {
    const { lang } = await params
    const sp = await searchParams
    const page = Math.max(1, parseInt(sp.page || '1', 10))
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const { featureFlags } = await getConfig()

    if (!featureFlags.enable_order_tracking) {
        return (
            <div className="glass rounded-xl p-8 text-center">
                <ShieldX className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                <p className="text-text-muted text-sm">{t('common.featureDisabled') || 'This feature is not available on your current plan.'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold font-display text-text-primary">
                {t('account.orderHistory')}
            </h1>

            <Suspense fallback={<OrdersSkeleton />}>
                <OrdersList lang={lang} page={page} />
            </Suspense>
        </div>
    )
}
