/**
 * Mi Proyecto — Owner Panel
 *
 * Server component shows project timeline for the authenticated tenant.
 * Reuses ProjectTimeline from the customer-facing account section.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { ProjectTimeline } from '../../../(shop)/cuenta/mi-proyecto/ProjectTimeline'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('panel.project.title'),
        description: t('panel.project.subtitle'),
    }
}

export default async function MiProyectoPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId } = await withPanelGuard()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const supabase = await createClient()
    const { data: project } = await supabase
        .from('project_phases')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('panel.project.title')}
                </h1>
                <p className="text-text-muted mt-1">
                    {t('panel.project.subtitle')}
                </p>
            </div>
            <ProjectTimeline project={project} />
        </div>
    )
}
