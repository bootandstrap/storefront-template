import { createClient } from '@/lib/supabase/server'
import { ProjectTimeline } from './ProjectTimeline'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Mi Proyecto',
    description: 'Estado y progreso de tu proyecto web',
}

const TENANT_ID = process.env.TENANT_ID

export default async function MiProyectoPage() {
    if (!TENANT_ID) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500">Configuración de proyecto no disponible</p>
            </div>
        )
    }

    const supabase = await createClient()
    const { data: project } = await supabase
        .from('project_phases')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .single()

    return <ProjectTimeline project={project} />
}
