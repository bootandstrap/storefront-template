import { withPanelGuard } from '@/lib/panel-guard'
import { createClient } from '@/lib/supabase/server'
import { ProjectTimeline } from '../../../(shop)/cuenta/mi-proyecto/ProjectTimeline'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Mi Proyecto',
    description: 'Estado y progreso de tu proyecto web',
}

export default async function MiProyectoPage() {
    const { tenantId } = await withPanelGuard()

    const supabase = await createClient()
    const { data: project } = await supabase
        .from('project_phases')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

    return <ProjectTimeline project={project} />
}
