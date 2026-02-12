/**
 * Unit tests for SupabaseAuthProviderService.
 * Tests validateOptions contract and authenticate flow (happy path, error paths).
 */

// ── Mocks ──
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabaseClient),
}))

const mockGetUser = jest.fn()
const mockSupabaseClient = {
    auth: { getUser: mockGetUser },
}

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}

const validOptions = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceRoleKey: 'test-service-role-key',
}

// ── Import after mocks ──
import SupabaseAuthProviderService from '../modules/supabase-auth/service'

describe('SupabaseAuthProviderService', () => {
    let service: SupabaseAuthProviderService

    beforeEach(() => {
        jest.clearAllMocks()
        service = new SupabaseAuthProviderService(
            { logger: mockLogger as any },
            validOptions
        )
    })

    // ── validateOptions ──
    describe('validateOptions', () => {
        it('throws when supabaseUrl is missing', () => {
            expect(() =>
                SupabaseAuthProviderService.validateOptions({
                    supabaseServiceRoleKey: 'key',
                })
            ).toThrow('supabaseUrl is required')
        })

        it('throws when supabaseServiceRoleKey is missing', () => {
            expect(() =>
                SupabaseAuthProviderService.validateOptions({
                    supabaseUrl: 'https://test.supabase.co',
                })
            ).toThrow('supabaseServiceRoleKey is required')
        })

        it('succeeds with valid options', () => {
            expect(() =>
                SupabaseAuthProviderService.validateOptions(validOptions)
            ).not.toThrow()
        })
    })

    // ── authenticate ──
    describe('authenticate', () => {
        const mockAuthIdentityProviderService = {
            retrieve: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        }

        it('returns error when no token provided', async () => {
            const result = await service.authenticate(
                { body: {}, headers: {} } as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain('No Supabase token')
        })

        it('extracts token from body.token', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-1', email: 'test@test.com', user_metadata: {} } },
                error: null,
            })
            mockAuthIdentityProviderService.retrieve.mockResolvedValue({
                id: 'identity-1',
            })

            const result = await service.authenticate(
                { body: { token: 'valid-jwt' }, headers: {} } as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(true)
            expect(mockGetUser).toHaveBeenCalledWith('valid-jwt')
        })

        it('extracts token from Authorization header', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-1', email: 'test@test.com', user_metadata: {} } },
                error: null,
            })
            mockAuthIdentityProviderService.retrieve.mockResolvedValue({
                id: 'identity-1',
            })

            const result = await service.authenticate(
                { body: {}, headers: { authorization: 'Bearer header-jwt' } } as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(true)
            expect(mockGetUser).toHaveBeenCalledWith('header-jwt')
        })

        it('returns error when Supabase rejects token', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'Token expired' },
            })

            const result = await service.authenticate(
                { body: { token: 'expired-jwt' }, headers: {} } as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(false)
            expect(result.error).toBe('Token expired')
        })

        it('creates new identity when not found', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'new-user', email: 'new@test.com', user_metadata: { full_name: 'Test' } } },
                error: null,
            })
            mockAuthIdentityProviderService.retrieve.mockRejectedValue({
                type: 'not_found',
                message: 'not found',
            })
            mockAuthIdentityProviderService.create.mockResolvedValue({
                id: 'new-identity',
            })

            const result = await service.authenticate(
                { body: { token: 'new-user-jwt' }, headers: {} } as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(true)
            expect(mockAuthIdentityProviderService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    entity_id: 'new-user',
                    provider_metadata: expect.objectContaining({
                        supabase_user_id: 'new-user',
                    }),
                })
            )
        })

        it('returns error on unexpected retrieve failure', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-1', email: 'test@test.com', user_metadata: {} } },
                error: null,
            })
            mockAuthIdentityProviderService.retrieve.mockRejectedValue({
                type: 'database_error',
                message: 'Connection refused',
            })

            const result = await service.authenticate(
                { body: { token: 'valid-jwt' }, headers: {} } as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(false)
            expect(result.error).toBe('Connection refused')
        })
    })

    // ── update ──
    describe('update', () => {
        const mockAuthIdentityProviderService = {
            retrieve: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        }

        it('returns error when entity_id is missing', async () => {
            const result = await service.update(
                {} as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain('entity_id is required')
        })

        it('updates auth identity metadata', async () => {
            mockAuthIdentityProviderService.update.mockResolvedValue({
                id: 'identity-1',
            })

            const result = await service.update(
                { entity_id: 'user-1', user_metadata: { name: 'Updated' } } as any,
                mockAuthIdentityProviderService as any
            )
            expect(result.success).toBe(true)
        })
    })
})
