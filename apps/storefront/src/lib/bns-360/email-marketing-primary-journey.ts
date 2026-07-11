import { randomUUID } from 'node:crypto'

export interface Bns360EmailPreferences {
    send_order_confirmation: boolean
    send_abandoned_cart: boolean
    send_review_request: boolean
    template_design: string
}

export interface Bns360EmailAutomationConfig {
    abandoned_cart_enabled: boolean
    abandoned_cart_delay_hours: number
    review_request_enabled: boolean
    review_request_delay_days: number
}

export interface Bns360EmailMarketingState {
    preferences: {
        exists: boolean
        values: Bns360EmailPreferences
    }
    automation: {
        exists: boolean
        values: Bns360EmailAutomationConfig
    }
    limits: {
        max_email_sends_month: number
    }
}

export interface Bns360EmailMarketingPrimaryClient {
    readState(): Promise<Bns360EmailMarketingState>
    updatePreferences(values: Bns360EmailPreferences): Promise<void>
    updateAutomation(values: Bns360EmailAutomationConfig): Promise<void>
    restoreState(snapshot: Bns360EmailMarketingState): Promise<void>
}

export interface Bns360EmailMarketingPrimaryJourneyInput {
    tenantId: string
    client: Bns360EmailMarketingPrimaryClient
    runId?: string
}

export interface Bns360EmailMarketingPrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.email-marketing-primary/v1'
    status: 'verified' | 'blocked'
    runId: string
    tenantRef: string
    generatedAt: string
    steps: Array<{
        key:
        | 'read_initial'
        | 'update_preferences'
        | 'update_automation'
        | 'read_after_update'
        | 'runtime_projection'
        | 'rollback'
        | 'read_after_rollback'
        status: 'verified' | 'blocked'
    }>
    runtime: {
        preferences: {
            templateDesign: string
            orderConfirmation: boolean
            abandonedCart: boolean
            reviewRequest: boolean
        }
        automation: {
            abandonedCartEnabled: boolean
            abandonedCartDelayHours: number
            reviewRequestEnabled: boolean
            reviewRequestDelayDays: number
        }
        limits: {
            maxEmailSendsMonth: number
        }
        secretRedacted: boolean
    }
    cleanup: {
        status: 'verified' | 'failed'
        restored: boolean
    }
    error?: string
}

const DEFAULT_RUNTIME: Bns360EmailMarketingPrimaryJourneyResult['runtime'] = {
    preferences: {
        templateDesign: '',
        orderConfirmation: false,
        abandonedCart: false,
        reviewRequest: false,
    },
    automation: {
        abandonedCartEnabled: false,
        abandonedCartDelayHours: 0,
        reviewRequestEnabled: false,
        reviewRequestDelayDays: 0,
    },
    limits: {
        maxEmailSendsMonth: 0,
    },
    secretRedacted: true,
}

const TARGET_PREFERENCES: Bns360EmailPreferences = {
    send_order_confirmation: true,
    send_abandoned_cart: true,
    send_review_request: true,
    template_design: 'branded',
}

const TARGET_AUTOMATION: Bns360EmailAutomationConfig = {
    abandoned_cart_enabled: true,
    abandoned_cart_delay_hours: 6,
    review_request_enabled: true,
    review_request_delay_days: 14,
}

