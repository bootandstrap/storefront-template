/**
 * TodaysFocus — Shopify-style actionable alerts panel
 *
 * Shows pending orders and low stock items as clickable cards.
 * Only renders when there are items requiring attention.
 */

import Link from 'next/link'
import { Inbox, AlertTriangle, Clock } from 'lucide-react'
import { SotaBentoItem, SotaGlassCard, SectionHeader } from '@/components/panel'
import type { DashboardContext } from '../_lib/dashboard-context'

interface TodaysFocusProps {
    ctx: DashboardContext
}

export default function TodaysFocus({ ctx }: TodaysFocusProps) {
    const { lang, t, pendingOrderCount, lowStockCount } = ctx

    if (pendingOrderCount === 0 && lowStockCount === 0) return null

    return (
        <SotaBentoItem colSpan={{ base: 12 }}>
            <SotaGlassCard>
                <SectionHeader
                    title={t('panel.dashboard.todaysFocus') || "Today's Focus"}
                    icon={<Clock className="w-5 h-5 text-amber-500" />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {pendingOrderCount > 0 && (
                        <Link
                            href={`/${lang}/panel/pedidos?status=pending`}
                            className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                <Inbox className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-900">
                                    {pendingOrderCount} {t('panel.dashboard.pendingOrders') || 'pending orders'}
                                </p>
                                <p className="text-xs text-amber-600 mt-0.5">{t('panel.dashboard.requireAction') || 'Require your attention'}</p>
                            </div>
                            <span className="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    )}
                    {lowStockCount > 0 && (
                        <Link
                            href={`/${lang}/panel/inventario`}
                            className="flex items-center gap-4 p-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-red-900">
                                    {lowStockCount} {t('panel.dashboard.lowStockItems') || 'low stock items'}
                                </p>
                                <p className="text-xs text-red-600 mt-0.5">{t('panel.dashboard.restockSoon') || 'Consider restocking soon'}</p>
                            </div>
                            <span className="text-red-400 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    )}
                </div>
            </SotaGlassCard>
        </SotaBentoItem>
    )
}
