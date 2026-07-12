import { describe, expect, it, vi } from 'vitest'

import {
    runBns360SalesChannelsPrimaryJourney,
    type Bns360SalesChannelsConfig,
    type Bns360SalesChannelsPrimaryClient,
} from '../sales-channels-primary-journey'

function createConfig(overrides: Partial<Bns360SalesChannelsConfig> = {}): Bns360SalesChannelsConfig {
    return {
        salesWhatsappGreeting: 'Hola',
        salesPreferredContact: 'whatsapp',
        salesBusinessHoursDisplay: 'not_shown',
        salesHighlightFreeShipping: false,
        featureFlags: {
            enable_whatsapp_checkout: true,
            enable_online_payments: true,
            enable_cash_on_delivery: true,
            enable_bank_transfer: false,
        },
        planLimits: {
            max_payment_methods: 3,
        },
        ...overrides,
    }
}

function createClient(initial = createConfig()): Bns360SalesChannelsPrimaryClient {
    const state = { current: structuredClone(initial) }

    return {
        readConfig: vi.fn(async () => structuredClone(state.current)),
        updateConfig: vi.fn(async updates => {
            state.current = {
                ...state.current,
                ...updates,
            }
        }),
    }
}

describe('runBns360SalesChannelsPrimaryJourney', () => {
    it('updates sales channel config, observes payment methods, redacts greeting, and rolls back', async () => {
        const client = createClient()

        const result = await runBns360SalesChannelsPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.sales-channels-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                paymentMethods: {
                    enabledIds: ['whatsapp', 'card', 'cod'],
                    maxPaymentMethods: 3,
                },
                channelConfig: {
                    preferredContact: 'email',
                    businessHoursDisplay: 'weekdays',
                    highlightFreeShipping: true,
                    whatsappGreetingRedacted: true,
                },
            },
            cleanup: { status: 'verified', restored: true },
        })
        expect(client.updateConfig).toHaveBeenCalledWith({
            salesWhatsappGreeting: 'BNS360 sales channel run-1',
            salesPreferredContact: 'email',
            salesBusinessHoursDisplay: 'weekdays',
            salesHighlightFreeShipping: true,
        })
        expect(client.updateConfig).toHaveBeenLastCalledWith({
            salesWhatsappGreeting: 'Hola',
            salesPreferredContact: 'whatsapp',
            salesBusinessHoursDisplay: 'not_shown',
            salesHighlightFreeShipping: false,
        })
        expect(JSON.stringify(result)).not.toContain('BNS360 sales channel run-1')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360SalesChannelsPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360SalesChannelsPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-sales-channels-/)
        expect(second.runId).toMatch(/^bns360-sales-channels-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs rollback in finally after runtime projection failure', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                salesPreferredContact: 'email',
                salesBusinessHoursDisplay: 'weekdays',
                salesHighlightFreeShipping: true,
                featureFlags: {
                    enable_whatsapp_checkout: false,
                    enable_online_payments: false,
                    enable_cash_on_delivery: false,
                    enable_bank_transfer: false,
                },
            }))
            .mockResolvedValueOnce(createConfig())

        const result = await runBns360SalesChannelsPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.error).toContain('Sales channel payment methods')
        expect(result.cleanup.status).toBe('verified')
        expect(result.cleanup.restored).toBe(true)
        expect(client.updateConfig).toHaveBeenLastCalledWith({
            salesWhatsappGreeting: 'Hola',
            salesPreferredContact: 'whatsapp',
            salesBusinessHoursDisplay: 'not_shown',
            salesHighlightFreeShipping: false,
        })
    })

    it('blocks certification when rollback cannot be proven', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                salesPreferredContact: 'email',
                salesBusinessHoursDisplay: 'weekdays',
                salesHighlightFreeShipping: true,
            }))
            .mockResolvedValueOnce(createConfig({
                salesPreferredContact: 'email',
            }))

        const result = await runBns360SalesChannelsPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.restored).toBe(false)
    })
})
