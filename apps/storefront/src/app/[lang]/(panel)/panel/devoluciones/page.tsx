/**
 * Devoluciones (Returns) — Owner Panel Page (SOTA rewrite)
 *
 * SOTA upgrades:
 * - Raw h1/p header → PanelPageHeader with icon + badge
 * - `glass rounded-xl` → `glass rounded-2xl` consistent pattern
 * - Empty state → premium empty state with animation-ready structure
 * - Table styling → consistent glass table with better hover
 *
 * Server component — no framer-motion.
 * Feature-gated: requires enable_self_service_returns flag.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { toIntlLocale } from '@/lib/i18n/intl-locale'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import ReturnStatusBadge from '@/components/returns/ReturnStatusBadge'
import ReturnActions from '@/components/returns/ReturnActions'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import PanelBadge from '@/components/panel/PanelBadge'
import PanelTable, { PanelThead, PanelTbody, PanelTr, PanelTh, PanelTd } from '@/components/panel/PanelTable'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import { RotateCcw, PackageX } from 'lucide-react'
import { fetchReturns, approveReturnAction, rejectReturnAction } from './actions'

export const dynamic = 'force-dynamic'

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
            <PanelPageHeader
                title={t('panel.returns.title')}
                subtitle={t('panel.returns.subtitle')}
                icon={<RotateCcw className="w-5 h-5" />}
                badge={returns.length}
            />

            <SotaBentoGrid>
                <SotaBentoItem colSpan={12}>
            {returns.length === 0 ? (
                <SotaGlassCard glowColor="none" className="p-8">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <PackageX className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {t('panel.returns.noRequests')}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed">
                            {t('panel.returns.noRequestsHint') || 'When customers request returns, they will appear here for review.'}
                        </p>
                    </div>
                </SotaGlassCard>
            ) : (
                <SotaGlassCard glowColor="none">
                        <PanelTable ariaLabel="Returns">
                            <PanelThead>
                                <PanelTr>
                                    <PanelTh>{t('panel.returns.order')}</PanelTh>
                                    <PanelTh>{t('panel.returns.items')}</PanelTh>
                                    <PanelTh>{t('panel.returns.date')}</PanelTh>
                                    <PanelTh>{t('panel.returns.status')}</PanelTh>
                                    <PanelTh align="right">{t('panel.returns.actions')}</PanelTh>
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
                                                    items={(ret.items || []).map((i: any) => ({
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
        </div>
    )
}
