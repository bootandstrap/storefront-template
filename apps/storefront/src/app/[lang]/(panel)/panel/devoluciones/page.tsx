import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import FeatureGate from '@/components/ui/FeatureGate'
import { getAdminReturns, type AdminReturn } from '@/lib/medusa/admin'
import ReturnStatusBadge from '@/components/returns/ReturnStatusBadge'
import { RotateCcw, PackageX } from 'lucide-react'

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
    const { featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_self_service_returns) {
        return <FeatureGate flag="enable_self_service_returns" lang={lang} />
    }

    let returns: AdminReturn[] = []
    try {
        const result = await getAdminReturns({ limit: 50 })
        returns = result.returns
    } catch {
        // Medusa may not have returns module — show empty state
    }

    const statusLabels = {
        pending: t('returns.status.pending'),
        approved: t('returns.status.approved'),
        rejected: t('returns.status.rejected'),
        completed: t('returns.status.completed'),
    }

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
                                                lang === 'es' ? 'es-ES' : lang,
                                                { day: 'numeric', month: 'short', year: 'numeric' }
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ReturnStatusBadge
                                                status={formatReturnStatus(ret.status)}
                                                labels={statusLabels}
                                            />
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
