import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    loggerError: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getSession: mocks.getSession,
        },
    }),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mocks.loggerError,
    },
}))

describe('authenticatedMedusaFetch', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        mocks.getSession.mockResolvedValue({
            data: {
                session: {
                    access_token: 'supabase-token',
                },
            },
        })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    it('exchanges the Supabase JWT for a Medusa customer auth token before Store API calls', async () => {
        vi.stubEnv('MEDUSA_BACKEND_URL', 'https://medusa.example.com')
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY', 'pk_test')

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'medusa-customer-token' }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ customer: { id: 'cus_1' } }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)

        const { authenticatedMedusaFetch } = await import('../auth-medusa')
        const result = await authenticatedMedusaFetch<{ customer: { id: string } }>('/store/customers', {
            method: 'POST',
            body: JSON.stringify({ email: 'customer@example.com' }),
        })

        expect(result.customer.id).toBe('cus_1')
        expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://medusa.example.com/auth/customer/supabase', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ token: 'supabase-token' }),
        }))
        expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://medusa.example.com/store/customers', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                Authorization: 'Bearer medusa-customer-token',
                'x-publishable-api-key': 'pk_test',
            }),
        }))
    })
})
