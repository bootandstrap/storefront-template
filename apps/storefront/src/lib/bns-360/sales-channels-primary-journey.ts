import { randomUUID } from 'node:crypto'

import type { FeatureFlags, PlanLimits } from '@/lib/config'
import { getEnabledMethods } from '@/lib/payment-methods'

export type Bns360SalesPreferredContact = 'whatsapp' | 'phone' | 'email'
export type Bns360SalesBusinessHoursDisplay = 'not_shown' | 'weekdays' | 'full_week' | 'custom'

export interface Bns360SalesChannelsConfig {
    salesWhatsappGreeting: string | null
    salesPreferredContact: Bns360SalesPreferredContact | string | null
    salesBusinessHoursDisplay: Bns360SalesBusinessHoursDisplay | string | null
    salesHighlightFreeShipping: boolean
    featureFlags: Pick<
        FeatureFlags,
        | 'enable_whatsapp_checkout'
        | 'enable_online_payments'
        | 'enable_cash_on_delivery'
        | 'enable_bank_transfer'
    >
    planLimits: Pick<PlanLimits, 'max_payment_methods'>
}

export type Bns360SalesChannelsConfigUpdate = Pick<
    Bns360SalesChannelsConfig,
    | 'salesWhatsappGreeting'
    | 'salesPreferredContact'
    | 'salesBusinessHoursDisplay'
    | 'salesHighlightFreeShipping'
>

export interface Bns360SalesChannelsPrimaryClient {
    readConfig(): Promise<Bns360SalesChannelsConfig>
    updateConfig(updates: Bns360SalesChannelsConfigUpdate): Promise<void>
}

export interface Bns360SalesChannelsPrimaryJourneyInput {
    tenantId: string
    client: Bns360SalesChannelsPrimaryClient
    runId?: string
}

export interface Bns360SalesChannelsPrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.sales-channels-primary/v1'
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
        paymentMethods: {
            enabledIds: string[]
            maxPaymentMethods: number
        }
        channelConfig: {
            preferredContact: string
            businessHoursDisplay: string
            highlightFreeShipping: boolean
            whatsappGreetingRedacted: boolean
        }
    }
    cleanup: {
        status: 'verified' | 'failed'
        restored: boolean
    }
    error?: string
}

const DEFAULT_RUNTIME: Bns360SalesChannelsPrimaryJourneyResult['runtime'] = {
    paymentMethods: {
        enabledIds: [],
        maxPaymentMethods: 0,
    },
    channelConfig: {
        preferredContact: '',
        businessHoursDisplay: '',
        highlightFreeShipping: false,
        whatsappGreetingRedacted: true,
    },
}

export async function runBns360SalesChannelsPrimaryJourney(
    input: Bns360SalesChannelsPrimaryJourneyInput
): Promise<Bns360SalesChannelsPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-sales-channels-${Date.now()}-${randomUUID()}`
    const targetConfig = buildTargetConfig(runId)
    const steps: Bns360SalesChannelsPrimaryJourneyResult['steps'] = []
    let initialConfig: Bns360SalesChannelsConfig | null = null
    let runtime = structuredClone(DEFAULT_RUNTIME)
    let journeyError: string | undefined
    let cleanupStatus: Bns360SalesChannelsPrimaryJourneyResult['cleanup']['status'] = 'failed'
    let restored = false

    try {
        initialConfig = await input.client.readConfig()
        steps.push({ key: 'read_initial', status: 'verified' })

        await input.client.updateConfig(targetConfig)
        steps.push({ key: 'update_config', status: 'verified' })

        const updatedConfig = await input.client.readConfig()
        steps.push({ key: 'read_after_update', status: 'verified' })

        runtime = projectRuntime(updatedConfig)
        assertRuntimeProjection(runtime)
        steps.push({ key: 'runtime_projection', status: 'verified' })
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'Sales channels primary journey failed'
    } finally {
        if (initialConfig) {
            const initialEditable = toEditableConfig(initialConfig)
            try {
                await input.client.updateConfig(initialEditable)
                steps.push({ key: 'rollback', status: 'verified' })
            } catch (error) {
                journeyError = journeyError ?? (error instanceof Error ? error.message : 'Sales channels rollback failed')
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
                    error instanceof Error ? error.message : 'Sales channels rollback verification failed'
                )
            }
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.sales-channels-primary/v1',
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

function buildTargetConfig(runId: string): Bns360SalesChannelsConfigUpdate {
    return {
        salesWhatsappGreeting: `BNS360 sales channel ${runId}`,
        salesPreferredContact: 'email',
        salesBusinessHoursDisplay: 'weekdays',
        salesHighlightFreeShipping: true,
    }
}

function toEditableConfig(config: Bns360SalesChannelsConfig): Bns360SalesChannelsConfigUpdate {
    return {
        salesWhatsappGreeting: config.salesWhatsappGreeting,
        salesPreferredContact: config.salesPreferredContact,
        salesBusinessHoursDisplay: config.salesBusinessHoursDisplay,
        salesHighlightFreeShipping: config.salesHighlightFreeShipping,
    }
}

function projectRuntime(
    config: Bns360SalesChannelsConfig
): Bns360SalesChannelsPrimaryJourneyResult['runtime'] {
    const methods = getEnabledMethods(
        config.featureFlags as FeatureFlags,
        config.planLimits as PlanLimits
    )

    return {
        paymentMethods: {
            enabledIds: methods.map(method => method.id),
            maxPaymentMethods: config.planLimits.max_payment_methods ?? 0,
        },
        channelConfig: {
            preferredContact: config.salesPreferredContact ?? '',
            businessHoursDisplay: config.salesBusinessHoursDisplay ?? '',
            highlightFreeShipping: config.salesHighlightFreeShipping === true,
            whatsappGreetingRedacted: true,
        },
    }
}

function assertRuntimeProjection(runtime: Bns360SalesChannelsPrimaryJourneyResult['runtime']): void {
    if (
        runtime.paymentMethods.enabledIds.length === 0 ||
        runtime.channelConfig.preferredContact !== 'email' ||
        runtime.channelConfig.businessHoursDisplay !== 'weekdays' ||
        runtime.channelConfig.highlightFreeShipping !== true ||
        runtime.channelConfig.whatsappGreetingRedacted !== true
    ) {
        throw new Error('Sales channel payment methods or config did not reflect owner update')
    }
}

function isConfigRestored(initial: Bns360SalesChannelsConfig, current: Bns360SalesChannelsConfig): boolean {
    return (
        initial.salesWhatsappGreeting === current.salesWhatsappGreeting &&
        initial.salesPreferredContact === current.salesPreferredContact &&
        initial.salesBusinessHoursDisplay === current.salesBusinessHoursDisplay &&
        initial.salesHighlightFreeShipping === current.salesHighlightFreeShipping
    )
}
