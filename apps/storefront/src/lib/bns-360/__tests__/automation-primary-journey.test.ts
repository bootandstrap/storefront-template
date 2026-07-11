import { describe, expect, it, vi } from 'vitest'

import {
    runBns360AutomationPrimaryJourney,
    type Bns360AutomationConfig,
    type Bns360AutomationPrimaryClient,
} from '../automation-primary-journey'

function createConfig(overrides: Partial<Bns360AutomationConfig> = {}): Bns360AutomationConfig {
    return {
        notificationChannels: {
            webhook: { enabled: false, url: '', secret: '' },
            email: { enabled: true },
        },
        notificationEvents: {
            'order.placed': ['email'],
        },
        ...overrides,
    }
}

function createClient(): Bns360AutomationPrimaryClient {
    const state = { current: createConfig() }

    return {
        readConfig: vi.fn(async () => structuredClone(state.current)),
        updateConfig: vi.fn(async updates => {
            state.current = {
                notificationChannels: updates.notificationChannels ?? state.current.notificationChannels,
                notificationEvents: updates.notificationEvents ?? state.current.notificationEvents,
            }
        }),
    }
}

describe('runBns360AutomationPrimaryJourney', () => {
    it('updates notification channels and event mapping, redacts secrets, and rolls back', async () => {
        const client = createClient()

        const result = await runBns360AutomationPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.automation-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                webhook: {
                    enabled: true,
                    urlHost: 'bns360.example',
                    secretRedacted: true,
                },
                email: { enabled: true },
                eventMapping: {
                    orderPlaced: ['webhook', 'email'],
                },
            },
            cleanup: { status: 'verified', restored: true },
        })
        expect(client.updateConfig).toHaveBeenCalledWith({
            notificationChannels: {
                webhook: {
                    enabled: true,
                    url: 'https://bns360.example/hooks/run-1',
                    secret: 'bns360-secret-run-1',
                },
                email: { enabled: true },
            },
            notificationEvents: {
                'order.placed': ['webhook', 'email'],
            },
        })
        expect(client.updateConfig).toHaveBeenLastCalledWith(createConfig())
        expect(JSON.stringify(result)).not.toContain('bns360-secret-run-1')
        expect(JSON.stringify(result)).not.toContain('/hooks/run-1')
        expect(JSON.stringify(result)).not.toContain('token')
        expect(JSON.stringify(result)).not.toContain('password')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360AutomationPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360AutomationPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-automation-/)
        expect(second.runId).toMatch(/^bns360-automation-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs rollback in finally after mapping verification failure', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                notificationChannels: {
                    webhook: { enabled: true, url: 'https://bns360.example/hooks/run-1', secret: 'bns360-secret-run-1' },
                    email: { enabled: true },
                },
                notificationEvents: {
                    'order.placed': ['email'],
                },
            }))
            .mockResolvedValueOnce(createConfig())

        const result = await runBns360AutomationPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.error).toContain('Automation event mapping')
        expect(result.cleanup.status).toBe('verified')
        expect(result.cleanup.restored).toBe(true)
        expect(client.updateConfig).toHaveBeenLastCalledWith(createConfig())
    })

    it('blocks certification when rollback cannot be proven', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                notificationChannels: {
                    webhook: { enabled: true, url: 'https://bns360.example/hooks/run-1', secret: 'bns360-secret-run-1' },
                    email: { enabled: true },
                },
                notificationEvents: {
                    'order.placed': ['webhook', 'email'],
                },
            }))
            .mockResolvedValueOnce(createConfig({
                notificationEvents: {
                    'order.placed': ['webhook'],
                },
            }))

        const result = await runBns360AutomationPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.restored).toBe(false)
    })
})
