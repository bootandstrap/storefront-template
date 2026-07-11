import { randomUUID } from 'node:crypto'

export interface Bns360SeoConfig {
    metaTitle: string | null
    metaDescription: string | null
}

export type Bns360SeoConfigUpdate = Partial<Bns360SeoConfig>

export interface Bns360SeoPublicRoute {
    path: string
    status: number
    title: string | null
    description: string | null
    ogTitle: string | null
    ogDescription: string | null
}

export interface Bns360SeoPrimaryClient {
    readConfig(): Promise<Bns360SeoConfig>
    updateConfig(updates: Bns360SeoConfigUpdate): Promise<void>
    readPublicRoute(path: string): Promise<Bns360SeoPublicRoute>
}

export interface Bns360SeoPrimaryJourneyInput {
    tenantId: string
    client: Bns360SeoPrimaryClient
    runId?: string
}

export interface Bns360SeoPrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.seo-primary/v1'
    status: 'verified' | 'blocked'
    runId: string
    tenantRef: string
    generatedAt: string
    steps: Array<{
        key:
        | 'read_initial'
        | 'update_config'
        | 'read_after_update'
        | 'public_metadata'
        | 'runtime_projection'
        | 'rollback'
        | 'read_after_rollback'
        status: 'verified' | 'blocked'
    }>
    runtime: {
        metaTitle: string
        metaDescription: string
        publicPath: string
        publicStatus: number
        publicTitle: string | null
        publicDescription: string | null
        publicOgTitle: string | null
        publicOgDescription: string | null
    }
    cleanup: {
        status: 'verified' | 'failed'
        restored: boolean
    }
    error?: string
}

const DEFAULT_RUNTIME = {
    metaTitle: '',
    metaDescription: '',
    publicPath: '/es',
    publicStatus: 0,
    publicTitle: null as string | null,
    publicDescription: null as string | null,
    publicOgTitle: null as string | null,
    publicOgDescription: null as string | null,
}

export async function runBns360SeoPrimaryJourney(
    input: Bns360SeoPrimaryJourneyInput
): Promise<Bns360SeoPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-seo-${Date.now()}-${randomUUID()}`
    const targetConfig = {
        metaTitle: `BNS360 SEO ${runId}`,
        metaDescription: `BNS360 metadata ${runId}`,
    }
    const steps: Bns360SeoPrimaryJourneyResult['steps'] = []
    let initialConfig: Bns360SeoConfig | null = null
    let runtime = { ...DEFAULT_RUNTIME }
    let journeyError: string | undefined
    let cleanupStatus: Bns360SeoPrimaryJourneyResult['cleanup']['status'] = 'failed'
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
            title: null,
            description: null,
            ogTitle: null,
            ogDescription: null,
        })
        steps.push({ key: 'read_after_update', status: 'verified' })

        const publicRoute = await input.client.readPublicRoute('/es')
        runtime = projectRuntime(updatedConfig, publicRoute)
        if (
            publicRoute.status >= 400 ||
            !publicRoute.title?.includes(targetConfig.metaTitle) ||
            publicRoute.description !== targetConfig.metaDescription ||
            !publicRoute.ogTitle?.includes(targetConfig.metaTitle) ||
            publicRoute.ogDescription !== targetConfig.metaDescription
        ) {
            throw new Error('SEO public metadata did not reflect the target config')
        }
        steps.push({ key: 'public_metadata', status: 'verified' })

        if (
            runtime.metaTitle !== targetConfig.metaTitle ||
            runtime.metaDescription !== targetConfig.metaDescription
        ) {
            throw new Error('SEO runtime projection did not reflect owner config update')
        }
        steps.push({ key: 'runtime_projection', status: 'verified' })
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'SEO primary journey failed'
    } finally {
        if (initialConfig) {
            try {
                await input.client.updateConfig({
                    metaTitle: initialConfig.metaTitle,
                    metaDescription: initialConfig.metaDescription,
                })
                steps.push({ key: 'rollback', status: 'verified' })
            } catch (error) {
                journeyError = journeyError ?? (error instanceof Error ? error.message : 'SEO rollback failed')
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
                    error instanceof Error ? error.message : 'SEO rollback verification failed'
                )
            }
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.seo-primary/v1',
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
    config: Bns360SeoConfig,
    publicRoute: Bns360SeoPublicRoute
): Bns360SeoPrimaryJourneyResult['runtime'] {
    return {
        metaTitle: config.metaTitle ?? '',
        metaDescription: config.metaDescription ?? '',
        publicPath: publicRoute.path,
        publicStatus: publicRoute.status,
        publicTitle: publicRoute.title,
        publicDescription: publicRoute.description,
        publicOgTitle: publicRoute.ogTitle,
        publicOgDescription: publicRoute.ogDescription,
    }
}

function isConfigRestored(initial: Bns360SeoConfig, current: Bns360SeoConfig): boolean {
    return (
        initial.metaTitle === current.metaTitle &&
        initial.metaDescription === current.metaDescription
    )
}
