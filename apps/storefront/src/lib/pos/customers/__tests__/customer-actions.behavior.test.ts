import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  guard: vi.fn(), scope: vi.fn(), customers: vi.fn(), adminFetch: vi.fn(),
}))
vi.mock('@/lib/panel-guard', () => ({ withPanelGuard: mocks.guard }))
vi.mock('@/lib/medusa/tenant-scope', () => ({ getTenantMedusaScope: mocks.scope }))
vi.mock('@/lib/medusa/admin-orders', () => ({ getAdminCustomers: mocks.customers }))
vi.mock('@/lib/medusa/admin-core', () => ({ adminFetch: mocks.adminFetch }))

import { createPOSCustomerAction, searchPOSCustomersAction } from '../customer-actions'

const scope = { tenantId: 'tenant-pos', medusaSalesChannelId: 'sc-pos' }

describe('POS customer actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.guard.mockResolvedValue({ tenantId: 'tenant-pos' })
    mocks.scope.mockResolvedValue(scope)
  })

  it('rejects short searches before contacting Medusa', async () => {
    await expect(searchPOSCustomersAction(' ')).resolves.toEqual({
      customers: [], error: 'Query too short (min 2 chars)',
    })
    expect(mocks.customers).not.toHaveBeenCalled()
  })

  it('maps tenant-scoped customer search results', async () => {
    mocks.customers.mockResolvedValue({ customers: [{
      id: 'cus-1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test',
      phone: null, orders: [{ id: 'order-1' }],
    }] })
    await expect(searchPOSCustomersAction(' ada ')).resolves.toEqual({
      customers: [{
        id: 'cus-1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test',
        phone: null, orders_count: 1,
      }],
    })
    expect(mocks.customers).toHaveBeenCalledWith({ limit: 10, q: 'ada' }, scope)
  })

  it('normalizes a quick-created customer and rejects invalid input/API errors', async () => {
    await expect(createPOSCustomerAction({ first_name: '', last_name: '', email: '' }))
      .resolves.toMatchObject({ customer: null, error: 'Name and email are required' })
    mocks.adminFetch.mockResolvedValueOnce({ error: 'duplicate email', data: null })
    await expect(createPOSCustomerAction({ first_name: 'Ada', last_name: 'L', email: 'ADA@EXAMPLE.TEST' }))
      .resolves.toEqual({ customer: null, error: 'duplicate email' })
    mocks.adminFetch.mockResolvedValueOnce({ data: { customer: {
      id: 'cus-2', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', phone: '+4100',
    } }, error: null })
    await expect(createPOSCustomerAction({
      first_name: ' Ada ', last_name: ' Lovelace ', email: ' ADA@EXAMPLE.TEST ', phone: ' +4100 ',
    })).resolves.toMatchObject({ customer: { id: 'cus-2', orders_count: 0 } })
    expect(mocks.adminFetch).toHaveBeenLastCalledWith('/admin/customers', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', phone: '+4100',
      }),
    }), scope)
  })

  it('returns structured errors when authorization fails', async () => {
    mocks.guard.mockRejectedValue(new Error('Not authenticated'))
    await expect(searchPOSCustomersAction('ada')).resolves.toEqual({
      customers: [], error: 'Not authenticated',
    })
    await expect(createPOSCustomerAction({ first_name: 'Ada', last_name: 'L', email: 'a@b.test' }))
      .resolves.toEqual({ customer: null, error: 'Not authenticated' })
  })
})
