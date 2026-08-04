import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePanelAuth: vi.fn(),
  getConfigForTenant: vi.fn(),
  isFeatureEnabled: vi.fn(),
  checkLimit: vi.fn(),
}))

vi.mock('@/lib/panel-auth', () => ({ requirePanelAuth: mocks.requirePanelAuth }))
vi.mock('@/lib/config', () => ({ getConfigForTenant: mocks.getConfigForTenant }))
vi.mock('@/lib/features', () => ({ isFeatureEnabled: mocks.isFeatureEnabled }))
vi.mock('@/lib/limits', () => ({ checkLimit: mocks.checkLimit }))

import { withPanelGuard } from '../panel-guard'

const auth = {
  tenantId: 'tenant-panel-1',
  role: 'owner',
  user: { id: 'user-1', email: 'owner@example.test' },
  supabase: { from: vi.fn() },
}
const appConfig = {
  featureFlags: { enable_reviews: true },
  planLimits: { max_products: 10 },
  config: {},
}

describe('withPanelGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePanelAuth.mockResolvedValue(auth)
    mocks.getConfigForTenant.mockResolvedValue(appConfig)
    mocks.isFeatureEnabled.mockReturnValue(true)
    mocks.checkLimit.mockReturnValue({ allowed: true, current: 2, limit: 10 })
  })

  it('authenticates first and returns tenant-scoped config', async () => {
    await expect(withPanelGuard()).resolves.toEqual({ ...auth, appConfig })
    expect(mocks.getConfigForTenant).toHaveBeenCalledWith('tenant-panel-1')
  })

  it('stops before config resolution when authentication fails', async () => {
    mocks.requirePanelAuth.mockRejectedValue(new Error('Not authenticated'))

    await expect(withPanelGuard()).rejects.toThrow('Not authenticated')
    expect(mocks.getConfigForTenant).not.toHaveBeenCalled()
  })

  it('fails closed when a required feature is disabled', async () => {
    mocks.isFeatureEnabled.mockReturnValue(false)

    await expect(withPanelGuard({ requiredFlag: 'enable_reviews' })).rejects.toThrow(
      'Feature "enable_reviews" is not enabled for this tenant'
    )
    expect(mocks.isFeatureEnabled).toHaveBeenCalledWith(appConfig.featureFlags, 'enable_reviews')
  })

  it('checks current usage and rejects an exceeded plan limit', async () => {
    const getCurrentCount = vi.fn().mockResolvedValue(10)
    mocks.checkLimit.mockReturnValue({ allowed: false, current: 10, limit: 10 })

    await expect(withPanelGuard({
      requiredLimit: { key: 'max_products', getCurrentCount },
    })).rejects.toThrow('Plan limit reached: max_products (10/10)')
    expect(getCurrentCount).toHaveBeenCalledOnce()
    expect(mocks.checkLimit).toHaveBeenCalledWith(appConfig.planLimits, 'max_products', 10)
  })

  it('returns context when both feature and limit checks pass', async () => {
    const getCurrentCount = vi.fn().mockResolvedValue(2)

    await expect(withPanelGuard({
      requiredFlag: 'enable_reviews',
      requiredLimit: { key: 'max_products', getCurrentCount },
    })).resolves.toEqual({ ...auth, appConfig })
  })
})
