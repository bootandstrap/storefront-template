'use client'

/**
 * ModuleSetupWidget — Dashboard widget for module onboarding
 *
 * Thin wrapper around ModuleSetupOrchestrator for dashboard integration.
 * Receives active modules from server context, fetches the rest client-side.
 *
 * @module components/panel/ModuleSetupWidget
 */

import dynamic from 'next/dynamic'

// Lazy-load the Orchestrator to avoid bloating the dashboard bundle
const ModuleSetupOrchestrator = dynamic(
    () => import('@/components/panel/ModuleSetupOrchestrator'),
    {
        loading: () => (
            <div className="space-y-4">
                <div className="h-16 rounded-2xl bg-sf-sec animate-pulse" />
                <div className="h-16 rounded-2xl bg-sf-sec animate-pulse opacity-60" />
            </div>
        ),
    },
)

interface ModuleSetupWidgetProps {
    /** Active module keys with tier info */
    activeModules: Array<{
        moduleKey: string
        tierName: string
        icon?: string
        displayName?: string
        isNew?: boolean
    }>
    /** Feature flags */
    featureFlags: Record<string, boolean>
    /** Config values for modules */
    configValues: Record<string, unknown>
    /** Whether onboarding has been completed */
    onboardingCompleted: boolean
    /** Language */
    lang: string
}

export default function ModuleSetupWidget(props: ModuleSetupWidgetProps) {
    // Don't render if no active modules with setup
    if (props.activeModules.length === 0) return null

    return (
        <ModuleSetupOrchestrator
            {...props}
            featureLabels={{}}
            compact={props.onboardingCompleted}
        />
    )
}
