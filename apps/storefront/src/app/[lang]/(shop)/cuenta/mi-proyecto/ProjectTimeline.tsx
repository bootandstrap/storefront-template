'use client'

/**
 * ProjectTimeline — Customer-facing project tracker
 *
 * Beautiful read-only view showing project progress through phases.
 * Uses the same phase config as the SuperAdmin side.
 */

import { useI18n } from '@/lib/i18n/provider'
import { useState } from 'react'

const PROJECT_PHASES = ['briefing', 'design', 'development', 'review', 'launch', 'completed'] as const

type ProjectPhase = (typeof PROJECT_PHASES)[number]

const PHASE_CONFIG: Record<ProjectPhase, {
    label: Record<string, string>
    icon: string
    color: string
    description: Record<string, string>
}> = {
    briefing: {
        label: { es: 'Briefing', en: 'Briefing', de: 'Briefing', fr: 'Briefing', it: 'Briefing' },
        icon: '📋',
        color: '#6366f1',
        description: {
            es: 'Recopilando los requisitos de tu proyecto',
            en: 'Gathering your project requirements',
            de: 'Sammeln Ihrer Projektanforderungen',
            fr: 'Collecte des exigences de votre projet',
            it: 'Raccolta dei requisiti del tuo progetto',
        },
    },
    design: {
        label: { es: 'Diseño', en: 'Design', de: 'Design', fr: 'Design', it: 'Design' },
        icon: '🎨',
        color: '#8b5cf6',
        description: {
            es: 'Diseño visual y estructura de tu web',
            en: 'Visual design and website structure',
            de: 'Visuelles Design und Website-Struktur',
            fr: 'Design visuel et structure du site',
            it: 'Design visivo e struttura del sito',
        },
    },
    development: {
        label: { es: 'Desarrollo', en: 'Development', de: 'Entwicklung', fr: 'Développement', it: 'Sviluppo' },
        icon: '⚙️',
        color: '#3b82f6',
        description: {
            es: 'Implementación técnica y configuración',
            en: 'Technical implementation and configuration',
            de: 'Technische Umsetzung und Konfiguration',
            fr: 'Mise en œuvre technique et configuration',
            it: 'Implementazione tecnica e configurazione',
        },
    },
    review: {
        label: { es: 'Revisión', en: 'Review', de: 'Überprüfung', fr: 'Révision', it: 'Revisione' },
        icon: '🔍',
        color: '#f59e0b',
        description: {
            es: 'Revisión y ajustes finales',
            en: 'Review and final adjustments',
            de: 'Überprüfung und letzte Anpassungen',
            fr: 'Révision et ajustements finaux',
            it: 'Revisione e aggiustamenti finali',
        },
    },
    launch: {
        label: { es: 'Lanzamiento', en: 'Launch', de: 'Launch', fr: 'Lancement', it: 'Lancio' },
        icon: '🚀',
        color: '#22c55e',
        description: {
            es: '¡Tu web está en línea!',
            en: 'Your website is live!',
            de: 'Ihre Website ist online!',
            fr: 'Votre site est en ligne !',
            it: 'Il tuo sito è online!',
        },
    },
    completed: {
        label: { es: 'Completado', en: 'Completed', de: 'Abgeschlossen', fr: 'Terminé', it: 'Completato' },
        icon: '✅',
        color: '#10b981',
        description: {
            es: 'Proyecto entregado y en mantenimiento',
            en: 'Project delivered and in maintenance',
            de: 'Projekt geliefert und in Wartung',
            fr: 'Projet livré et en maintenance',
            it: 'Progetto consegnato e in manutenzione',
        },
    },
}

interface ProjectData {
    current_phase: string
    overall_progress: number
    estimated_launch_date: string | null
    briefing_started_at: string | null
    briefing_completed_at: string | null
    design_started_at: string | null
    design_completed_at: string | null
    development_started_at: string | null
    development_completed_at: string | null
    review_started_at: string | null
    review_completed_at: string | null
    launch_started_at: string | null
    launch_completed_at: string | null
    [key: string]: unknown
}

interface Props {
    project: ProjectData | null
}

const PAGE_LABELS: Record<string, Record<string, string>> = {
    title: {
        es: 'Mi Proyecto',
        en: 'My Project',
        de: 'Mein Projekt',
        fr: 'Mon Projet',
        it: 'Il Mio Progetto',
    },
    subtitle: {
        es: 'Sigue el progreso de tu proyecto web en tiempo real',
        en: 'Track your web project progress in real time',
        de: 'Verfolgen Sie den Fortschritt Ihres Webprojekts in Echtzeit',
        fr: 'Suivez la progression de votre projet web en temps réel',
        it: 'Segui i progressi del tuo progetto web in tempo reale',
    },
    noProject: {
        es: 'Tu proyecto se está configurando. ¡Pronto verás el progreso aquí!',
        en: 'Your project is being set up. You\'ll see progress here soon!',
        de: 'Ihr Projekt wird eingerichtet. Bald sehen Sie hier den Fortschritt!',
        fr: 'Votre projet est en cours de configuration. Vous verrez bientôt les progrès ici !',
        it: 'Il tuo progetto è in fase di configurazione. Presto vedrai i progressi qui!',
    },
    progress: {
        es: 'Progreso general',
        en: 'Overall progress',
        de: 'Gesamtfortschritt',
        fr: 'Progression globale',
        it: 'Progresso generale',
    },
    estimatedLaunch: {
        es: 'Fecha estimada de lanzamiento',
        en: 'Estimated launch date',
        de: 'Voraussichtliches Startdatum',
        fr: 'Date de lancement estimée',
        it: 'Data di lancio prevista',
    },
    daysLeft: {
        es: 'días restantes',
        en: 'days left',
        de: 'Tage übrig',
        fr: 'jours restants',
        it: 'giorni rimanenti',
    },
    inProgress: {
        es: 'En curso',
        en: 'In progress',
        de: 'In Bearbeitung',
        fr: 'En cours',
        it: 'In corso',
    },
    since: {
        es: 'Desde',
        en: 'Since',
        de: 'Seit',
        fr: 'Depuis',
        it: 'Dal',
    },
    pending: {
        es: 'Pendiente',
        en: 'Pending',
        de: 'Ausstehend',
        fr: 'En attente',
        it: 'In sospeso',
    },
}

