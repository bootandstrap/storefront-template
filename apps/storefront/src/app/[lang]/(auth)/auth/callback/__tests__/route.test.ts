import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()
const mockResolvePostLoginDestination = vi.fn()
const mockReconcileLegacyOwnerRole = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: mockCreateClient,
}))

vi.mock('@/lib/auth-routing', () => ({
    resolvePostLoginDestination: mockResolvePostLoginDestination,
}))

vi.mock('@/lib/panel-auth', () => ({
    reconcileLegacyOwnerRole: mockReconcileLegacyOwnerRole,
}))

function makeSupabaseClient(options: {
    exchangeError?: unknown
    user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> }
    profile?: { role?: string; tenant_id?: string }
}) {
    const single = vi.fn(async () => ({ data: options.profile ?? null }))
    return {
        auth: {
            exchangeCodeForSession: vi.fn(async () => ({
                data: { user: options.user ?? null },
                error: options.exchangeError ?? null,
            })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({ single })),
            })),
        })),
    }
}

describe('GET /[lang]/auth/callback', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        process.env.TENANT_ID = 'tenant_123'
        mockResolvePostLoginDestination.mockReturnValue('/en/panel')
        mockReconcileLegacyOwnerRole.mockResolvedValue('owner')
    })

    it('exchanges auth codes, reconciles owner role and redirects to the resolved destination', async () => {
        const supabase = makeSupabaseClient({
            user: {
                id: 'user_1',
                email: 'owner@example.com',
                user_metadata: { role: 'customer' },
            },
            profile: { role: 'owner', tenant_id: 'tenant_123' },
        })
        mockCreateClient.mockResolvedValue(supabase)
        const { GET } = await import('../route')

        const response = await GET(
            new Request('https://tenant.example.com/en/auth/callback?code=abc&next=/en/panel/productos'),
            { params: Promise.resolve({ lang: 'en' }) }
        )

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('https://tenant.example.com/en/panel')
        expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc')
        expect(mockReconcileLegacyOwnerRole).toHaveBeenCalledWith({
            userId: 'user_1',
            userEmail: 'owner@example.com',
            currentRole: 'owner',
            profileTenantId: 'tenant_123',
        })
        expect(mockResolvePostLoginDestination).toHaveBeenCalledWith(expect.objectContaining({
            lang: 'en',
            role: 'owner',
            metadataRole: 'customer',
            profileTenantId: 'tenant_123',
            envTenantId: 'tenant_123',
            requestedRedirect: '/en/panel/productos',
        }))
    })

    it('redirects to localized login error when code exchange fails', async () => {
        mockCreateClient.mockResolvedValue(makeSupabaseClient({ exchangeError: new Error('bad code') }))
        const { GET } = await import('../route')

        const response = await GET(
            new Request('https://tenant.example.com/es/auth/callback?code=bad'),
            { params: Promise.resolve({ lang: 'es' }) }
        )

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('https://tenant.example.com/es/login?error=auth')
        expect(mockResolvePostLoginDestination).not.toHaveBeenCalled()
    })
})
