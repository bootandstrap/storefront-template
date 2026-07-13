import { describe, expect, it } from 'vitest'

import { runBns360POSPrimaryJourney } from '../pos-primary-journey'

function createInput(overrides: Partial<Parameters<typeof runBns360POSPrimaryJourney>[0]> = {}) {
    return {
        tenantId: 'tenant-1',
        runId: 'run-1',
        featureFlags: {
            enable_pos: true,
            enable_pos_kiosk: true,
            enable_kiosk_idle_timer: true,
            enable_kiosk_analytics: false,
            enable_kiosk_remote_management: false,
        },
        planLimits: {
            max_pos_payment_methods: 2,
        },
        businessName: 'BNS 360 POS',
        ...overrides,
    }
}

describe('runBns360POSPrimaryJourney', () => {
    it('verifies POS cart, payment method limits, virtual receipt and kiosk flags without external mutations', async () => {
        const result = await runBns360POSPrimaryJourney(createInput())

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.pos-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                cart: {
                    itemCount: 2,
                    subtotal: 2600,
                    discountAmount: 260,
                    total: 2340,
                    currencyCode: 'eur',
                },
                paymentMethods: {
                    enabledIds: ['cash', 'card_terminal'],
                    maxPaymentMethods: 2,
                },
                terminalSimulator: {
                    provider: 'stripe_terminal',
                    mode: 'simulator',
                    paymentIntentUsage: 'card_present',
                    steps: [
                        'request_connection_grant',
                        'discover_reader',
                        'collect_payment_method',
                        'process_payment',
                        'refund_boundary',
                    ],
                    liveMutation: false,
                    hardwareRequired: false,
                },
                virtualPrinter: {
                    printerId: 'thermal-80mm',
                    jobs: [
                        { type: 'sale_receipt' },
                        { type: 'cash_drawer' },
                    ],
                },
                kiosk: {
                    available: true,
                    idleTimer: true,
                    analytics: false,
                    remoteManagement: false,
                },
            },
            cleanup: { status: 'verified', restored: true },
            residue: { zero: true },
        })
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
        expect(JSON.stringify(result)).not.toContain('secret')
        expect(JSON.stringify(result)).not.toContain('client_secret')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360POSPrimaryJourney(createInput({ runId: undefined }))
        const second = await runBns360POSPrimaryJourney(createInput({ runId: undefined }))

        expect(first.runId).toMatch(/^bns360-pos-/)
        expect(second.runId).toMatch(/^bns360-pos-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('blocks certification when POS is not materialized for the tenant', async () => {
        const result = await runBns360POSPrimaryJourney(createInput({
            featureFlags: {
                enable_pos: false,
                enable_pos_kiosk: true,
                enable_kiosk_idle_timer: true,
                enable_kiosk_analytics: false,
                enable_kiosk_remote_management: false,
            },
        }))

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('verified')
        expect(result.residue.zero).toBe(true)
        expect(result.error).toContain('enable_pos')
    })
})