export function ProjectTimeline({ project }: Props) {
    const { locale } = useI18n()
    const lang = locale || 'es'

    const t = (key: string): string => {
        return PAGE_LABELS[key]?.[lang] || PAGE_LABELS[key]?.['en'] || key
    }

    // Capture current time once on mount (pure initialization for React Compiler)
    const [now] = useState(() => Date.now())

    const launchInfo = (() => {
        if (!project?.estimated_launch_date) return null
        const launchDate = new Date(project.estimated_launch_date)
        const daysLeft = Math.ceil((launchDate.getTime() - now) / (1000 * 60 * 60 * 24))
        const formattedDate = launchDate.toLocaleDateString(
            lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'it' ? 'it-IT' : 'en-US',
            { day: 'numeric', month: 'long', year: 'numeric' }
        )
        return { formattedDate, daysLeft }
    })()

    if (!project) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-brand-subtle flex items-center justify-center text-4xl mx-auto mb-6">
                    🏗️
                </div>
                <h2 className="text-2xl font-black text-tx mb-3">{t('title')}</h2>
                <p className="text-tx-muted text-lg">{t('noProject')}</p>
            </div>
        )
    }

    const currentPhase = project.current_phase as ProjectPhase
    const currentIndex = PROJECT_PHASES.indexOf(currentPhase)
    const progress = project.overall_progress

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-black text-tx mb-2">{t('title')}</h1>
                <p className="text-tx-muted">{t('subtitle')}</p>
            </div>

            {/* Progress card */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-tx">{t('progress')}</span>
                    <span className="text-2xl font-black text-brand">{progress}%</span>
                </div>
                <div className="h-4 bg-sf-2 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-brand via-violet-500 to-emerald-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Estimated launch date */}
                {launchInfo && (
                    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                        <span className="text-tx-muted">{t('estimatedLaunch')}:</span>
                        <span className="font-bold text-tx">
                            {launchInfo.formattedDate}
                        </span>
                        {launchInfo.daysLeft > 0 && (
                            <span className="text-xs text-brand font-medium">({launchInfo.daysLeft} {t('daysLeft')})</span>
                        )}
                    </div>
                )}
            </div>

            {/* Phase timeline — vertical on mobile, visual connected nodes */}
            <div className="glass rounded-2xl p-6">
                <div className="space-y-0">
                    {PROJECT_PHASES.map((phase, i) => {
                        const config = PHASE_CONFIG[phase]
                        const isActive = phase === currentPhase
                        const isCompleted = i < currentIndex
                        const isFuture = i > currentIndex

                        const startedAt = project[`${phase}_started_at`] as string | null
                        const completedAt = project[`${phase}_completed_at`] as string | null

                        return (
                            <div key={phase} className="flex gap-4">
                                {/* Timeline track */}
                                <div className="flex flex-col items-center">
                                    {/* Phase circle */}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all shrink-0 ${isCompleted
                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                            : isActive
                                                ? 'bg-sf-0 border-[3px] shadow-lg ring-4 ring-soft'
                                                : 'bg-sf-2 border-2 border-sf-3'
                                            }`}
                                        style={isActive ? { borderColor: config.color } : undefined}
                                    >
                                        {isCompleted ? '✓' : config.icon}
                                    </div>
                                    {/* Connector line */}
                                    {i < PROJECT_PHASES.length - 1 && (
                                        <div className={`w-0.5 flex-1 min-h-[24px] ${isCompleted ? 'bg-emerald-400' : 'bg-sf-3'}`} />
                                    )}
                                </div>

                                {/* Phase content */}
                                <div className={`pb-6 flex-1 ${isFuture ? 'opacity-40' : ''}`}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className={`font-bold text-base ${isActive ? 'text-brand' : isCompleted ? 'text-tx' : 'text-tx-muted'}`}>
                                            {config.label[lang] || config.label['en']}
                                        </h3>
                                        {isActive && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-subtle text-brand animate-pulse">
                                                ● {t('inProgress')}
                                            </span>
                                        )}
                                        {isFuture && (
                                            <span className="text-[10px] text-tx-muted">{t('pending')}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-tx-muted mb-1">
                                        {config.description[lang] || config.description['en']}
                                    </p>
                                    {/* Dates */}
                                    {completedAt && (
                                        <p className="text-xs text-emerald-600 font-medium">
                                            ✓ {new Date(completedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}
                                        </p>
                                    )}
                                    {startedAt && !completedAt && isActive && (
                                        <p className="text-xs text-brand font-medium">
                                            {t('since')} {new Date(startedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
