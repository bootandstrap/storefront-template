import { describe, expect, it } from 'vitest'

import { resolvePOSSyncAvailability } from '../usePOSSync'

describe('POS realtime availability', () => {
    it('reports disabled, unavailable, connecting, and available explicitly', () => {
        expect(resolvePOSSyncAvailability({ enabled: false, tenantId: undefined, hasChannel: false }))
            .toBe('disabled')
        expect(resolvePOSSyncAvailability({ enabled: true, tenantId: undefined, hasChannel: false }))
            .toBe('unavailable')
        expect(resolvePOSSyncAvailability({ enabled: true, tenantId: 'tenant-a', hasChannel: false }))
            .toBe('connecting')
        expect(resolvePOSSyncAvailability({
            enabled: true,
            tenantId: 'tenant-a',
            hasChannel: false,
            channelUnavailable: true,
        })).toBe('unavailable')
        expect(resolvePOSSyncAvailability({ enabled: true, tenantId: 'tenant-a', hasChannel: true }))
            .toBe('available')
    })
})
