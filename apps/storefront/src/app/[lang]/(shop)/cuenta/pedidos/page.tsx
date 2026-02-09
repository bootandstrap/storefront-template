import Link from 'next/link'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { Clock, CheckCircle2, XCircle, Truck, Loader2, Package, Eye } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Status → Icon + Color + Label (translation key)
const STATUS_CONFIG: Record<string, { icon: typeof Clock; colorClass: string; key: string }> = {
    pending: { icon: Clock, colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', key: 'order.pending' },
    processing: { icon: Loader2, colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', key: 'order.processing' },
    shipped: { icon: Truck, colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', key: 'order.shipped' },
    delivered: { icon: CheckCircle2, colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', key: 'order.delivered' },
    cancelled: { icon: XCircle, colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: 'order.cancelled' },
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

export default async function PedidosPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Placeholder orders — will be replaced with Medusa API call
    const orders: { id: string; number: string; date: string; status: string; total: string; items: number }[] = []

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold font-display text-text-primary">
                {t('account.orderHistory')}
            </h1>

            {orders.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                    <Package className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted text-sm mb-1">{t('account.noOrders')}</p>
                    <p className="text-text-muted text-xs">{t('account.noOrdersHint')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            href={`/${lang}/cuenta/pedidos/${order.id}`}
                            className="glass rounded-xl p-4 flex items-center justify-between hover:bg-surface-2 transition-all group"
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-text-primary">
                                    {t('order.number')}{order.number}
                                </p>
                                <p className="text-xs text-text-muted">{order.date}</p>
                                <StatusBadge status={order.status} label={t(STATUS_CONFIG[order.status]?.key || 'order.pending')} />
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-sm font-bold text-text-primary">{order.total}</p>
                                <p className="text-xs text-text-muted">
                                    {order.items} {t('order.items').toLowerCase()}
                                </p>
                                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end">
                                    <Eye className="w-3 h-3" />
                                    {t('account.viewOrder')}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
