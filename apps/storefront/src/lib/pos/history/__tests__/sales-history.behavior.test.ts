import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ guard: vi.fn(), scope: vi.fn(), adminFetch: vi.fn() }))
vi.mock('@/lib/panel-guard', () => ({ withPanelGuard: mocks.guard }))
vi.mock('@/lib/medusa/tenant-scope', () => ({ getTenantMedusaScope: mocks.scope }))
vi.mock('@/lib/medusa/admin-core', () => ({ adminFetch: mocks.adminFetch }))

import { getPOSSaleDetailAction, getPOSSalesAction } from '../sales-history'

describe('POS sales history server contract', () => {
    beforeEach(() => {
        mocks.guard.mockReset().mockResolvedValue({
            tenantId: 'tenant-authorized',
            appConfig: { config: { default_currency: 'chf' }, featureFlags: { enable_pos_shifts: true } },
        })
        mocks.scope.mockReset().mockResolvedValue({ tenantId: 'tenant-authorized', salesChannelId: 'sc-1' })
        mocks.adminFetch.mockReset()
    })

    it('requires capability before deriving scope and preserves a valid empty list', async () => {
        mocks.adminFetch.mockResolvedValue({ data: { draft_orders: [], count: 0 }, error: null })

        await expect(getPOSSalesAction()).resolves.toEqual({ sales: [], total: 0 })
        expect(mocks.guard).toHaveBeenCalledWith({ requiredFlag: 'enable_pos_shifts' })
        expect(mocks.scope).toHaveBeenCalledWith('tenant-authorized')
    })

    it('distinguishes Medusa runtime failure from a valid empty list', async () => {
        mocks.adminFetch.mockResolvedValue({ data: null, error: 'pos_runtime_unavailable' })

        await expect(getPOSSalesAction()).resolves.toEqual({
            sales: [], total: 0, error: 'pos_runtime_unavailable',
        })
        await expect(getPOSSaleDetailAction('order-1')).resolves.toEqual({
            sale: null, error: 'pos_runtime_unavailable',
        })
    })

    it('never accepts caller tenant scope and maps only the authorized response', async () => {
        mocks.adminFetch.mockResolvedValue({
            data: {
                draft_orders: [{
                    id: 'draft-1', display_id: 7, status: 'completed', created_at: '2026-08-06T10:00:00Z',
                    metadata: { source: 'pos', payment_method: 'cash' },
                    cart: { items: [], total: 0, region: { currency_code: 'chf' } },
                }],
                count: 1,
            },
            error: null,
        })

        const result = await getPOSSalesAction({ limit: 10 })

        expect(result.sales).toHaveLength(1)
        expect(mocks.adminFetch).toHaveBeenCalledWith(
            expect.stringContaining('/admin/draft-orders?'), {},
            { tenantId: 'tenant-authorized', salesChannelId: 'sc-1' },
        )
    })
})
