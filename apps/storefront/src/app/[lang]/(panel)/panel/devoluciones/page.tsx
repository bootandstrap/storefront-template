import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { shouldAllowPanelRoute, getPanelFallbackRoute } from '@/lib/panel-route-guards'
import ReturnStatusBadge from '@/components/returns/ReturnStatusBadge'
import { RotateCcw, PackageX } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PanelReturnsPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!shouldAllowPanelRoute('devoluciones', featureFlags)) {
        redirect(getPanelFallbackRoute(lang))
    }

    const supabase = await createClient()
    const { data: returns } = await supabase
        .from('return_requests')
        .select('*')
        .order('created_at', { ascending: false })

    const statusLabels = {
        pending: t('returns.status.pending'),
        approved: t('returns.status.approved'),
        rejected: t('returns.status.rejected'),
        completed: t('returns.status.completed'),
    }

    const reasonLabels: Record<string, string> = {
        defective: t('returns.reasons.defective'),
        wrong_item: t('returns.reasons.wrong_item'),
        changed_mind: t('returns.reasons.changed_mind'),
        other: t('returns.reasons.other'),
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

            {(!returns || returns.length === 0) ? (
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
                                        {t('panel.returns.reason')}
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
                                            {ret.order_id?.slice(-8) || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary">
                                            {reasonLabels[ret.reason] || ret.reason}
                                        </td>
                                        <td className="px-4 py-3 text-text-muted">
                                            {new Date(ret.created_at).toLocaleDateString(
                                                lang === 'es' ? 'es-ES' : lang,
                                                { day: 'numeric', month: 'short', year: 'numeric' }
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ReturnStatusBadge
                                                status={ret.status as 'pending' | 'approved' | 'rejected' | 'completed'}
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
