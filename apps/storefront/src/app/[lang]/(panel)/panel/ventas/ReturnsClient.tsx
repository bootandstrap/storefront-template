'use client'

/**
 * ReturnsClient — Thin wrapper for the returns table.
 *
 * Originally the devoluciones page was a pure RSC. This wrapper enables
 * embedding in the Ventas hub tab system with client interactivity.
 */

import ReturnStatusBadge from '@/components/returns/ReturnStatusBadge'
import ReturnActions from '@/components/returns/ReturnActions'
import PanelBadge from '@/components/panel/PanelBadge'
import PanelTable, { PanelThead, PanelTbody, PanelTr, PanelTh, PanelTd } from '@/components/panel/PanelTable'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import { PackageX } from 'lucide-react'
import { approveReturnAction, rejectReturnAction } from '../devoluciones/actions'
import { toIntlLocale } from '@/lib/i18n/intl-locale'

function formatReturnStatus(status: string): 'pending' | 'approved' | 'rejected' | 'completed' {
    switch (status) {
        case 'requested':
        case 'pending':
            return 'pending'
        case 'approved':
            return 'approved'
        case 'canceled':
        case 'rejected':
            return 'rejected'
        case 'received':
        case 'completed':
            return 'completed'
        default:
            return 'pending'
    }
}

interface ReturnsClientProps {
    returns: Array<{
        id: string
        order_id: string
        status: string
        created_at: string
        items?: Array<{ id: string; quantity: number }>
        order?: { display_id?: string | number }
    }>
    labels: {
        title: string
        subtitle: string
        noRequests: string
        customer: string
        order: string
        reason: string
        date: string
        status: string
        items: string
        actions: string
    }
    lang: string
}

export default function ReturnsClient({ returns, labels, lang }: ReturnsClientProps) {
    const intlLocale = toIntlLocale(lang)

    // Inline status labels (these are stable enough to derive from the labels prop)
    const statusLabels = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        completed: 'Completed',
    }

    const actionLabels = {
        approve: 'Approve',
        reject: 'Reject',
        approving: 'Approving…',
        rejecting: 'Rejecting…',
        approved: 'Approved',
        rejected: 'Rejected',
        error: 'Error',
    }

    return (
        <SotaBentoGrid>
            <SotaBentoItem colSpan={12}>
                {returns.length === 0 ? (
                    <SotaGlassCard glowColor="none" className="p-8">
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <PackageX className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold font-display text-tx mb-2">
                                {labels.noRequests}
                            </h3>
                            <p className="text-sm text-tx-sec leading-relaxed">
                                When customers request returns, they will appear here for review.
                            </p>
                        </div>
                    </SotaGlassCard>
                ) : (
                    <SotaGlassCard glowColor="none">
                        <PanelTable ariaLabel="Returns">
                            <PanelThead>
                                <PanelTr>
                                    <PanelTh>{labels.order}</PanelTh>
                                    <PanelTh>{labels.items}</PanelTh>
                                    <PanelTh>{labels.date}</PanelTh>
                                    <PanelTh>{labels.status}</PanelTh>
                                    <PanelTh align="right">{labels.actions}</PanelTh>
                                </PanelTr>
                            </PanelThead>
                            <PanelTbody>
                                {returns.map((ret) => (
                                    <PanelTr key={ret.id}>
                                        <PanelTd className="font-medium">
                                            #{ret.order?.display_id || ret.order_id?.slice(-8) || '—'}
                                        </PanelTd>
                                        <PanelTd>
                                            <PanelBadge variant="neutral" size="sm">
                                                {ret.items?.length || 0} item{(ret.items?.length || 0) !== 1 ? 's' : ''}
                                            </PanelBadge>
                                        </PanelTd>
                                        <PanelTd className="text-tx-muted">
                                            {new Date(ret.created_at).toLocaleDateString(
                                                intlLocale,
                                                { day: 'numeric', month: 'short', year: 'numeric' }
                                            )}
                                        </PanelTd>
                                        <PanelTd>
                                            <ReturnStatusBadge
                                                status={formatReturnStatus(ret.status)}
                                                labels={statusLabels}
                                            />
                                        </PanelTd>
                                        <PanelTd align="right">
                                            {['requested', 'pending'].includes(ret.status) && (
                                                <ReturnActions
                                                    returnId={ret.id}
                                                    items={(ret.items || []).map((i) => ({
                                                        id: i.id,
                                                        quantity: i.quantity,
                                                    }))}
                                                    approveAction={approveReturnAction}
                                                    rejectAction={rejectReturnAction}
                                                    labels={actionLabels}
                                                />
                                            )}
                                        </PanelTd>
                                    </PanelTr>
                                ))}
                            </PanelTbody>
                        </PanelTable>
                    </SotaGlassCard>
                )}
            </SotaBentoItem>
        </SotaBentoGrid>
    )
}
