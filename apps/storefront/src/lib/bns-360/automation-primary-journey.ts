import { randomUUID } from 'node:crypto'

export interface Bns360AutomationWebhookConfig {
    enabled: boolean
    url: string
    secret: string
}

export interface Bns360AutomationEmailConfig {
    enabled: boolean
}

export interface Bns360AutomationConfig {
    notificationChannels: {
        webhook?: Bns360AutomationWebhookConfig
        email?: Bns360AutomationEmailConfig
    }
    notificationEvents: Record<string, string[]>
}

export type Bns360AutomationConfigUpdate = Partial<Bns360AutomationConfig>

export interface Bns360AutomationPrimaryClient {
    readConfig(): Promise<Bns360AutomationConfig>
    updateConfig(updates: Bns360AutomationConfigUpdate): Promise<void>
}

export interface Bns360AutomationPrimaryJourneyInput {
    tenantId: string
    client: Bns360AutomationPrimaryClient
    runId?: string
}

export interface Bns360AutomationPrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.automation-primary/v1'
    status: 'verified' | 'blocked'
    runId: string
    tenantRef: string
    generatedAt: string
    steps: Array<{
        key:
        | 'read_initial'
        | 'update_config'
        | 'read_after_update'
        | 'runtime_projection'
        | 'rollback'
        | 'read_after_rollback'
        status: 'verified' | 'blocked'
    }>
    runtime: {
        webhook: {
            enabled: boolean
            urlHost: string | null
            secretRedacted: boolean
        }
        email: {
            enabled: boolean
        }
        eventMapping: {
            orderPlaced: string[]
        }
    }
    cleanup: {
        status: 'verified' | 'failed'
        restored: boolean
    }
    error?: string
}

const DEFAULT_RUNTIME: Bns360AutomationPrimaryJourneyResult['runtime'] = {
    webhook: {
        enabled: false,
        urlHost: null,
        secretRedacted: true,
    },
    email: {
        enabled: false,
    },
    eventMapping: {
        orderPlaced: [],
    },
}

export async function runBns360AutomationPrimaryJourney(
    input: Bns360AutomationPrimaryJourneyInput
): Promise<Bns360AutomationPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-automation-${Date.now()}-${randomUUID()}`
    const targetConfig = buildTargetConfig(runId)
    const steps: Bns360AutomationPrimaryJourneyResult['steps'] = []
    const executionState = createExecutionState()
    let journeyError: string | undefined
    let cleanup = buildCleanup(false)

    try {
        await executePrimaryJourney(input.client, targetConfig, steps, executionState)
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'Automation primary journey failed'
    } finally {
        if (executionState.initialConfig) {
            const rollback = await rollbackPrimaryJourney(input.client, executionState.initialConfig, steps)
            cleanup = rollback.cleanup
            journeyError = journeyError ?? rollback.error
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.automation-primary/v1',
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
    initialConfig: Bns360AutomationConfig | null
    runtime: Bns360AutomationPrimaryJourneyResult['runtime']
}

function createExecutionState(): ExecutionState {
    return {
        initialConfig: null,
        runtime: { ...DEFAULT_RUNTIME },
    }
}

function buildTargetConfig(runId: string): Bns360AutomationConfig {
    return {
        notificationChannels: {
            webhook: {
                enabled: true,
                url: `https://bns360.example/hooks/${runId}`,
                secret: `bns360-secret-${runId}`,
            },
            email: { enabled: true },
        },
        notificationEvents: {
            'order.placed': ['webhook', 'email'],
        },
    }
}

async function executePrimaryJourney(
    client: Bns360AutomationPrimaryClient,
    targetConfig: Bns360AutomationConfig,
    steps: Bns360AutomationPrimaryJourneyResult['steps'],
    state: ExecutionState
): Promise<void> {
    const initialConfig = await client.readConfig()
    state.initialConfig = initialConfig
    steps.push({ key: 'read_initial', status: 'verified' })

    await client.updateConfig(targetConfig)
    steps.push({ key: 'update_config', status: 'verified' })

    const updatedConfig = await client.readConfig()
    steps.push({ key: 'read_after_update', status: 'verified' })

    state.runtime = projectRuntime(updatedConfig)
    assertRuntimeProjection(state.runtime)
    steps.push({ key: 'runtime_projection', status: 'verified' })
}

