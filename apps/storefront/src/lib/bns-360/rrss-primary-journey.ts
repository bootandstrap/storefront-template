import { randomUUID } from 'node:crypto'

export interface Bns360RrssConfig {
    socialFacebook: string | null
    socialInstagram: string | null
    socialTiktok: string | null
    socialTwitter: string | null
}

export type Bns360RrssConfigUpdate = Partial<Bns360RrssConfig>

export interface Bns360RrssPublicRoute {
    path: string
    status: number
    sameAs: string[]
}

export interface Bns360RrssPrimaryClient {
    readConfig(): Promise<Bns360RrssConfig>
    updateConfig(updates: Bns360RrssConfigUpdate): Promise<void>
    readPublicRoute(path: string): Promise<Bns360RrssPublicRoute>
}

export interface Bns360RrssPrimaryJourneyInput {
    tenantId: string
    client: Bns360RrssPrimaryClient
    runId?: string
}

export interface Bns360RrssPrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.rrss-primary/v1'
    status: 'verified' | 'blocked'
    runId: string
    tenantRef: string
    generatedAt: string
    steps: Array<{
        key:
        | 'read_initial'
        | 'update_config'
        | 'read_after_update'
        | 'public_same_as'
        | 'runtime_projection'
        | 'rollback'
        | 'read_after_rollback'
        status: 'verified' | 'blocked'
    }>
    runtime: {
        socialFacebook: string
        socialInstagram: string
        socialTiktok: string
        publicPath: string
        publicStatus: number
        sameAs: string[]
    }
    cleanup: {
        status: 'verified' | 'failed'
        restored: boolean
    }
    error?: string
}

const DEFAULT_RUNTIME = {
    socialFacebook: '',
    socialInstagram: '',
    socialTiktok: '',
    publicPath: '/es',
    publicStatus: 0,
    sameAs: [] as string[],
}

export async function runBns360RrssPrimaryJourney(
    input: Bns360RrssPrimaryJourneyInput
): Promise<Bns360RrssPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-rrss-${Date.now()}-${randomUUID()}`
    const targetConfig = {
        socialFacebook: `https://facebook.com/bns360-${runId}`,
        socialInstagram: `https://instagram.com/bns360-${runId}`,
        socialTiktok: `https://tiktok.com/@bns360-${runId}`,
    }
    const steps: Bns360RrssPrimaryJourneyResult['steps'] = []
    let initialConfig: Bns360RrssConfig | null = null
    let runtime = { ...DEFAULT_RUNTIME }
    let journeyError: string | undefined
    let cleanupStatus: Bns360RrssPrimaryJourneyResult['cleanup']['status'] = 'failed'
    let restored = false

    try {
        initialConfig = await input.client.readConfig()
        steps.push({ key: 'read_initial', status: 'verified' })

        await input.client.updateConfig(targetConfig)
        steps.push({ key: 'update_config', status: 'verified' })

        const updatedConfig = await input.client.readConfig()
        runtime = projectRuntime(updatedConfig, {
            path: '/es',
            status: 0,
            sameAs: [],
        })
        steps.push({ key: 'read_after_update', status: 'verified' })

        const publicRoute = await input.client.readPublicRoute('/es')
        runtime = projectRuntime(updatedConfig, publicRoute)
        if (
            publicRoute.status >= 400 ||
            !targetConfig.socialFacebook ||
            !targetConfig.socialInstagram ||
            !targetConfig.socialTiktok ||
            !publicRoute.sameAs.includes(targetConfig.socialFacebook) ||
            !publicRoute.sameAs.includes(targetConfig.socialInstagram) ||
            !publicRoute.sameAs.includes(targetConfig.socialTiktok)
        ) {
            throw new Error('RRSS public sameAs did not reflect the target config')
        }
        steps.push({ key: 'public_same_as', status: 'verified' })

        if (
            runtime.socialFacebook !== targetConfig.socialFacebook ||
            runtime.socialInstagram !== targetConfig.socialInstagram ||
            runtime.socialTiktok !== targetConfig.socialTiktok
        ) {
            throw new Error('RRSS runtime projection did not reflect owner config update')
        }
        steps.push({ key: 'runtime_projection', status: 'verified' })
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'RRSS primary journey failed'
    } finally {
        if (initialConfig) {
            try {
                await input.client.updateConfig({
                    socialFacebook: initialConfig.socialFacebook,
                    socialInstagram: initialConfig.socialInstagram,
                    socialTiktok: initialConfig.socialTiktok,
                    socialTwitter: initialConfig.socialTwitter,
                })
                steps.push({ key: 'rollback', status: 'verified' })
            } catch (error) {
                journeyError = journeyError ?? (error instanceof Error ? error.message : 'RRSS rollback failed')
                steps.push({ key: 'rollback', status: 'blocked' })
            }

            try {
                const rollbackConfig = await input.client.readConfig()
                restored = isConfigRestored(initialConfig, rollbackConfig)
                cleanupStatus = restored ? 'verified' : 'failed'
                steps.push({
                    key: 'read_after_rollback',
                    status: restored ? 'verified' : 'blocked',
                })
            } catch (error) {
                journeyError = journeyError ?? (
                    error instanceof Error ? error.message : 'RRSS rollback verification failed'
                )
            }
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.rrss-primary/v1',
        status: !journeyError && cleanupStatus === 'verified' && restored ? 'verified' : 'blocked',
        runId,
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        steps,
        runtime,
        cleanup: {
            status: cleanupStatus,
            restored,
        },
        ...(journeyError ? { error: journeyError } : {}),
    }
}

function projectRuntime(
    config: Bns360RrssConfig,
    publicRoute: Bns360RrssPublicRoute
): Bns360RrssPrimaryJourneyResult['runtime'] {
    return {
        socialFacebook: config.socialFacebook ?? '',
        socialInstagram: config.socialInstagram ?? '',
        socialTiktok: config.socialTiktok ?? '',
        publicPath: publicRoute.path,
        publicStatus: publicRoute.status,
        sameAs: publicRoute.sameAs,
    }
}

function isConfigRestored(initial: Bns360RrssConfig, current: Bns360RrssConfig): boolean {
    return (
        initial.socialFacebook === current.socialFacebook &&
        initial.socialInstagram === current.socialInstagram &&
        initial.socialTiktok === current.socialTiktok &&
        initial.socialTwitter === current.socialTwitter
    )
}
