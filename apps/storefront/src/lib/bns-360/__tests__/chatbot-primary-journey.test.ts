import { describe, expect, it, vi } from 'vitest'

import {
    runBns360ChatbotPrimaryJourney,
    type Bns360ChatbotConfig,
    type Bns360ChatbotPrimaryClient,
} from '../chatbot-primary-journey'

function createConfig(overrides: Partial<Bns360ChatbotConfig> = {}): Bns360ChatbotConfig {
    return {
        chatbotName: 'Original Assistant',
        chatbotWelcomeMessage: 'Original welcome',
        chatbotAutoOpenDelay: 0,
        chatbotTone: 'helpful',
        chatbotKnowledgeScope: 'catalog',
        maxChatbotMessagesMonth: 250,
        ...overrides,
    }
}

function createClient(): Bns360ChatbotPrimaryClient {
    const state = { current: createConfig() }

    return {
        readConfig: vi.fn(async () => ({ ...state.current })),
        updateConfig: vi.fn(async updates => {
            state.current = { ...state.current, ...updates }
        }),
    }
}

describe('runBns360ChatbotPrimaryJourney', () => {
    it('updates chatbot runtime config, verifies limit projection, and rolls back exactly', async () => {
        const client = createClient()

        const result = await runBns360ChatbotPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.chatbot-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            usage: { limit: 250 },
            cleanup: { status: 'verified', restored: true },
        })
        expect(client.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
            chatbotName: expect.stringContaining('run-1'),
            chatbotWelcomeMessage: expect.stringContaining('run-1'),
            chatbotAutoOpenDelay: 0,
        }))
        expect(client.updateConfig).toHaveBeenLastCalledWith(expect.objectContaining({
            chatbotName: 'Original Assistant',
            chatbotWelcomeMessage: 'Original welcome',
            chatbotAutoOpenDelay: 0,
        }))
        expect(result.runtime.chatbotName).toContain('run-1')
        expect(result.runtime.welcomeMessage).toContain('run-1')
        expect(JSON.stringify(result)).not.toContain('Original welcome')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360ChatbotPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360ChatbotPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-chatbot-/)
        expect(second.runId).toMatch(/^bns360-chatbot-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs rollback in finally after an intermediate failure', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockRejectedValueOnce(new Error('runtime projection failed'))
            .mockResolvedValueOnce(createConfig())

        const result = await runBns360ChatbotPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('verified')
        expect(result.cleanup.restored).toBe(true)
        expect(client.updateConfig).toHaveBeenLastCalledWith(expect.objectContaining({
            chatbotName: 'Original Assistant',
        }))
    })

    it('blocks certification when rollback cannot be proven', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                chatbotName: 'BNS360 run-1',
                chatbotWelcomeMessage: 'BNS360 welcome run-1',
            }))
            .mockResolvedValueOnce(createConfig({ chatbotName: 'still mutated' }))

        const result = await runBns360ChatbotPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.restored).toBe(false)
    })
})
