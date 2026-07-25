import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetConfig = vi.fn()
const mockSetProvider = vi.fn()
const mockGetClient = vi.fn()

vi.mock('@/lib/config', () => ({
    getConfig: mockGetConfig,
}))

vi.mock('@openfeature/server-sdk', () => ({
    ErrorCode: { GENERAL: 'GENERAL' },
    OpenFeature: {
        setProvider: mockSetProvider,
        getClient: mockGetClient,
    },
}))

describe('BootandStrapProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockGetConfig.mockResolvedValue({
            featureFlags: { enable_crm: true },
            planLimits: { max_products: 100 },
            config: { default_currency: 'eur' },
        })
    })

    it('resolves governance-backed flags, limits, config and objects', async () => {
        const { BootandStrapProvider } = await import('../provider')
        const provider = new BootandStrapProvider()

        await expect(provider.resolveBooleanEvaluation('enable_crm', false, {}))
            .resolves.toMatchObject({ value: true, reason: 'TARGETING_MATCH', variant: 'enabled' })
        await expect(provider.resolveNumberEvaluation('max_products', 0, {}))
            .resolves.toMatchObject({ value: 100, reason: 'TARGETING_MATCH' })
        await expect(provider.resolveStringEvaluation('default_currency', 'usd', {}))
            .resolves.toMatchObject({ value: 'eur', reason: 'TARGETING_MATCH' })
        await expect(provider.resolveObjectEvaluation('feature_flags', {}, {}))
            .resolves.toMatchObject({ value: { enable_crm: true }, reason: 'TARGETING_MATCH' })
    })

    it('falls back to defaults with error details when governance config fails', async () => {
        mockGetConfig.mockRejectedValueOnce(new Error('config unavailable'))
        const { BootandStrapProvider } = await import('../provider')
        const provider = new BootandStrapProvider()

        await expect(provider.resolveBooleanEvaluation('enable_crm', false, {}))
            .resolves.toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: 'GENERAL',
            })
    })
})

describe('OpenFeature index helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockGetClient.mockReturnValue({
            getBooleanValue: vi.fn(async () => true),
            getNumberValue: vi.fn(async () => 10),
            getStringValue: vi.fn(async () => 'eur'),
        })
    })

    it('initializes provider once and proxies typed helper calls to the OpenFeature client', async () => {
        const { getConfigValue, getFeatureClient, getLimit, initOpenFeature, isFeatureEnabled } = await import('../index')

        initOpenFeature()
        initOpenFeature()
        expect(mockSetProvider).toHaveBeenCalledTimes(1)

        expect(getFeatureClient()).toBe(mockGetClient.mock.results[0].value)
        await expect(isFeatureEnabled('enable_crm')).resolves.toBe(true)
        await expect(getLimit('max_products', 0)).resolves.toBe(10)
        await expect(getConfigValue('default_currency', 'usd')).resolves.toBe('eur')
    })
})
