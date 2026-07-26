import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppConfig, FeatureFlags } from '@/lib/config'

const mockGetConfig = vi.fn()

vi.mock('@/lib/config', () => ({
    getConfig: mockGetConfig,
}))

const featureFlags = {
    enable_customer_accounts: false,
    enable_order_tracking: false,
    enable_promotions: false,
} as unknown as FeatureFlags

describe('policy-engine feature flag invariants', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetConfig.mockResolvedValue({
            featureFlags,
            planLimits: {},
            _degraded: false,
        } as AppConfig)
    })

    it('allows core invariant flags even when governance data contains false', async () => {
        const { requireFlag } = await import('@/lib/policy-engine')

        await expect(requireFlag('enable_customer_accounts')).resolves.toBeUndefined()
        await expect(requireFlag('enable_order_tracking')).resolves.toBeUndefined()
    })

    it('continues to deny disabled optional flags', async () => {
        const { requireFlag, PolicyError } = await import('@/lib/policy-engine')

        await expect(requireFlag('enable_promotions')).rejects.toBeInstanceOf(PolicyError)
    })
})
