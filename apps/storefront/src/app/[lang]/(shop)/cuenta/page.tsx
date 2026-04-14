import Link from 'next/link'

import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Mi cuenta', robots: { index: false } }

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAuthCustomerOrders } from '@/lib/medusa/auth-medusa'
import { formatPrice } from '@/lib/i18n/currencies'
import { getConfig } from '@/lib/config'
import { ShoppingBag, ArrowRight, Package, Clock, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ─── Status badge helper ─────────────────────────────────────
function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
    const styles: Record<string, string> = {
        pending: 'bg-amber-500/15 text-amber-600',
        completed: 'bg-green-500/15 text-green-600',
        canceled: 'bg-red-500/15 text-red-500',
        archived: 'bg-gray-500/15 text-gray-500',
        requires_action: 'bg-amber-500/15 text-amber-600',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.pending}`}>
            {t(`order.status.${status}`) || status}
        </span>
    )
}

// ─── Dashboard stats (Suspense-wrapped) ──────────────────────
async function DashboardStats({ lang }: { lang: string }) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const { orders, count } = await getAuthCustomerOrders({ limit: 100 })

    const totalOrders = count
    const pendingOrders = orders.filter(o =>
        o.status === 'pending' || o.status === 'requires_action'
    ).length
    const lastOrder = orders.length > 0
        ? new Date(orders[0].created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : lang, {
            day: 'numeric', month: 'short', year: 'numeric'
        })
        : '—'

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-xl p-5 text-center">
                <p className="text-2xl font-bold text-brand">{totalOrders}</p>
                <p className="text-xs text-tx-muted mt-1">{t('account.totalOrders')}</p>
            </div>
            <div className="glass rounded-xl p-5 text-center">
                <p className="text-2xl font-bold text-amber-500">{pendingOrders}</p>
                <p className="text-xs text-tx-muted mt-1">{t('account.pendingOrders')}</p>
            </div>
            <div className="glass rounded-xl p-5 text-center">
                <p className="text-2xl font-bold text-tx">{lastOrder}</p>
                <p className="text-xs text-tx-muted mt-1">{t('account.lastOrder')}</p>
            </div>
        </div>
    )
}

// ─── Stats skeleton (shown during Suspense) ──────────────────
function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass rounded-xl p-5 text-center animate-pulse">
                    <div className="h-8 w-12 bg-text-muted/10 rounded mx-auto mb-2" />
                    <div className="h-3 w-20 bg-text-muted/10 rounded mx-auto" />
                </div>
            ))}
        </div>
    )
}

// ─── Recent orders (Suspense-wrapped) ────────────────────────
async function RecentOrders({ lang }: { lang: string }) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const { config } = await getConfig()

    const { orders } = await getAuthCustomerOrders({ limit: 3 })

    if (orders.length === 0) {
        return (
            <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-tx mb-4">
                    {t('account.recentOrders')}
                </h2>
                <div className="text-center py-8">
                    <Package className="w-12 h-12 text-tx-faint mx-auto mb-3" />
                    <p className="text-tx-muted text-sm mb-4">{t('account.noOrders')}</p>
                    <Link href={`/${lang}/productos`} className="btn btn-primary text-sm">
                        <ShoppingBag className="w-4 h-4" />
                        {t('account.explore')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-tx mb-4">
                {t('account.recentOrders')}
            </h2>
            <div className="space-y-3">
                {orders.map(order => {
                    const date = new Date(order.created_at).toLocaleDateString(
                        lang === 'es' ? 'es-ES' : lang,
                        { day: 'numeric', month: 'short', year: 'numeric' }
                    )
                    const itemCount = order.items?.length ?? 0
                    const total = order.total
                        ? formatPrice(order.total, order.currency_code || config.default_currency, lang as Locale)
                        : '—'

                    return (
                        <Link
                            key={order.id}
                            href={`/${lang}/cuenta/pedidos/${order.id}`}
                            className="flex items-center justify-between p-4 rounded-lg bg-surface/50 hover:bg-surface/80 transition-colors border border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center">
                                    {order.status === 'completed' ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Clock className="w-5 h-5 text-amber-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-tx">
                                        #{order.display_id ?? order.id.slice(-6)}
                                    </p>
                                    <p className="text-xs text-tx-muted">
                                        {date} · {itemCount} {itemCount === 1 ? t('order.item') : t('order.items')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={order.status} t={t} />
                                <span className="text-sm font-semibold text-tx">{total}</span>
                                <ArrowRight className="w-4 h-4 text-tx-muted" />
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Recent orders skeleton ──────────────────────────────────
function RecentOrdersSkeleton() {
    return (
        <div className="glass rounded-xl p-6">
            <div className="h-6 w-40 bg-text-muted/10 rounded mb-4 animate-pulse" />
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-surface/50 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-text-muted/10" />
                            <div>
                                <div className="h-4 w-16 bg-text-muted/10 rounded mb-1" />
                                <div className="h-3 w-24 bg-text-muted/10 rounded" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-16 bg-text-muted/10 rounded-full" />
                            <div className="h-4 w-12 bg-text-muted/10 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main page ───────────────────────────────────────────────
export default async function CuentaPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('account.user')

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="glass rounded-xl p-6">
                <h1 className="text-2xl font-bold font-display text-tx mb-1">
                    {t('account.welcomeMessage', { name: displayName })}
                </h1>
                <p className="text-tx-muted text-sm">
                    {t('account.welcomeHint')}
                </p>
            </div>

            {/* Stats — streams independently */}
            <Suspense fallback={<StatsSkeleton />}>
                <DashboardStats lang={lang} />
            </Suspense>

            {/* Recent orders — streams independently */}
            <Suspense fallback={<RecentOrdersSkeleton />}>
                <RecentOrders lang={lang} />
            </Suspense>

            {/* View all orders link */}
            <Link
                href={`/${lang}/cuenta/pedidos`}
                className="flex items-center gap-2 text-sm text-brand hover:underline"
            >
                {t('account.viewAllOrders')}
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    )
}
