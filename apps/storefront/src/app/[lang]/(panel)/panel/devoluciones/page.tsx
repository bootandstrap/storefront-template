/**
 * Devoluciones (Returns) — Owner Panel Page (Server Component)
 *
 * Feature-gated: requires enable_self_service_returns flag.
 * Loads returns from Medusa Admin API with tenant scoping.
 * Server actions extracted to actions.ts for tenant isolation.
 *
 * Zone: 🟡 EXTEND — panel page, uses locked auth/config + Medusa admin APIs
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { toIntlLocale } from '@/lib/i18n/intl-locale'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import ReturnStatusBadge from '@/components/returns/ReturnStatusBadge'
import ReturnActions from '@/components/returns/ReturnActions'
import { RotateCcw, PackageX } from 'lucide-react'
import { fetchReturns, approveReturnAction, rejectReturnAction } from './actions'

export const dynamic = 'force-dynamic'

function formatReturnStatus(status: string): 'pending' | 'approved' | 'rejected' | 'completed' {
    switch (status) {
        case 'requested': return 'pending'
        case 'received': return 'completed'
        case 'canceled': return 'rejected'
        default: return 'pending'
    }
}

export default async function PanelReturnsPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_self_service_returns) {
        return <FeatureGate flag="enable_self_service_returns" lang={lang} />
    }

    // Fetch returns — tenant-scoped via actions.ts
    const { returns } = await fetchReturns()

    const statusLabels = {
        pending: t('returns.status.pending'),
        approved: t('returns.status.approved'),
        rejected: t('returns.status.rejected'),
        completed: t('returns.status.completed'),
    }

    const actionLabels = {
        approve: t('returns.action.approve'),
        reject: t('returns.action.reject'),
        approving: t('returns.action.approving'),
        rejecting: t('returns.action.rejecting'),
        approved: t('returns.action.approved'),
        rejected: t('returns.action.rejected'),
        error: t('returns.action.error'),
    }

    const intlLocale = toIntlLocale(lang)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                    <RotateCcw className="w-6 h-6 text-primary" />
                    {t('panel.returns.title')}
                </h1>
                <p className="text-sm text-text-muted mt-1">{t('panel.returns.subtitle')}</p>
            </div>

            {returns.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center">
                    <PackageX className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-text-muted">{t('panel.returns.noRequests')}</p>
                </div>
            ) : (
                <div className="glass rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-3">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        {t('panel.returns.order')}
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        {t('panel.returns.items')}
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        {t('panel.returns.date')}
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        {t('panel.returns.status')}
                                    </th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        {t('panel.returns.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-3">
                                {returns.map((ret) => (
                                    <tr key={ret.id} className="hover:bg-surface-1/50 transition-colors">
                                        <td className="px-4 py-3 text-text-primary font-medium">
                                            #{ret.order?.display_id || ret.order_id?.slice(-8) || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary">
                                            {ret.items?.length || 0} item{(ret.items?.length || 0) !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-4 py-3 text-text-muted">
                                            {new Date(ret.created_at).toLocaleDateString(
                                                intlLocale,
                                                { day: 'numeric', month: 'short', year: 'numeric' }
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ReturnStatusBadge
                                                status={formatReturnStatus(ret.status)}
                                                labels={statusLabels}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {ret.status === 'requested' && (
                                                <ReturnActions
                                                    returnId={ret.id}
                                                    items={(ret.items || []).map(i => ({
                                                        id: i.id,
                                                        quantity: i.quantity,
                                                    }))}
                                                    approveAction={approveReturnAction}
                                                    rejectAction={rejectReturnAction}
                                                    labels={actionLabels}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
