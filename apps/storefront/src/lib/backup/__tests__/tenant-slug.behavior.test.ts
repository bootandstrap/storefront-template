import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ single: vi.fn() }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: mocks.single }),
      }),
    }),
  }),
}))

const originalStoreDomain = process.env.STORE_DOMAIN

describe('tenant backup slug resolution', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.STORE_DOMAIN
  })

  afterEach(() => {
    if (originalStoreDomain === undefined) delete process.env.STORE_DOMAIN
    else process.env.STORE_DOMAIN = originalStoreDomain
  })

  it('prefers a safe lowercase STORE_DOMAIN namespace and caches it per tenant', async () => {
    process.env.STORE_DOMAIN = 'Tenant-Alpha.BootAndStrap.com'
    const { getTenantSlug } = await import('../tenant-slug')

    await expect(getTenantSlug('tenant-id-1')).resolves.toBe('tenant-alpha')
    delete process.env.STORE_DOMAIN
    await expect(getTenantSlug('tenant-id-1')).resolves.toBe('tenant-alpha')
    expect(mocks.single).not.toHaveBeenCalled()
  })

  it('uses a valid tenant table slug when no domain is configured', async () => {
    mocks.single.mockResolvedValue({ data: { slug: 'tenant-db' } })
    const { getTenantSlug } = await import('../tenant-slug')

    await expect(getTenantSlug('12345678-abcd')).resolves.toBe('tenant-db')
  })

  it('rejects unsafe storage path segments returned by the database', async () => {
    mocks.single.mockResolvedValue({ data: { slug: '../another-tenant' } })
    const { getTenantSlug } = await import('../tenant-slug')

    await expect(getTenantSlug('12345678-abcd')).resolves.toBe('12345678')
  })

  it('falls back deterministically when tenant lookup throws', async () => {
    mocks.single.mockRejectedValue(new Error('database unavailable'))
    const { getTenantSlug } = await import('../tenant-slug')

    await expect(getTenantSlug('abcdef12-3456')).resolves.toBe('abcdef12')
  })
})
