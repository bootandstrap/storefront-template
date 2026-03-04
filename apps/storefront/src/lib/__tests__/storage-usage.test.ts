import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures the mock ref is available during vi.mock factory hoisting
const mockGetAdminProductsFull = vi.hoisted(() => vi.fn())

vi.mock('@/lib/medusa/admin', () => ({
    getAdminProductsFull: mockGetAdminProductsFull,
}))

import { estimateTenantStorageUsage, canUploadFile } from '../storage-usage'

const mockScope = {
    tenantId: 'tenant-1',
    medusaSalesChannelId: 'sc_test',
    medusaPublishableKey: 'pk_test',
}

describe('canUploadFile', () => {
    it('allows upload when under limit', () => {
        const result = canUploadFile(100, 5 * 1024 * 1024, 500)
        expect(result.allowed).toBe(true)
        expect(result.usedMb).toBe(100)
        expect(result.limitMb).toBe(500)
    })

    it('blocks upload when exceeding limit', () => {
        const result = canUploadFile(498, 5 * 1024 * 1024, 500) // 498MB + 5MB > 500MB
        expect(result.allowed).toBe(false)
    })

    it('allows when exactly at limit', () => {
        const result = canUploadFile(499, 1 * 1024 * 1024, 500) // 499MB + 1MB = 500MB
        expect(result.allowed).toBe(true)
    })

    it('allows upload when limit is 0 (unlimited)', () => {
        const result = canUploadFile(9999, 10 * 1024 * 1024, 0)
        expect(result.allowed).toBe(true)
    })
})

describe('estimateTenantStorageUsage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('counts images across all products', async () => {
        mockGetAdminProductsFull.mockResolvedValue({
            products: [
                { images: [{ url: 'a.jpg' }, { url: 'b.jpg' }] },
                { images: [{ url: 'c.jpg' }] },
                { images: [] },
            ],
            count: 3,
        })

        const result = await estimateTenantStorageUsage(mockScope)
        expect(result.imageCount).toBe(3)
        // 3 images × 800KB ÷ 1024 = ~2.34 MB
        expect(result.estimatedMb).toBeGreaterThan(2)
        expect(result.estimatedMb).toBeLessThan(3)
    })

    it('returns 0 when no products', async () => {
        mockGetAdminProductsFull.mockResolvedValue({ products: [], count: 0 })
        const result = await estimateTenantStorageUsage(mockScope)
        expect(result.imageCount).toBe(0)
        expect(result.estimatedMb).toBe(0)
    })

    it('returns 0 on Medusa error (fail open)', async () => {
        mockGetAdminProductsFull.mockRejectedValue(new Error('Medusa unavailable'))
        const result = await estimateTenantStorageUsage(mockScope)
        expect(result.imageCount).toBe(0)
        expect(result.estimatedMb).toBe(0)
    })
})
