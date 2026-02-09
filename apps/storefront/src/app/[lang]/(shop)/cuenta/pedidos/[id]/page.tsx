import Link from 'next/link'
import { ArrowLeft, Package, Clock, CheckCircle, CreditCard, MapPin, RefreshCw } from 'lucide-react'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
    const { id, lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: `${t('order.number')}${id}` }
}

// ---------------------------------------------------------------------------
// Timeline component
// ---------------------------------------------------------------------------

interface TimelineEvent {
    label: string
    date?: string
    active: boolean
    completed: boolean
}

function OrderTimeline({ events, locale }: { events: TimelineEvent[]; locale: string }) {
    return (
        <div className="space-y-0">
            {events.map((event, i) => (
                <div key={i} className="flex gap-3">
                    {/* Dot + connector */}
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-3 h-3 rounded-full border-2 mt-1 ${event.completed
                                ? 'bg-green-500 border-green-500'
                                : event.active
                                    ? 'bg-primary border-primary animate-pulse'
                                    : 'bg-surface-1 border-surface-3'
                                }`}
                        />
                        {i < events.length - 1 && (
                            <div
                                className={`w-0.5 h-8 ${event.completed ? 'bg-green-500/30' : 'bg-surface-3'
                                    }`}
                            />
                        )}
                    </div>
                    {/* Label */}
                    <div className="pb-4">
                        <p className={`text-sm font-medium ${event.completed || event.active
                            ? 'text-text-primary'
                            : 'text-text-muted'
                            }`}>
                            {event.label}
                        </p>
                        {event.date && (
                            <p className="text-xs text-text-muted mt-0.5">
                                {new Intl.DateTimeFormat(locale, {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }).format(new Date(event.date))}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ lang: string; id: string }>
}) {
    const { id, lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // TODO: Fetch order from Medusa Store API
    // const order = await medusaFetch(`/store/orders/${id}`)

    // Placeholder order for structure
    const order = null as null | {
        id: string
        display_id: number
        status: string
        created_at: string
        total: number
        subtotal: number
        shipping_total: number
        tax_total: number
        currency_code: string
        payment_method: string
        shipping_address: {
            address_1: string
            city: string
            province: string
        }
        items: Array<{
            id: string
            title: string
            thumbnail: string | null
            quantity: number
            unit_price: number
            total: number
        }>
    }

    if (!order) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/${lang}/cuenta/pedidos`}
                        className="p-2 rounded-full hover:bg-surface-1 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('order.detail')}
                    </h1>
                </div>

                <div className="glass rounded-2xl p-12 text-center">
                    <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-text-primary mb-2">
                        {t('order.notFound')}
                    </h2>
                    <p className="text-sm text-text-muted mb-6">
                        {t('order.notFoundHint')}
                    </p>
                    <Link href={`/${lang}/cuenta/pedidos`} className="btn btn-primary">
                        {t('account.viewAllOrders')}
                    </Link>
                </div>
            </div>
        )
    }

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat(lang, {
            style: 'currency',
            currency: (order.currency_code || 'USD').toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    // Build timeline based on status
    const timelineEvents: TimelineEvent[] = [
        { label: t('order.received'), date: order.created_at, completed: true, active: false },
        { label: t('order.paymentConfirmed'), completed: order.status !== 'pending', active: order.status === 'pending' },
        { label: t('order.preparing'), completed: false, active: order.status === 'processing' },
        { label: t('order.shipped'), completed: false, active: order.status === 'shipped' },
        { label: t('order.delivered'), completed: order.status === 'completed', active: false },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/${lang}/cuenta/pedidos`}
                    className="p-2 rounded-full hover:bg-surface-1 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('order.number')}{order.display_id}
                    </h1>
                    <p className="text-xs text-text-muted">
                        {new Intl.DateTimeFormat(lang, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        }).format(new Date(order.created_at))}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Timeline + Items */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Timeline */}
                    <div className="glass rounded-2xl p-5">
                        <h2 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            {t('order.statusLabel')}
                        </h2>
                        <OrderTimeline events={timelineEvents} locale={lang} />
                    </div>

                    {/* Items */}
                    <div className="glass rounded-2xl p-5">
                        <h2 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            {t('nav.products')} ({order.items.length})
                        </h2>
                        <div className="space-y-3">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-surface-1 overflow-hidden shrink-0">
                                        {item.thumbnail && (
                                            <img
                                                src={item.thumbnail}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {t('order.quantity', { qty: String(item.quantity), price: formatMoney(item.unit_price) })}
                                        </p>
                                    </div>
                                    <p className="text-sm font-bold text-text-primary">
                                        {formatMoney(item.total)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Payment + Address + Reorder */}
                <div className="space-y-6">
                    {/* Payment info */}
                    <div className="glass rounded-2xl p-5">
                        <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-primary" />
                            {t('order.payment')}
                        </h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-text-muted">{t('cart.subtotal')}</span>
                                <span>{formatMoney(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">{t('cart.shipping')}</span>
                                <span>{formatMoney(order.shipping_total)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-surface-3 font-bold">
                                <span>{t('cart.total')}</span>
                                <span className="text-primary">{formatMoney(order.total)}</span>
                            </div>
                            <p className="text-xs text-text-muted pt-2">
                                {t('order.method', { method: order.payment_method })}
                            </p>
                        </div>
                    </div>

                    {/* Shipping address */}
                    <div className="glass rounded-2xl p-5">
                        <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            {t('order.address')}
                        </h2>
                        <p className="text-sm text-text-secondary">
                            {order.shipping_address.address_1}
                        </p>
                        <p className="text-sm text-text-muted">
                            {order.shipping_address.city}, {order.shipping_address.province}
                        </p>
                    </div>

                    {/* Reorder button */}
                    <button className="btn btn-primary w-full py-2.5 text-sm" type="button">
                        <RefreshCw className="w-4 h-4" />
                        {t('order.reorder')}
                    </button>
                </div>
            </div>
        </div>
    )
}
