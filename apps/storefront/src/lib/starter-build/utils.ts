import {
    STARTER_FEATURE_KEYS,
    type StarterFeatureKey,
    type StarterProjectPhaseLike,
    type StarterProjectRequestLike,
} from './types'

export function normalizeStarterFeatureKeys(features: readonly string[]): StarterFeatureKey[] {
    const known = new Set<string>(STARTER_FEATURE_KEYS)
    return [...new Set(features.filter((feature) => known.has(feature)))].sort() as StarterFeatureKey[]
}

export function sortStarterPhases<T extends { phase_key: string; sort_order?: number }>(phases: readonly T[]): T[] {
    return [...phases].sort((left, right) => {
        const orderDiff = (left.sort_order ?? 0) - (right.sort_order ?? 0)
        return orderDiff !== 0 ? orderDiff : left.phase_key.localeCompare(right.phase_key)
    })
}

export function sortStarterRequests<T extends { request_key: string; sort_order?: number }>(requests: readonly T[]): T[] {
    return [...requests].sort((left, right) => {
        const orderDiff = (left.sort_order ?? 0) - (right.sort_order ?? 0)
        return orderDiff !== 0 ? orderDiff : left.request_key.localeCompare(right.request_key)
    })
}

export function getStarterProgressSummary(phases: readonly StarterProjectPhaseLike[]) {
    const sortedPhases = sortStarterPhases(phases)
    const totalPhases = sortedPhases.length
    const completedPhases = sortedPhases.filter((phase) => phase.phase_status === 'completed').length
    const inProgressPhase = sortedPhases.find((phase) => phase.phase_status === 'in_progress') ?? null
    const progressPercent = totalPhases === 0
        ? 0
        : Math.round((completedPhases / totalPhases) * 100)

    return {
        totalPhases,
        completedPhases,
        inProgressPhase,
        progressPercent,
    }
}

export function getCurrentPhaseKey(
    phases: readonly StarterProjectPhaseLike[],
    requests?: readonly StarterProjectRequestLike[]
) {
    const sortedPhases = sortStarterPhases(phases)
    const active = sortedPhases.find((phase) => phase.phase_status === 'in_progress')
    if (active) return active.phase_key
    if (requests && requests.length > 0) return sortedPhases[0]?.phase_key ?? null
    return sortedPhases.find((phase) => phase.phase_status !== 'completed')?.phase_key ?? null
}
