import { describe, expect, it } from 'vitest'
import { isModuleActive } from '../ModuleGate'

describe('isModuleActive', () => {
    it('respects core invariant feature flags', () => {
        const featureFlags = {
            enable_customer_accounts: false,
            enable_order_tracking: false,
            enable_pos: true,
        }

        expect(isModuleActive(featureFlags, 'auth_advanced', 'enable_customer_accounts')).toBe(true)
        expect(isModuleActive(featureFlags, 'ecommerce', 'enable_order_tracking')).toBe(true)
    })

    it('continues to gate optional modules from governance flags', () => {
        const featureFlags = {
            enable_pos: true,
            enable_crm: false,
        }

        expect(isModuleActive(featureFlags, 'pos')).toBe(true)
        expect(isModuleActive(featureFlags, 'crm')).toBe(false)
    })
})
