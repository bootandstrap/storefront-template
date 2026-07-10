import { randomUUID } from 'node:crypto'

export interface Bns360ChatbotConfig {
    chatbotName: string | null
    chatbotWelcomeMessage: string | null
    chatbotAutoOpenDelay: number | null
    chatbotTone: string | null
    chatbotKnowledgeScope: string | null
    maxChatbotMessagesMonth: number | null
}

export type Bns360ChatbotConfigUpdate = Partial<Pick<
    Bns360ChatbotConfig,
    'chatbotName' | 'chatbotWelcomeMessage' | 'chatbotAutoOpenDelay'
>>

export interface Bns360ChatbotPrimaryClient {
    readConfig(): Promise<Bns360ChatbotConfig>
    updateConfig(updates: Bns360ChatbotConfigUpdate): Promise<void>
}

export interface Bns360ChatbotPrimaryJourneyInput {
    tenantId: string
    client: Bns360ChatbotPrimaryClient
    runId?: string
}

export interface Bns360ChatbotPrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.chatbot-primary/v1'
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
        chatbotName: string
        welcomeMessage: string
        autoOpenDelay: number
    }
    usage: {
        limit: number | null
    }
    cleanup: {
        status: 'verified' | 'failed'
        restored: boolean
    }
    error?: string
}

const DEFAULT_RUNTIME = {
    chatbotName: '',
    welcomeMessage: '',
    autoOpenDelay: 0,
}

export async function runBns360ChatbotPrimaryJourney(
    input: Bns360ChatbotPrimaryJourneyInput
): Promise<Bns360ChatbotPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-chatbot-${Date.now()}-${randomUUID()}`
    const steps: Bns360ChatbotPrimaryJourneyResult['steps'] = []
    let initialConfig: Bns360ChatbotConfig | null = null
    let runtime = { ...DEFAULT_RUNTIME }
    let usageLimit: number | null = null
    let journeyError: string | undefined
    let cleanupStatus: Bns360ChatbotPrimaryJourneyResult['cleanup']['status'] = 'failed'
    let restored = false

    try {
        initialConfig = await input.client.readConfig()
        usageLimit = initialConfig.maxChatbotMessagesMonth
        steps.push({ key: 'read_initial', status: 'verified' })

        await input.client.updateConfig({
            chatbotName: `BNS360 ${runId}`,
            chatbotWelcomeMessage: `BNS360 welcome ${runId}`,
            chatbotAutoOpenDelay: 0,
        })
        steps.push({ key: 'update_config', status: 'verified' })

        const updatedConfig = await input.client.readConfig()
        usageLimit = updatedConfig.maxChatbotMessagesMonth
        steps.push({ key: 'read_after_update', status: 'verified' })

        runtime = projectRuntime(updatedConfig)
        if (
            runtime.chatbotName !== `BNS360 ${runId}` ||
            runtime.welcomeMessage !== `BNS360 welcome ${runId}` ||
            runtime.autoOpenDelay !== 0
        ) {
            throw new Error('Chatbot runtime projection did not reflect owner config update')
        }
        steps.push({ key: 'runtime_projection', status: 'verified' })
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'Chatbot primary journey failed'
    } finally {
        if (initialConfig) {
            try {
                await input.client.updateConfig({
                    chatbotName: initialConfig.chatbotName,
                    chatbotWelcomeMessage: initialConfig.chatbotWelcomeMessage,
                    chatbotAutoOpenDelay: initialConfig.chatbotAutoOpenDelay,
                })
                steps.push({ key: 'rollback', status: 'verified' })
            } catch (error) {
                journeyError = journeyError ?? (error instanceof Error ? error.message : 'Chatbot rollback failed')
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
                    error instanceof Error ? error.message : 'Chatbot rollback verification failed'
                )
            }
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.chatbot-primary/v1',
        status: !journeyError && cleanupStatus === 'verified' && restored ? 'verified' : 'blocked',
        runId,
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        steps,
        runtime,
        usage: {
            limit: usageLimit,
        },
        cleanup: {
            status: cleanupStatus,
            restored,
        },
        ...(journeyError ? { error: journeyError } : {}),
    }
}

function projectRuntime(config: Bns360ChatbotConfig): Bns360ChatbotPrimaryJourneyResult['runtime'] {
    return {
        chatbotName: config.chatbotName ?? '',
        welcomeMessage: config.chatbotWelcomeMessage ?? '',
        autoOpenDelay: config.chatbotAutoOpenDelay ?? 0,
    }
}

function isConfigRestored(initial: Bns360ChatbotConfig, current: Bns360ChatbotConfig): boolean {
    return (
        initial.chatbotName === current.chatbotName &&
        initial.chatbotWelcomeMessage === current.chatbotWelcomeMessage &&
        initial.chatbotAutoOpenDelay === current.chatbotAutoOpenDelay
    )
}
