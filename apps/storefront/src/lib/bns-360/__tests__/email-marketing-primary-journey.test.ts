import { describe, expect, it, vi } from 'vitest'

import {
    runBns360EmailMarketingPrimaryJourney,
    type Bns360EmailMarketingPrimaryClient,
    type Bns360EmailMarketingState,
} from '../email-marketing-primary-journey'

function createState(overrides: Partial<Bns360EmailMarketingState> = {}): Bns360EmailMarketingState {
    return {
        preferences: {
            exists: true,
            values: {
                send_order_confirmation: true,
                send_abandoned_cart: false,
                send_review_request: false,
                template_design: 'minimal',
            },
        },
        automation: {
            exists: true,
            values: {
                abandoned_cart_enabled: false,
                abandoned_cart_delay_hours: 3,
                review_request_enabled: false,
                review_request_delay_days: 7,
            },
        },
        limits: {
            max_email_sends_month: 1000,
        },
        ...overrides,
    }
}

function createClient(initial = createState()): Bns360EmailMarketingPrimaryClient {
    const state = { current: structuredClone(initial) }

    return {
        readState: vi.fn(async () => structuredClone(state.current)),
        updatePreferences: vi.fn(async values => {
            state.current.preferences = { exists: true, values: { ...values } }
        }),
        updateAutomation: vi.fn(async values => {
            state.current.automation = { exists: true, values: { ...values } }
        }),
        restoreState: vi.fn(async snapshot => {
            state.current.preferences = structuredClone(snapshot.preferences)
            state.current.automation = structuredClone(snapshot.automation)
        }),
    }
}

describe('runBns360EmailMarketingPrimaryJourney', () => {
    it('updates email preferences and automations, reads the limit, redacts secrets, and rolls back', async () => {
        const client = createClient()

        const result = await runBns360EmailMarketingPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.email-marketing-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                preferences: {
                    templateDesign: 'branded',
                    orderConfirmation: true,
                    abandonedCart: true,
                    reviewRequest: true,
                },
                automation: {
                    abandonedCartEnabled: true,
                    abandonedCartDelayHours: 6,
                    reviewRequestEnabled: true,
                    reviewRequestDelayDays: 14,
                },
                limits: {
                    maxEmailSendsMonth: 1000,
                },
                secretRedacted: true,
            },
            cleanup: { status: 'verified', restored: true },
        })
        expect(client.updatePreferences).toHaveBeenCalledWith({
            send_order_confirmation: true,
            send_abandoned_cart: true,
            send_review_request: true,
            template_design: 'branded',
        })
        expect(client.updateAutomation).toHaveBeenCalledWith({
            abandoned_cart_enabled: true,
            abandoned_cart_delay_hours: 6,
            review_request_enabled: true,
            review_request_delay_days: 14,
        })
        expect(client.restoreState).toHaveBeenCalledWith(createState())
        expect(JSON.stringify(result)).not.toContain('api_key')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
        expect(JSON.stringify(result)).not.toContain('secret-run')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360EmailMarketingPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360EmailMarketingPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-email-marketing-/)
        expect(second.runId).toMatch(/^bns360-email-marketing-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs cleanup in finally after runtime verification failure', async () => {
        const client = createClient()
        vi.mocked(client.readState)
            .mockResolvedValueOnce(createState())
            .mockResolvedValueOnce(createState({
                preferences: {
                    exists: true,
                    values: {
                        send_order_confirmation: true,
                        send_abandoned_cart: false,
                        send_review_request: true,
                        template_design: 'branded',
                    },
                },
            }))
            .mockResolvedValueOnce(createState())

        const result = await runBns360EmailMarketingPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.error).toContain('Email marketing runtime projection')
        expect(result.cleanup.status).toBe('verified')
        expect(result.cleanup.restored).toBe(true)
        expect(client.restoreState).toHaveBeenCalled()
    })

    it('blocks certification when cleanup cannot be proven', async () => {
        const client = createClient()
        vi.mocked(client.readState)
            .mockResolvedValueOnce(createState())
            .mockResolvedValueOnce(createState({
                preferences: {
                    exists: true,
                    values: {
                        send_order_confirmation: true,
                        send_abandoned_cart: true,
                        send_review_request: true,
                        template_design: 'branded',
                    },
                },
                automation: {
                    exists: true,
                    values: {
                        abandoned_cart_enabled: true,
                        abandoned_cart_delay_hours: 6,
                        review_request_enabled: true,
                        review_request_delay_days: 14,
                    },
                },
            }))
            .mockResolvedValueOnce(createState({
                preferences: {
                    exists: true,
                    values: {
                        send_order_confirmation: true,
                        send_abandoned_cart: true,
                        send_review_request: true,
                        template_design: 'branded',
                    },
                },
            }))

        const result = await runBns360EmailMarketingPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.restored).toBe(false)
    })
})
