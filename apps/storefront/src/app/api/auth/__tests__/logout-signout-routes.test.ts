import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSignOut = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        auth: { signOut: mockSignOut },
    })),
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

function makeNextRequest(url: string, init?: RequestInit): NextRequest {
    return new NextRequest(new Request(url, init))
}

describe('GET/POST /api/auth/logout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
    })

    it('permanently redirects to /api/auth/signout and preserves query strings', async () => {
        const { GET } = await import('../logout/route')

        const res = await GET(makeNextRequest('https://tenant.example.com/api/auth/logout?next=/es/panel'))

        expect(res.status).toBe(308)
        expect(res.headers.get('location')).toBe('https://tenant.example.com/api/auth/signout?next=/es/panel')
    })
})

describe('GET/POST /api/auth/signout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        process.env.NEXT_PUBLIC_SITE_URL = 'https://tenant.example.com'
        mockSignOut.mockResolvedValue({ error: null })
    })

    it('signs out, redirects to the referer locale and disables browser caching', async () => {
        const { GET } = await import('../signout/route')

        const res = await GET(makeNextRequest('https://tenant.example.com/api/auth/signout', {
            headers: {
                cookie: 'sb-access-token=abc; sb-project-auth-token=def; medusa_cart_id=cart_1',
                referer: 'https://tenant.example.com/en/panel',
            },
        }))

        expect(mockSignOut).toHaveBeenCalledTimes(1)
        expect(res.status).toBe(302)
        expect(res.headers.get('location')).toBe('https://tenant.example.com/en')
        expect(res.headers.get('cache-control')).toContain('no-store')
        expect(res.headers.getSetCookie().join('\\n')).toContain('sb-access-token=')
        expect(res.headers.getSetCookie().join('\\n')).toContain('sb-project-auth-token=')
        expect(res.headers.getSetCookie().join('\\n')).toContain('medusa_cart_id=')
    })

    it('still redirects and clears local cookies when Supabase signout fails', async () => {
        mockSignOut.mockRejectedValueOnce(new Error('supabase unavailable'))
        const { POST } = await import('../signout/route')

        const res = await POST(makeNextRequest('https://tenant.example.com/api/auth/signout', {
            headers: { cookie: 'sb-refresh-token=refresh' },
        }))

        expect(res.status).toBe(302)
        expect(mockLoggerError).toHaveBeenCalledWith(
            'Supabase signout failed during edge handler:',
            expect.any(Error)
        )
        expect(res.headers.getSetCookie().join('\\n')).toContain('sb-refresh-token=')
    })
})
