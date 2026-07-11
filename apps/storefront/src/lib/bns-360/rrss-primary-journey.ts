import { randomUUID } from 'node:crypto'

export interface Bns360RrssConfig {
    socialFacebook: string | null
    socialInstagram: string | null
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
    publicPath: '/es',
    publicStatus: 0,
    sameAs: [] as string[],
}

export async function runBns360RrssPrimaryJourney(
    input: Bns360RrssPrimaryJourneyInput
): Promise<Bns360RrssPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-rrss-${Date.now()}-${randomUUID()}`
    const targetConfig = buildTargetConfig(runId)
    const steps: Bns360RrssPrimaryJourneyResult['steps'] = []
    const executionState = createExecutionState()
    let journeyError: string | undefined
    let cleanup = buildCleanup(false)

    try {
        await executePrimaryJourney(input.client, targetConfig, steps, executionState)
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'RRSS primary journey failed'
    } finally {
        if (executionState.initialConfig) {
            const rollback = await rollbackPrimaryJourney(input.client, executionState.initialConfig, steps)
            cleanup = rollback.cleanup
            journeyError = journeyError ?? rollback.error
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.rrss-primary/v1',
        status: !journeyError && cleanup.status === 'verified' && cleanup.restored ? 'verified' : 'blocked',
        runId,
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        steps,
        runtime: executionState.runtime,
        cleanup,
        ...(journeyError ? { error: journeyError } : {}),
    }
}

interface ExecutionState {
    initialConfig: Bns360RrssConfig | null
    runtime: Bns360RrssPrimaryJourneyResult['runtime']
}

interface RrssTargetConfig {
    socialFacebook: string
    socialInstagram: string
}

function createExecutionState(): ExecutionState {
    return {
        initialConfig: null,
        runtime: { ...DEFAULT_RUNTIME },
    }
}

function buildTargetConfig(runId: string): RrssTargetConfig {
    return {
        socialFacebook: `https://facebook.com/bns360-${runId}`,
        socialInstagram: `https://instagram.com/bns360-${runId}`,
    }
}

async function executePrimaryJourney(
    client: Bns360RrssPrimaryClient,
    targetConfig: ReturnType<typeof buildTargetConfig>,
    steps: Bns360RrssPrimaryJourneyResult['steps'],
    state: ExecutionState
): Promise<void> {
    const initialConfig = await client.readConfig()
    state.initialConfig = initialConfig
    steps.push({ key: 'read_initial', status: 'verified' })

    await client.updateConfig(targetConfig)
    steps.push({ key: 'update_config', status: 'verified' })

    const updatedConfig = await client.readConfig()
    steps.push({ key: 'read_after_update', status: 'verified' })

    const publicRoute = await client.readPublicRoute('/es')
    state.runtime = projectRuntime(updatedConfig, publicRoute)
    assertPublicSameAs(publicRoute, targetConfig)
    steps.push({ key: 'public_same_as', status: 'verified' })

    assertRuntimeProjection(state.runtime, targetConfig)
    steps.push({ key: 'runtime_projection', status: 'verified' })
}

async function rollbackPrimaryJourney(
    client: Bns360RrssPrimaryClient,
    initialConfig: Bns360RrssConfig,
    steps: Bns360RrssPrimaryJourneyResult['steps']
): Promise<{
    cleanup: Bns360RrssPrimaryJourneyResult['cleanup']
    error?: string
}> {
    const rollbackError = await restoreInitialConfig(client, initialConfig, steps)
    const verification = await verifyRollback(client, initialConfig, steps)

    return {
        cleanup: verification.cleanup,
        error: rollbackError ?? verification.error,
    }
}

async function restoreInitialConfig(
    client: Bns360RrssPrimaryClient,
    initialConfig: Bns360RrssConfig,
    steps: Bns360RrssPrimaryJourneyResult['steps']
): Promise<string | undefined> {
    try {
        await client.updateConfig(initialConfig)
        steps.push({ key: 'rollback', status: 'verified' })
    } catch (error) {
        steps.push({ key: 'rollback', status: 'blocked' })
        return error instanceof Error ? error.message : 'RRSS rollback failed'
    }
}

async function verifyRollback(
    client: Bns360RrssPrimaryClient,
    initialConfig: Bns360RrssConfig,
    steps: Bns360RrssPrimaryJourneyResult['steps']
): Promise<{
    cleanup: Bns360RrssPrimaryJourneyResult['cleanup']
    error?: string
}> {
    try {
        const rollbackConfig = await client.readConfig()
        const restored = isConfigRestored(initialConfig, rollbackConfig)
        steps.push({
            key: 'read_after_rollback',
            status: restored ? 'verified' : 'blocked',
        })
        return { cleanup: buildCleanup(restored) }
    } catch (error) {
        return {
            cleanup: buildCleanup(false),
            error: error instanceof Error ? error.message : 'RRSS rollback verification failed',
        }
    }
}

function assertPublicSameAs(
    publicRoute: Bns360RrssPublicRoute,
    targetConfig: ReturnType<typeof buildTargetConfig>
): void {
    const expectedLinks = [
        targetConfig.socialFacebook,
        targetConfig.socialInstagram,
    ]
    const matches = expectedLinks.every(link => publicRoute.sameAs.includes(link))
    if (publicRoute.status >= 400 || !matches) {
        throw new Error('RRSS public sameAs did not reflect the target config')
    }
}

function assertRuntimeProjection(
    runtime: Bns360RrssPrimaryJourneyResult['runtime'],
    targetConfig: ReturnType<typeof buildTargetConfig>
): void {
    if (
        runtime.socialFacebook !== targetConfig.socialFacebook ||
        runtime.socialInstagram !== targetConfig.socialInstagram
    ) {
        throw new Error('RRSS runtime projection did not reflect owner config update')
    }
}

function buildCleanup(restored: boolean): Bns360RrssPrimaryJourneyResult['cleanup'] {
    return {
        status: restored ? 'verified' : 'failed',
        restored,
    }
}

function projectRuntime(
    config: Bns360RrssConfig,
    publicRoute: Bns360RrssPublicRoute
): Bns360RrssPrimaryJourneyResult['runtime'] {
    return {
        socialFacebook: config.socialFacebook ?? '',
        socialInstagram: config.socialInstagram ?? '',
        publicPath: publicRoute.path,
        publicStatus: publicRoute.status,
        sameAs: publicRoute.sameAs,
    }
}

function isConfigRestored(initial: Bns360RrssConfig, current: Bns360RrssConfig): boolean {
    return (
        initial.socialFacebook === current.socialFacebook &&
        initial.socialInstagram === current.socialInstagram
    )
}
