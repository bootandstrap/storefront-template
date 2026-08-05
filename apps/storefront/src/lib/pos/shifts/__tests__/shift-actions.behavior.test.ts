import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    guard: vi.fn(),
    scope: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    audit: vi.fn(),
    revalidate: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('@/lib/panel-guard', () => ({ withPanelGuard: mocks.guard }))
vi.mock('@/lib/medusa/tenant-scope', () => ({ getTenantMedusaScope: mocks.scope }))
vi.mock('@/lib/panel/log-owner-action', () => ({ logOwnerAction: mocks.audit }))
vi.mock('@/lib/pos/medusa-pos-module', () => ({
    openPOSShift: mocks.open,
    closePOSShift: mocks.close,
    getPOSShift: mocks.get,
    listPOSShifts: mocks.list,
}))

import {
    closeShiftAction,
    getActiveShiftAction,
    getShiftDetailAction,
    listShiftsAction,
    openShiftAction,
} from '../shift-actions'

const REQUIRED_SHIFT_FLAG = { requiredFlag: 'enable_pos_shifts' }

describe('POS shift action authorization', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.guard.mockResolvedValue({
            tenantId: 'tenant-1',
            appConfig: { featureFlags: { enable_pos_shifts: true } },
        })
        mocks.scope.mockResolvedValue({ tenantId: 'tenant-1' })
        mocks.list.mockResolvedValue([])
        mocks.get.mockResolvedValue(null)
        mocks.open.mockResolvedValue({ shift: null, error: null })
        mocks.close.mockResolvedValue({ shift: null, error: null })
        mocks.audit.mockResolvedValue(undefined)
    })

    it.each([
        ['open', () => openShiftAction({ operator: 'owner' })],
        ['close', () => closeShiftAction({ shift_id: 'shift-1' })],
        ['active', () => getActiveShiftAction('owner')],
        ['list', () => listShiftsAction()],
        ['detail', () => getShiftDetailAction('shift-1')],
    ])('requires the shifts capability for %s', async (_name, action) => {
        await action()

        expect(mocks.guard).toHaveBeenCalledWith(REQUIRED_SHIFT_FLAG)
    })

    it('performs no Medusa operation when the capability guard denies access', async () => {
        mocks.guard.mockRejectedValue(new Error('Feature not enabled'))

        const result = await closeShiftAction({ shift_id: 'shift-1', actual_cash: 100 })

        expect(result).toEqual({
            shift: null,
            discrepancy: null,
            error: 'Feature not enabled',
        })
        expect(mocks.scope).not.toHaveBeenCalled()
        expect(mocks.get).not.toHaveBeenCalled()
        expect(mocks.close).not.toHaveBeenCalled()
    })

    it('reports POS runtime unavailability instead of an available empty shift list', async () => {
        mocks.list.mockRejectedValue(new Error('POS runtime unavailable'))

        const result = await listShiftsAction()

        expect(result).toEqual({ shifts: [], error: 'POS runtime unavailable' })
    })
})
