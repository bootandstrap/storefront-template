import Link from 'next/link'
import { Suspense } from 'react'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAuthOrder } from '@/lib/medusa/auth-medusa'
import { formatPrice } from '@/lib/i18n/currencies'
import { getConfig } from '@/lib/config'
import ReturnRequestForm from '@/components/returns/ReturnRequestForm'
import ReturnStatusBadge from '@/components/returns/ReturnStatusBadge'
import {
    ArrowLeft, Clock, CheckCircle2, Package,
    Truck, XCircle, MapPin, CreditCard, ShoppingBag,
    ArrowRight, RotateCcw
} from 'lucide-react'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

// ─── Status timeline steps ────────────────────────────────────
const TIMELINE_STEPS = [
    { status: 'pending', icon: Clock, key: 'order.pending' },
    { status: 'processing', icon: Package, key: 'order.processing' },
    { status: 'shipped', icon: Truck, key: 'order.shipped' },
    { status: 'completed', icon: CheckCircle2, key: 'order.delivered' },
]

function getTimelineIndex(status: string): number {
    if (status === 'canceled' || status === 'cancelled') return -1
    const idx = TIMELINE_STEPS.findIndex(s => s.status === status)
    if (status === 'completed' || status === 'delivered') return TIMELINE_STEPS.length - 1
    return idx >= 0 ? idx : 0
}

