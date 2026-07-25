import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockWithRateLimit = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/security/api-rate-guard', () => ({
    API_GUARD: { bucket: 'api' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

function makeRequest(url: string): NextRequest {
    return new NextRequest(new Request(url))
}

describe('GET /api/products/[id]', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        vi.stubGlobal('fetch', vi.fn())
        process.env.MEDUSA_BACKEND_URL = 'https://medusa.example.com'
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = 'pk_test_safe'
    })

    it('rejects invalid product identifiers before calling Medusa', async () => {
        const { GET } = await import('../route')

        const response = await GET(
            makeRequest('https://tenant.example.com/api/products/../../etc/passwd'),
            { params: Promise.resolve({ id: '../etc/passwd' }) }
        )
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error).toBe('Invalid product ID format')
        expect(fetch).not.toHaveBeenCalled()
    })

    it('fetches valid product IDs through the configured Medusa store endpoint', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(new Response(
            JSON.stringify({ product: { id: 'prod_123ABC', title: 'Boot product' } }),
            { status: 200, headers: { 'content-type': 'application/json' } }
        ))
        const { GET } = await import('../route')

        const response = await GET(
            makeRequest('https://tenant.example.com/api/products/prod_123ABC'),
            { params: Promise.resolve({ id: 'prod_123ABC' }) }
        )
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(fetch).toHaveBeenCalledWith(
            'https://medusa.example.com/store/products/prod_123ABC?fields=*variants,*variants.calculated_price,+variants.inventory_quantity,*categories',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'x-publishable-api-key': 'pk_test_safe',
                }),
            })
        )
        expect(json.product).toEqual({ id: 'prod_123ABC', title: 'Boot product' })
    })
})
