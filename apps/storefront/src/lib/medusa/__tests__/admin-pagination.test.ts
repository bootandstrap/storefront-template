import { describe, expect, it } from 'vitest'
import { normalizeAdminListParams } from '../admin'

describe('normalizeAdminListParams', () => {
    it('uses safe defaults when params are missing', () => {
        expect(normalizeAdminListParams()).toEqual({
            limit: 20,
            offset: 0,
            q: undefined,
            status: undefined,
        })
    })

    it('clamps invalid numeric values', () => {
        expect(normalizeAdminListParams({ limit: 0, offset: -10 })).toEqual({
            limit: 1,
            offset: 0,
            q: undefined,
            status: undefined,
        })

        expect(normalizeAdminListParams({ limit: 500, offset: 8 })).toEqual({
            limit: 100,
            offset: 8,
            q: undefined,
            status: undefined,
        })
    })

    it('trims search query and removes empty status', () => {
        expect(normalizeAdminListParams({ q: '  mango  ', status: '' })).toEqual({
            limit: 20,
            offset: 0,
            q: 'mango',
            status: undefined,
        })
    })
})