async function rollbackPrimaryJourney(
    client: Bns360AutomationPrimaryClient,
    initialConfig: Bns360AutomationConfig,
    steps: Bns360AutomationPrimaryJourneyResult['steps']
): Promise<{
    cleanup: Bns360AutomationPrimaryJourneyResult['cleanup']
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
    client: Bns360AutomationPrimaryClient,
    initialConfig: Bns360AutomationConfig,
    steps: Bns360AutomationPrimaryJourneyResult['steps']
): Promise<string | undefined> {
    try {
        await client.updateConfig(initialConfig)
        steps.push({ key: 'rollback', status: 'verified' })
    } catch (error) {
        steps.push({ key: 'rollback', status: 'blocked' })
        return error instanceof Error ? error.message : 'Automation rollback failed'
    }
}

async function verifyRollback(
    client: Bns360AutomationPrimaryClient,
    initialConfig: Bns360AutomationConfig,
    steps: Bns360AutomationPrimaryJourneyResult['steps']
): Promise<{
    cleanup: Bns360AutomationPrimaryJourneyResult['cleanup']
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
            error: error instanceof Error ? error.message : 'Automation rollback verification failed',
        }
    }
}

function projectRuntime(
    config: Bns360AutomationConfig
): Bns360AutomationPrimaryJourneyResult['runtime'] {
    const webhook = config.notificationChannels.webhook
    const email = config.notificationChannels.email

    return {
        webhook: {
            enabled: webhook?.enabled === true,
            urlHost: extractUrlHost(webhook?.url),
            secretRedacted: true,
        },
        email: {
            enabled: email?.enabled === true,
        },
        eventMapping: {
            orderPlaced: config.notificationEvents['order.placed'] ?? [],
        },
    }
}

function assertRuntimeProjection(runtime: Bns360AutomationPrimaryJourneyResult['runtime']): void {
    if (
        runtime.webhook.enabled !== true ||
        runtime.webhook.urlHost !== 'bns360.example' ||
        runtime.webhook.secretRedacted !== true ||
        runtime.email.enabled !== true ||
        !arraysEqual(runtime.eventMapping.orderPlaced, ['webhook', 'email'])
    ) {
        throw new Error('Automation event mapping did not reflect owner config update')
    }
}

function extractUrlHost(url: string | undefined): string | null {
    if (!url) return null
    try {
        return new URL(url).host
    } catch {
        return null
    }
}

function buildCleanup(restored: boolean): Bns360AutomationPrimaryJourneyResult['cleanup'] {
    return {
        status: restored ? 'verified' : 'failed',
        restored,
    }
}

function isConfigRestored(initial: Bns360AutomationConfig, current: Bns360AutomationConfig): boolean {
    return (
        channelsEqual(initial.notificationChannels, current.notificationChannels) &&
        eventsEqual(initial.notificationEvents, current.notificationEvents)
    )
}

function channelsEqual(
    initial: Bns360AutomationConfig['notificationChannels'],
    current: Bns360AutomationConfig['notificationChannels']
): boolean {
    return JSON.stringify(sortObject(initial)) === JSON.stringify(sortObject(current))
}

function eventsEqual(
    initial: Bns360AutomationConfig['notificationEvents'],
    current: Bns360AutomationConfig['notificationEvents']
): boolean {
    return JSON.stringify(sortObject(initial)) === JSON.stringify(sortObject(current))
}

function arraysEqual(first: string[], second: string[]): boolean {
    return first.length === second.length && first.every((value, index) => value === second[index])
}

function sortObject(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(item => sortObject(item))
    if (!value || typeof value !== 'object') return value

    return Object.fromEntries(
        Object.entries(value)
            .sort(([first], [second]) => first.localeCompare(second))
            .map(([key, item]) => [key, sortObject(item)])
    )
}
