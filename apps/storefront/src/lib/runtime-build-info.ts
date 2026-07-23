export interface RuntimeBuildInfo {
    commitSha: string | null
    commitShortSha: string | null
    branch: string | null
    deployedAt: string | null
    source: 'env' | 'unknown'
}

const COMMIT_SHA_KEYS = [
    'APP_GIT_COMMIT_SHA',
    'GIT_COMMIT_SHA',
] as const

const BRANCH_KEYS = [
    'APP_GIT_BRANCH',
    'GIT_BRANCH',
] as const

const DEPLOYED_AT_KEYS = [
    'APP_DEPLOYED_AT',
    'DEPLOYED_AT',
] as const

function firstEnvValue(keys: readonly string[]): string | null {
    for (const key of keys) {
        const value = process.env[key]?.trim()
        if (value) return value
    }
    return null
}

export function getRuntimeBuildInfo(): RuntimeBuildInfo {
    const commitSha = firstEnvValue(COMMIT_SHA_KEYS)
    const branch = firstEnvValue(BRANCH_KEYS)
    const deployedAt = firstEnvValue(DEPLOYED_AT_KEYS)

    if (commitSha || branch || deployedAt) {
        return {
            commitSha,
            commitShortSha: commitSha ? commitSha.slice(0, 8) : null,
            branch,
            deployedAt,
            source: 'env',
        }
    }

    return {
        commitSha: null,
        commitShortSha: null,
        branch: null,
        deployedAt: null,
        source: 'unknown',
    }
}
