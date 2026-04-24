/**
 * RecentOrdersTable — Recent orders table at bottom of dashboard
 *
 * Extracted from dashboard monolith. Shows 5 most recent orders with
 * customer name, status badge, total, and relative time.
 * Falls back to EmptyState when no orders exist.
 */

import Link from 'next/link'
import { Inbox } from 'lucide-react'
import {
    SotaBentoItem, SotaGlassCard, SectionHeader, EmptyState, PanelBadge,
    PanelTableLegacy as PanelTable, PanelThead, PanelTbody, PanelTr, PanelThCell as PanelTh, PanelTd,
} from '@/components/panel'
import { formatAmount } from '@/lib/currency-engine'
import type { DashboardContext } from '../_lib/dashboard-context'

interface RecentOrdersTableProps {
    ctx: DashboardContext
}

function relativeTime(dateStr: string) {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
}

export default function RecentOrdersTable({ ctx }: RecentOrdersTableProps) {
    const { lang, t, recentOrders, storeConfig } = ctx

    return (
        <SotaBentoItem colSpan={{ base: 12 }}>
            <SotaGlassCard className="p-0 overflow-hidden">
                <div className="p-6 border-b border-sf-3/30">
                    <SectionHeader
                        title={t('panel.dashboard.recentOrders')}
                        icon={<Inbox className="w-5 h-5 text-emerald-500" />}
                        action={
                            recentOrders.length > 0 ? (
                                <Link
                                    href={`/${lang}/panel/pedidos`}
                                    className="text-sm text-brand hover:text-brand-600 font-semibold transition-colors flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-full"
                                >
                                    {t('panel.dashboard.viewAll') || 'View all'} →
                                </Link>
                            ) : undefined
                        }
                    />
                </div>
                {recentOrders.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={<Inbox className="w-8 h-8 opacity-50" />}
                            title={t('panel.dashboard.noOrders') || 'No orders yet'}
                            description={t('panel.dashboard.noOrdersDesc') || 'When customers place orders, they will appear here. Share your store to start receiving orders!'}
                            actionLabel={t('panel.dashboard.shareStore') || 'Share your store'}
                            actionHref={`/${lang}/panel/tienda`}
                        />
                    </div>
                ) : (
                    <PanelTable ariaLabel="Recent orders">
                        <PanelThead>
                            <PanelTr>
                                <PanelTh>{t('panel.dashboard.orderId')}</PanelTh>
                                <PanelTh>{t('panel.dashboard.customer')}</PanelTh>
                                <PanelTh className="hidden sm:table-cell">{t('panel.dashboard.status')}</PanelTh>
                                <PanelTh align="right">{t('panel.dashboard.total')}</PanelTh>
                            </PanelTr>
                        </PanelThead>
                        <PanelTbody>
                            {recentOrders.map((order) => (
                                <PanelTr key={order.id} className="cursor-pointer group hover:bg-sf-0/50 transition-colors">
                                    <PanelTd>
                                        <Link href={`/${lang}/panel/pedidos?search=${order.display_id}`} className="block">
                                            <span className="font-semibold text-tx">
                                                #{order.display_id}
                                            </span>
                                            {order.created_at && (
                                                <span className="text-xs text-tx-muted ml-2 font-mono">
                                                    {relativeTime(order.created_at)}
                                                </span>
                                            )}
                                        </Link>
                                    </PanelTd>
                                    <PanelTd className="text-tx-sec font-medium">
                                        {order.customer
                                            ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() || order.customer.email
                                            : '—'}
                                    </PanelTd>
                                    <PanelTd className="hidden sm:table-cell">
                                        <PanelBadge
                                            variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'canceled' ? 'error' : 'info'}
                                            size="sm"
                                            dot
                                        >
                                            {t(`order.${order.status}`) || order.status}
                                        </PanelBadge>
                                    </PanelTd>
                                    <PanelTd align="right" className="font-bold text-tx text-lg tracking-tight">
                                        {formatAmount(order.total, order.currency_code ?? storeConfig.default_currency, lang)}
                                    </PanelTd>
                                </PanelTr>
                            ))}
                        </PanelTbody>
                    </PanelTable>
                )}
            </SotaGlassCard>
        </SotaBentoItem>
    )
}
