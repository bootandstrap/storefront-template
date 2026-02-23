/**
 * Tests for requirePanelAuth() — tenant resolution and role-based access
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
        from: () => ({ select: mockSelect }),
    })),
}))

vi.mock('@/lib/config', () => ({
    getRequiredTenantId: vi.fn(() => 'env-tenant-123'),
}))

// Chain: .select() → .eq() → .single()
mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ single: mockSingle })

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { requirePanelAuth } from '../panel-auth'

describe('requirePanelAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSelect.mockReturnValue({ eq: mockEq })
        mockEq.mockReturnValue({ single: mockSingle })
    })

    it('throws when user is not authenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } })
        await expect(requirePanelAuth()).rejects.toThrow('Not authenticated')
    })

    it('throws when role is not in PANEL_ROLES', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
        mockSingle.mockResolvedValue({ data: { role: 'customer', tenant_id: 't1' } })
        await expect(requirePanelAuth()).rejects.toThrow('Insufficient permissions')
    })

    it('returns profile tenant_id for owner role', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
        mockSingle.mockResolvedValue({ data: { role: 'owner', tenant_id: 'profile-tenant-456' } })
        const result = await requirePanelAuth()
        expect(result.role).toBe('owner')
        expect(result.tenantId).toBe('profile-tenant-456')
    })

    it('throws when role is admin', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
        mockSingle.mockResolvedValue({ data: { role: 'admin', tenant_id: 'admin-tenant-789' } })
        await expect(requirePanelAuth()).rejects.toThrow('Insufficient permissions')
    })

    it('throws when owner has no tenant_id in profile', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
        mockSingle.mockResolvedValue({ data: { role: 'owner', tenant_id: null } })
        await expect(requirePanelAuth()).rejects.toThrow('requires a tenant_id')
    })

    it('super_admin uses profile tenant_id when available', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
        mockSingle.mockResolvedValue({ data: { role: 'super_admin', tenant_id: 'sa-tenant' } })
        const result = await requirePanelAuth()
        expect(result.role).toBe('super_admin')
        expect(result.tenantId).toBe('sa-tenant')
    })

    it('super_admin falls back to ENV tenant when profile has none', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
        mockSingle.mockResolvedValue({ data: { role: 'super_admin', tenant_id: null } })
        const result = await requirePanelAuth()
        expect(result.role).toBe('super_admin')
        expect(result.tenantId).toBe('env-tenant-123')
    })
})