// ─── Order detail content ─────────────────────────────────────
async function OrderDetail({
    orderId,
    lang,
}: {
    orderId: string
    lang: string
}) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const order = await getAuthOrder(orderId)

    if (!order) {
        return (
            <div className="space-y-6">
                <Link
                    href={`/${lang}/cuenta/pedidos`}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('order.backToOrders')}
                </Link>
                <div className="glass rounded-xl p-8 text-center">
                    <Package className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted">{t('order.notFound')}</p>
                </div>
            </div>
        )
    }

    const isCanceled = order.status === 'canceled' || order.status === 'cancelled'
    const currentStep = getTimelineIndex(order.status)
    const date = new Date(order.created_at).toLocaleDateString(
        lang === 'es' ? 'es-ES' : lang,
        { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    )
    const currency = order.currency_code || 'eur'

    return (
        <div className="space-y-6">
            {/* Back link */}
            <Link
                href={`/${lang}/cuenta/pedidos`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('order.backToOrders')}
            </Link>

            {/* Header */}
            <div className="glass rounded-xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-xl font-bold font-display text-text-primary">
                            {t('order.number')}#{order.display_id ?? order.id.slice(-6)}
                        </h1>
                        <p className="text-sm text-text-muted mt-1">{date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isCanceled ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="w-3.5 h-3.5" />
                                {t('order.cancelled')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                                {t(`order.${order.status}`) || order.status}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline */}
            {!isCanceled && (
                <div className="glass rounded-xl p-6">
                    <h2 className="text-sm font-semibold text-text-primary mb-4">
                        {t('order.timeline')}
                    </h2>
                    <div className="flex items-center justify-between">
                        {TIMELINE_STEPS.map((step, i) => {
                            const Icon = step.icon
                            const isActive = i <= currentStep
                            const isCurrent = i === currentStep
                            return (
                                <div key={step.status} className="flex flex-col items-center flex-1">
                                    <div className="flex items-center w-full">
                                        {i > 0 && (
                                            <div className={`h-0.5 flex-1 ${i <= currentStep ? 'bg-primary' : 'bg-text-muted/20'}`} />
                                        )}
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isCurrent
                                                ? 'bg-primary text-white ring-4 ring-primary/20'
                                                : isActive
                                                    ? 'bg-primary/20 text-primary'
                                                    : 'bg-text-muted/10 text-text-muted/40'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        {i < TIMELINE_STEPS.length - 1 && (
                                            <div className={`h-0.5 flex-1 ${i < currentStep ? 'bg-primary' : 'bg-text-muted/20'}`} />
                                        )}
                                    </div>
                                    <span className={`text-[10px] mt-2 text-center ${isActive ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                                        {t(step.key)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Order items */}
            <div className="glass rounded-xl p-6">
                <h2 className="text-sm font-semibold text-text-primary mb-4">
                    {t('order.items')} ({order.items?.length ?? 0})
                </h2>
                <div className="divide-y divide-white/5">
                    {(order.items ?? []).map((item) => {
                        const price = item.unit_price
                            ? formatPrice(item.unit_price, currency, lang as Locale)
                            : '—'
                        const lineTotal = item.unit_price
                            ? formatPrice(item.unit_price * item.quantity, currency, lang as Locale)
                            : '—'

                        return (
                            <div key={item.id} className="flex items-center gap-4 py-3">
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-lg bg-surface/50 flex items-center justify-center shrink-0 overflow-hidden relative">
                                    {item.thumbnail ? (
                                        <Image
                                            src={item.thumbnail}
                                            alt={item.title}
                                            fill
                                            className="object-cover"
                                            sizes="56px"
                                        />
                                    ) : (
                                        <Package className="w-6 h-6 text-text-muted/40" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">
                                        {item.title}
                                    </p>
                                    {item.variant_title && item.variant_title !== 'Default' && (
                                        <p className="text-xs text-text-muted">{item.variant_title}</p>
                                    )}
                                    <p className="text-xs text-text-muted">
                                        {price} × {item.quantity}
                                    </p>
                                </div>
                                <p className="text-sm font-semibold text-text-primary">
                                    {lineTotal}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* Totals */}
                <div className="border-t border-white/5 mt-4 pt-4 space-y-2">
                    {order.subtotal != null && (
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">{t('order.subtotal')}</span>
                            <span className="text-text-primary">{formatPrice(order.subtotal, currency, lang as Locale)}</span>
                        </div>
                    )}
                    {order.shipping_total != null && order.shipping_total > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">{t('order.shipping')}</span>
                            <span className="text-text-primary">{formatPrice(order.shipping_total, currency, lang as Locale)}</span>
                        </div>
                    )}
                    {order.tax_total != null && order.tax_total > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">{t('order.tax')}</span>
                            <span className="text-text-primary">{formatPrice(order.tax_total, currency, lang as Locale)}</span>
                        </div>
                    )}
                    {order.discount_total != null && order.discount_total > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-text-muted">{t('order.discount')}</span>
                            <span className="text-green-500">-{formatPrice(order.discount_total, currency, lang as Locale)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-white/5">
                        <span className="text-text-primary">{t('order.total')}</span>
                        <span className="text-primary">{formatPrice(order.total || 0, currency, lang as Locale)}</span>
                    </div>
                </div>
            </div>

            {/* Shipping address */}
            {order.shipping_address && (
                <div className="glass rounded-xl p-6">
                    <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {t('order.shippingAddress')}
                    </h2>
                    <div className="text-sm text-text-muted space-y-0.5">
                        <p className="text-text-primary font-medium">
                            {order.shipping_address.first_name} {order.shipping_address.last_name}
                        </p>
                        <p>{order.shipping_address.address_1}</p>
                        {order.shipping_address.address_2 && <p>{order.shipping_address.address_2}</p>}
                        <p>
                            {order.shipping_address.postal_code} {order.shipping_address.city}
                            {order.shipping_address.province && `, ${order.shipping_address.province}`}
                        </p>
                        <p>{order.shipping_address.country_code?.toUpperCase()}</p>
                        {order.shipping_address.phone && (
                            <p className="mt-1">{t('address.phone')}: {order.shipping_address.phone}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Payment info */}
            {order.payments && order.payments.length > 0 && (
                <div className="glass rounded-xl p-6">
                    <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        {t('order.paymentInfo')}
                    </h2>
                    <div className="text-sm text-text-muted">
                        {order.payments.map((payment, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="capitalize">{payment.provider_id?.replace(/_/g, ' ') || t('order.payment')}</span>
                                {payment.amount && (
                                    <span className="text-text-primary font-medium">
                                        {formatPrice(payment.amount, payment.currency_code || currency, lang as Locale)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Self-service return request */}
            {await (async () => {
                const { featureFlags } = await getConfig()
                if (!featureFlags.enable_self_service_returns) return null

                const canReturn = order.status === 'completed' || order.status === 'delivered'
                if (!canReturn) return null

                // Check for existing return via Medusa Store API
                const { getStoreReturns } = await import('@/lib/medusa/client')
                let existingReturns: Awaited<ReturnType<typeof getStoreReturns>> = []
                try {
                    existingReturns = await getStoreReturns(order.id)
                } catch {
                    // Medusa returns API may not be available
                }

                if (existingReturns.length > 0) {
                    const ret = existingReturns[0]
                    const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'completed'> = {
                        requested: 'pending',
                        received: 'completed',
                        canceled: 'rejected',
                    }
                    return (
                        <div className="glass rounded-xl p-6">
                            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-primary" />
                                {t('returns.existingRequest')}
                            </h2>
                            <ReturnStatusBadge
                                status={statusMap[ret.status] || 'pending'}
                                labels={{
                                    pending: t('returns.status.pending'),
                                    approved: t('returns.status.approved'),
                                    rejected: t('returns.status.rejected'),
                                    completed: t('returns.status.completed'),
                                }}
                            />
                        </div>
                    )
                }

                // Show return form
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const orderItems = (order.items || []).map((item: any) => ({
                    id: String(item.id || ''),
                    title: String(item.title || item.product_title || ''),
                    quantity: Number(item.quantity || 1),
                    variant_title: item.variant_title ? String(item.variant_title) : undefined,
                    thumbnail: item.thumbnail ? String(item.thumbnail) : undefined,
                }))

                return (
                    <ReturnRequestForm
                        orderId={order.id}
                        items={orderItems}
                        lang={lang}
                        dict={{
                            title: t('returns.title'),
                            reason: t('returns.reason'),
                            reasons: {
                                defective: t('returns.reasons.defective'),
                                wrong_item: t('returns.reasons.wrong_item'),
                                changed_mind: t('returns.reasons.changed_mind'),
                                other: t('returns.reasons.other'),
                            },
                            description: t('returns.description'),
                            descriptionPlaceholder: t('returns.descriptionPlaceholder'),
                            selectItems: t('returns.selectItems'),
                            submit: t('returns.submit'),
                            submitting: t('returns.submitting'),
                            success: t('returns.success'),
                            error: t('returns.error'),
                            duplicate: t('returns.duplicate'),
                        }}
                    />
                )
            })()}

            {/* View products link */}
            <Link
                href={`/${lang}/productos`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium btn btn-primary"
            >
                <ShoppingBag className="w-4 h-4" />
                {t('order.reorder')}
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    )
}

// ─── Loading skeleton ─────────────────────────────────────────
function OrderDetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-4 w-32 bg-text-muted/10 rounded animate-pulse" />
            <div className="glass rounded-xl p-6 animate-pulse">
                <div className="h-6 w-48 bg-text-muted/10 rounded mb-2" />
                <div className="h-4 w-32 bg-text-muted/10 rounded" />
            </div>
            <div className="glass rounded-xl p-6 animate-pulse">
                <div className="h-4 w-24 bg-text-muted/10 rounded mb-4" />
                <div className="flex items-center justify-between">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center flex-1">
                            <div className="w-8 h-8 rounded-full bg-text-muted/10" />
                            <div className="h-3 w-16 bg-text-muted/10 rounded mt-2" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="glass rounded-xl p-6 animate-pulse">
                <div className="h-4 w-24 bg-text-muted/10 rounded mb-4" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 py-3">
                        <div className="w-14 h-14 rounded-lg bg-text-muted/10" />
                        <div className="flex-1">
                            <div className="h-4 w-32 bg-text-muted/10 rounded mb-1" />
                            <div className="h-3 w-20 bg-text-muted/10 rounded" />
                        </div>
                        <div className="h-4 w-16 bg-text-muted/10 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────
export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ lang: string; id: string }>
}) {
    const { lang, id } = await params

    return (
        <Suspense fallback={<OrderDetailSkeleton />}>
            <OrderDetail orderId={id} lang={lang} />
        </Suspense>
    )
}
