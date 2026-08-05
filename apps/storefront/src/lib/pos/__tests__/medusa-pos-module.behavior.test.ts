import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    adminFetch: vi.fn(),
}))

vi.mock('@/lib/medusa/admin-core', () => ({
    adminFetch: mocks.adminFetch,
}))

import {
    getPOSShift,
    listPOSSessions,
    listPOSShifts,
    listPOSTransactions,
} from '../medusa-pos-module'

describe('Medusa POS module read availability', () => {
    beforeEach(() => {
        mocks.adminFetch.mockReset()
    })

    it.each([
        ['sessions', () => listPOSSessions()],
        ['transactions', () => listPOSTransactions()],
        ['shifts', () => listPOSShifts()],
    ])('does not convert a %s transport error into an empty successful list', async (_name, read) => {
        mocks.adminFetch.mockResolvedValue({
            data: null,
            error: 'Failed to connect to Medusa Admin API',
        })

        await expect(read()).rejects.toThrow('POS runtime unavailable')
    })

    it('does not convert a shift transport error into a not-found result', async () => {
        mocks.adminFetch.mockResolvedValue({
            data: null,
            error: 'Medusa Admin API error: 503',
        })

        await expect(getPOSShift('shift-1')).rejects.toThrow('POS runtime unavailable')
    })

    it('preserves a valid empty list as an available result', async () => {
        mocks.adminFetch.mockResolvedValue({
            data: { shifts: [] },
            error: null,
        })

        await expect(listPOSShifts({ status: 'open' })).resolves.toEqual([])
        expect(mocks.adminFetch).toHaveBeenCalledWith('/admin/pos/shifts?status=open', {}, undefined)
    })
})
