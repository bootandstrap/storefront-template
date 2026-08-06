import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ guard: vi.fn(), sales: vi.fn() }))
vi.mock('@/lib/panel-guard', () => ({ withPanelGuard: mocks.guard }))
vi.mock('../sales-history', () => ({ getPOSSalesAction: mocks.sales }))

import { getDailyStatsAction } from '../daily-stats'

describe('POS daily stats server contract', () => {
    beforeEach(() => {
        mocks.guard.mockReset().mockResolvedValue({ tenantId: 'tenant-authorized' })
        mocks.sales.mockReset()
    })

    it('requires reports capability and preserves a valid empty day', async () => {
        mocks.sales.mockResolvedValue({ sales: [], total: 0 })

        const result = await getDailyStatsAction('2026-08-06')

        expect(mocks.guard).toHaveBeenCalledWith({ requiredFlag: 'enable_pos_reports' })
        expect(result).toEqual({
            stats: {
                date: '2026-08-06', totalSales: 0, totalRevenue: 0, avgTicket: 0,
                byPaymentMethod: {}, byHour: [], topProducts: [],
            },
        })
    })

    it('propagates history unavailability instead of converting it to zero sales', async () => {
        mocks.sales.mockResolvedValue({ sales: [], total: 0, error: 'pos_runtime_unavailable' })

        await expect(getDailyStatsAction('2026-08-06')).resolves.toEqual({
            stats: null, error: 'pos_runtime_unavailable',
        })
    })

    it.each(['2026-8-6', 'not-a-date', '2026-02-30'])('rejects invalid report date %s', async (date) => {
        const result = await getDailyStatsAction(date)
        expect(result.stats).toBeNull()
        expect(result.error).toMatch(/date/i)
        expect(mocks.sales).not.toHaveBeenCalled()
    })
})
