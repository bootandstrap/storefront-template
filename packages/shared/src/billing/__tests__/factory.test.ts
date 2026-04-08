/**
 * @module billing/__tests__/factory
 * @description Unit tests for BillingGatewayFactory.
 *
 * Validates environment-based provider selection and fallback logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createBillingGateway } from '../factory'

describe('BillingGatewayFactory', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
        delete process.env.BILLING_PROVIDER
        delete process.env.STRIPE_SECRET_KEY
    })

    afterEach(() => {
        // Restore env
        process.env.BILLING_PROVIDER = originalEnv.BILLING_PROVIDER
        process.env.STRIPE_SECRET_KEY = originalEnv.STRIPE_SECRET_KEY
    })

    it('returns MockBillingGateway when no env vars set', () => {
        const gateway = createBillingGateway()
        expect(gateway.provider).toBe('mock')
    })

    it('returns MockBillingGateway when BILLING_PROVIDER=mock', () => {
        process.env.BILLING_PROVIDER = 'mock'
        const gateway = createBillingGateway()
        expect(gateway.provider).toBe('mock')
    })

    it('returns MockBillingGateway with explicit option', () => {
        const gateway = createBillingGateway({ provider: 'mock' })
        expect(gateway.provider).toBe('mock')
    })

    it('throws for stripe provider without TenantBillingStore', () => {
        process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
        expect(() => createBillingGateway({ provider: 'stripe' }))
            .toThrow('TenantBillingStore')
    })
})