export async function runBns360EmailMarketingPrimaryJourney(
    input: Bns360EmailMarketingPrimaryJourneyInput
): Promise<Bns360EmailMarketingPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-email-marketing-${Date.now()}-${randomUUID()}`
    const steps: Bns360EmailMarketingPrimaryJourneyResult['steps'] = []
    const executionState = createExecutionState()
    let journeyError: string | undefined
    let cleanup = buildCleanup(false)

    try {
        await executePrimaryJourney(input.client, steps, executionState)
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'Email marketing primary journey failed'
    } finally {
        if (executionState.initialState) {
            const rollback = await rollbackPrimaryJourney(input.client, executionState.initialState, steps)
            cleanup = rollback.cleanup
            journeyError = journeyError ?? rollback.error
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.email-marketing-primary/v1',
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
    initialState: Bns360EmailMarketingState | null
    runtime: Bns360EmailMarketingPrimaryJourneyResult['runtime']
}

function createExecutionState(): ExecutionState {
    return {
        initialState: null,
        runtime: { ...DEFAULT_RUNTIME },
    }
}

async function executePrimaryJourney(
    client: Bns360EmailMarketingPrimaryClient,
    steps: Bns360EmailMarketingPrimaryJourneyResult['steps'],
    state: ExecutionState
): Promise<void> {
    const initialState = await client.readState()
    state.initialState = initialState
    steps.push({ key: 'read_initial', status: 'verified' })

    await client.updatePreferences(TARGET_PREFERENCES)
    steps.push({ key: 'update_preferences', status: 'verified' })

    await client.updateAutomation(TARGET_AUTOMATION)
    steps.push({ key: 'update_automation', status: 'verified' })

    const updatedState = await client.readState()
    steps.push({ key: 'read_after_update', status: 'verified' })

    state.runtime = projectRuntime(updatedState)
    assertRuntimeProjection(state.runtime)
    steps.push({ key: 'runtime_projection', status: 'verified' })
}

async function rollbackPrimaryJourney(
    client: Bns360EmailMarketingPrimaryClient,
    initialState: Bns360EmailMarketingState,
    steps: Bns360EmailMarketingPrimaryJourneyResult['steps']
): Promise<{
    cleanup: Bns360EmailMarketingPrimaryJourneyResult['cleanup']
    error?: string
}> {
    const rollbackError = await restoreInitialState(client, initialState, steps)
    const verification = await verifyRollback(client, initialState, steps)

    return {
        cleanup: verification.cleanup,
        error: rollbackError ?? verification.error,
    }
}

async function restoreInitialState(
    client: Bns360EmailMarketingPrimaryClient,
    initialState: Bns360EmailMarketingState,
    steps: Bns360EmailMarketingPrimaryJourneyResult['steps']
): Promise<string | undefined> {
    try {
        await client.restoreState(initialState)
        steps.push({ key: 'rollback', status: 'verified' })
    } catch (error) {
        steps.push({ key: 'rollback', status: 'blocked' })
        return error instanceof Error ? error.message : 'Email marketing rollback failed'
    }
}

async function verifyRollback(
    client: Bns360EmailMarketingPrimaryClient,
    initialState: Bns360EmailMarketingState,
    steps: Bns360EmailMarketingPrimaryJourneyResult['steps']
): Promise<{
    cleanup: Bns360EmailMarketingPrimaryJourneyResult['cleanup']
    error?: string
}> {
    try {
        const rollbackState = await client.readState()
        const restored = isStateRestored(initialState, rollbackState)
        steps.push({
            key: 'read_after_rollback',
            status: restored ? 'verified' : 'blocked',
        })
        return { cleanup: buildCleanup(restored) }
    } catch (error) {
        return {
            cleanup: buildCleanup(false),
            error: error instanceof Error ? error.message : 'Email marketing rollback verification failed',
        }
    }
}

function projectRuntime(
    state: Bns360EmailMarketingState
): Bns360EmailMarketingPrimaryJourneyResult['runtime'] {
    return {
        preferences: {
            templateDesign: state.preferences.values.template_design,
            orderConfirmation: state.preferences.values.send_order_confirmation,
            abandonedCart: state.preferences.values.send_abandoned_cart,
            reviewRequest: state.preferences.values.send_review_request,
        },
        automation: {
            abandonedCartEnabled: state.automation.values.abandoned_cart_enabled,
            abandonedCartDelayHours: state.automation.values.abandoned_cart_delay_hours,
            reviewRequestEnabled: state.automation.values.review_request_enabled,
            reviewRequestDelayDays: state.automation.values.review_request_delay_days,
        },
        limits: {
            maxEmailSendsMonth: state.limits.max_email_sends_month,
        },
        secretRedacted: true,
    }
}

function assertRuntimeProjection(runtime: Bns360EmailMarketingPrimaryJourneyResult['runtime']): void {
    if (
        runtime.preferences.templateDesign !== 'branded' ||
        runtime.preferences.orderConfirmation !== true ||
        runtime.preferences.abandonedCart !== true ||
        runtime.preferences.reviewRequest !== true ||
        runtime.automation.abandonedCartEnabled !== true ||
        runtime.automation.abandonedCartDelayHours !== 6 ||
        runtime.automation.reviewRequestEnabled !== true ||
        runtime.automation.reviewRequestDelayDays !== 14 ||
        runtime.limits.maxEmailSendsMonth <= 0 ||
        runtime.secretRedacted !== true
    ) {
        throw new Error('Email marketing runtime projection did not reflect owner config update')
    }
}

function buildCleanup(restored: boolean): Bns360EmailMarketingPrimaryJourneyResult['cleanup'] {
    return {
        status: restored ? 'verified' : 'failed',
        restored,
    }
}

function isStateRestored(initial: Bns360EmailMarketingState, current: Bns360EmailMarketingState): boolean {
    return (
        JSON.stringify(sortObject(initial.preferences)) === JSON.stringify(sortObject(current.preferences)) &&
        JSON.stringify(sortObject(initial.automation)) === JSON.stringify(sortObject(current.automation))
    )
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
