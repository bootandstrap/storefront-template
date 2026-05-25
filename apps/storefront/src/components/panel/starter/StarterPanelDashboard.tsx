import type { StarterOwnerProject } from '@/lib/starter-build/queries'
import { getCurrentPhaseKey, getStarterProgressSummary } from '@/lib/starter-build/utils'
import { StarterRequestResponsePanel } from './StarterRequestResponsePanel'

interface StarterPanelDashboardProps {
    lang: string
    customerName: string
    supportEmail: string
    project: StarterOwnerProject | null
}

const FEATURE_COPY: Record<string, { title: string; body: string }> = {
    timeline: {
        title: 'Timeline',
        body: 'Sigues el avance real del starter por fases claras.',
    },
    requirements_view: {
        title: 'Requisitos',
        body: 'Ves exactamente lo que el equipo necesita para continuar.',
    },
    asset_upload_center: {
        title: 'Centro de assets',
        body: 'Sube logos, fotos y materiales cuando los tengas listos.',
    },
    design_preview: {
        title: 'Preview',
        body: 'Aqui apareceran avances revisables cuando toque tu fase.',
    },
    feedback_thread: {
        title: 'Feedback',
        body: 'Deja observaciones sin perder el hilo del proyecto.',
    },
    basic_profile_form: {
        title: 'Perfil base',
        body: 'Datos esenciales para configurar tu tienda inicial.',
    },
    catalog_intake: {
        title: 'Catalogo inicial',
        body: 'Centralizamos la informacion minima para arrancar.',
    },
    launch_checklist_view: {
        title: 'Checklist',
        body: 'Resumen operativo previo a la salida del starter.',
    },
    support_contact_panel: {
        title: 'Contacto',
        body: 'Canal directo para resolver bloqueos o prioridades.',
    },
    project_messages: {
        title: 'Mensajes',
        body: 'Resumen de lo importante para esta fase.',
    },
}

function getPhaseStatusLabel(status: string) {
    if (status === 'completed') return 'Completada'
    if (status === 'in_progress') return 'En curso'
    return 'Pendiente'
}

export default function StarterPanelDashboard({
    lang,
    customerName,
    supportEmail,
    project,
}: StarterPanelDashboardProps) {
    const summary = getStarterProgressSummary(project?.phases ?? [])
    const currentPhaseKey = project ? (project.currentPhaseKey ?? getCurrentPhaseKey(project.phases)) : null
    const currentPhase = project?.phases.find((phase) => phase.phase_key === currentPhaseKey)
    const currentRequests = currentPhase ? project?.requestsByPhase[currentPhase.phase_key] ?? [] : []
    const visibleFeatures = currentPhase?.visible_features ?? ['timeline', 'support_contact_panel']

    return (
        <div className="space-y-8">
            <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-emerald-50/60 to-sky-50/60 p-8 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Starter colaborativo</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Tu tienda se esta preparando</h1>
                <p className="mt-3 max-w-3xl text-base text-slate-600">
                    <span className="font-bold text-slate-950">{customerName}</span> accede aqui a su proyecto real de arranque.
                    Esta es la superficie temporal de tu storefront hasta que la tienda pase al modo totalmente personalizado.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Progreso</p>
                        <p className="mt-2 text-3xl font-black text-slate-950">{summary.progressPercent}%</p>
                        <p className="mt-1 text-sm text-slate-500">{summary.completedPhases} de {summary.totalPhases} fases completadas</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fase activa</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{currentPhase?.title ?? 'Pendiente de preparacion'}</p>
                        <p className="mt-1 text-sm text-slate-500">{currentPhase?.description ?? 'Todavia no hay una fase visible para este starter.'}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contacto operativo</p>
                        <p className="mt-2 text-lg font-bold text-slate-950">{supportEmail}</p>
                        <p className="mt-1 text-sm text-slate-500">Usa este canal si necesitas aclarar materiales o prioridades.</p>
                    </div>
                </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">Fases del proyecto</h2>
                            <p className="text-sm text-slate-500">La vista del starter sustituye al panel normal mientras esta fase siga activa.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {(project?.phases ?? []).length > 0 ? (project?.phases ?? []).map((phase) => {
                            const isActive = phase.phase_key === currentPhaseKey
                            return (
                                <div key={phase.id} className={`rounded-3xl border p-4 ${isActive ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-lg font-bold text-slate-950">{phase.title}</p>
                                            <p className="mt-1 text-sm text-slate-500">{phase.description ?? 'Sin detalle adicional para esta fase.'}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                            phase.phase_status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : phase.phase_status === 'in_progress'
                                                    ? 'bg-sky-100 text-sky-700'
                                                    : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {getPhaseStatusLabel(phase.phase_status)}
                                        </span>
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6 text-sm text-slate-500">
                                Tu proyecto starter ya esta marcado en este storefront, pero todavia no tiene una materializacion visible.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">Requests de esta fase</h2>
                        <p className="mt-1 text-sm text-slate-500">Responde, confirma o sube assets directamente desde tu panel.</p>
                        <div className="mt-5">
                            <StarterRequestResponsePanel lang={lang} requests={currentRequests} />
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">Lo visible ahora</h2>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {visibleFeatures.map((featureKey) => {
                                const copy = FEATURE_COPY[featureKey] ?? {
                                    title: featureKey,
                                    body: 'Feature visible para esta fase.',
                                }
                                return (
                                    <div key={featureKey} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                                        <p className="font-bold text-slate-950">{copy.title}</p>
                                        <p className="mt-1 text-sm text-slate-500">{copy.body}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
