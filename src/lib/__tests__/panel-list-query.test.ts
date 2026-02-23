import { describe, expect, it } from 'vitest'
import { parsePanelListQuery } from '../panel-list-query'

describe('parsePanelListQuery', () => {
    it('returns defaults for missing params', () => {
        expect(parsePanelListQuery({}, { defaultLimit: 20 })).toEqual({
            page: 1,
            limit: 20,
            offset: 0,
            q: undefined,
            status: undefined,
            tab: undefined,
        })
    })

    it('normalizes invalid page and trims q', () => {
        expect(parsePanelListQuery({ page: '-2', q: '  mango  ' }, { defaultLimit: 20 })).toEqual({
            page: 1,
            limit: 20,
            offset: 0,
            q: 'mango',
            status: undefined,
            tab: undefined,
        })
    })

    it('keeps valid page and known status', () => {
        expect(parsePanelListQuery({ page: '3', status: 'pending' }, {
            defaultLimit: 20,
            allowedStatuses: ['all', 'pending', 'completed'],
        })).toEqual({
            page: 3,
            limit: 20,
            offset: 40,
            q: undefined,
            status: 'pending',
            tab: undefined,
        })
    })

    it('drops unknown status and normalizes tab', () => {
        expect(parsePanelListQuery({ status: 'unknown', tab: 'categorias' }, {
            defaultLimit: 12,
            allowedTabs: ['productos', 'categorias'],
        })).toEqual({
            page: 1,
            limit: 12,
            offset: 0,
            q: undefined,
            status: undefined,
            tab: 'categorias',
        })
    })
})
