import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockGetTenantSlug = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockGetTenantStorageUsage = vi.fn()
const mockExecuteFullBackup = vi.fn()
const mockExecuteRetention = vi.fn()
const mockExecuteRestore = vi.fn()
const mockRpc = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { bucket: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/backup/tenant-slug', () => ({
    getTenantSlug: mockGetTenantSlug,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/storage-usage', () => ({
    getTenantStorageUsage: mockGetTenantStorageUsage,
}))

vi.mock('@/lib/backup/backup-executor', () => ({
    executeFullBackup: mockExecuteFullBackup,
}))

vi.mock('@/lib/backup/backup-retention', () => ({
    executeRetention: mockExecuteRetention,
}))

vi.mock('@/lib/backup/backup-restore', () => ({
    executeRestore: mockExecuteRestore,
}))

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        rpc: mockRpc,
    }),
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

function makeRequest(url: string, init?: RequestInit): NextRequest {
    return new NextRequest(new Request(url, init))
}

async function readJson(response: Response) {
    return response.json() as Promise<Record<string, unknown>>
}

describe('GET /api/panel/vault', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_backups: true },
                planLimits: { storage_limit_mb: 200, max_backups: 4 },
            },
        })
        mockGetTenantSlug.mockResolvedValue('tenant-alpha')
        mockGetTenantStorageUsage.mockResolvedValue({
            total: { mb: 50 },
            backups: { count: 1, bytes: 1024, mb: 1 },
        })
    })

    it('returns tenant-scoped storage usage and plan limit evidence', async () => {
        const { GET } = await import('../route')

        const response = await GET(makeRequest('https://tenant.example.com/api/panel/vault'))
        const json = await readJson(response)

        expect(response.status).toBe(200)
        expect(mockWithPanelGuard).toHaveBeenCalledTimes(1)
        expect(mockGetTenantSlug).toHaveBeenCalledWith('tenant_123')
        expect(mockGetTenantStorageUsage).toHaveBeenCalledWith('tenant-alpha')
        expect(json.limit_mb).toBe(200)
        expect(json.usage_percent).toBe(25)
    })
})

describe('POST /api/panel/vault', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_backups: true },
                planLimits: { max_backups: 4 },
            },
        })
        mockGetTenantSlug.mockResolvedValue('tenant-alpha')
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockExecuteFullBackup.mockResolvedValue({
            success: true,
            backup_key: 'tenant-alpha/2026-07-25_full.json.gz',
            size_bytes: 2048,
            duration_ms: 123,
            stats: { products: 2 },
        })
        mockExecuteRetention.mockResolvedValue({
            kept: ['tenant-alpha/latest.json.gz'],
            deleted: ['tenant-alpha/old.json.gz'],
            total_freed_bytes: 512,
        })
    })

    it('runs a tenant-scoped manual backup and retention policy', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest('https://tenant.example.com/api/panel/vault', { method: 'POST' }))
        const json = await readJson(response)

        expect(response.status).toBe(200)
        expect(mockExecuteFullBackup).toHaveBeenCalledWith(
            'tenant_123',
            'tenant-alpha',
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(mockExecuteRetention).toHaveBeenCalledWith('tenant-alpha', 4)
        expect(json.backup).toMatchObject({
            key: 'tenant-alpha/2026-07-25_full.json.gz',
            size_bytes: 2048,
            duration_ms: 123,
        })
        expect(json.retention).toMatchObject({ kept: 1, deleted: 1, freed_bytes: 512 })
    })

    it('fails closed when backups are disabled', async () => {
        mockWithPanelGuard.mockResolvedValueOnce({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_backups: false },
                planLimits: { max_backups: 4 },
            },
        })
        const { POST } = await import('../route')

        const response = await POST(makeRequest('https://tenant.example.com/api/panel/vault', { method: 'POST' }))
        const json = await readJson(response)

        expect(response.status).toBe(403)
        expect(json.error).toBe('Backups not enabled')
        expect(mockExecuteFullBackup).not.toHaveBeenCalled()
        expect(mockExecuteRetention).not.toHaveBeenCalled()
    })
})

describe('GET /api/panel/vault/backups', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_backups: true },
                planLimits: {},
            },
        })
        mockGetTenantSlug.mockResolvedValue('tenant-alpha')
        mockRpc.mockResolvedValue({
            data: [{ name: 'tenant-alpha/2026-07-25_full.json.gz', size_bytes: 2048 }],
            error: null,
        })
    })

    it('lists only backups for the authenticated tenant slug', async () => {
        const { GET } = await import('../backups/route')

        const response = await GET(makeRequest('https://tenant.example.com/api/panel/vault/backups'))
        const json = await readJson(response)

        expect(response.status).toBe(200)
        expect(mockRpc).toHaveBeenCalledWith('list_tenant_backups', { p_tenant_slug: 'tenant-alpha' })
        expect(json.backups).toEqual([{ name: 'tenant-alpha/2026-07-25_full.json.gz', size_bytes: 2048 }])
    })
})

describe('POST /api/panel/vault/restore', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_backups: true },
                planLimits: {},
            },
        })
        mockGetTenantSlug.mockResolvedValue('tenant-alpha')
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockExecuteRestore.mockResolvedValue({
            success: false,
            duration_ms: 150,
            categories: { restored: 1 },
            products: { restored: 2 },
            skipped_entities: ['orders'],
            errors: Array.from({ length: 25 }, (_, index) => `restore-error-${index}`),
        })
    })

    it('blocks restore attempts for another tenant backup path', async () => {
        const { POST } = await import('../restore/route')

        const response = await POST(makeRequest('https://tenant.example.com/api/panel/vault/restore', {
            method: 'POST',
            body: JSON.stringify({ backup_name: 'tenant-beta/backup.json.gz' }),
        }))
        const json = await readJson(response)

        expect(response.status).toBe(403)
        expect(json.error).toBe('Unauthorized')
        expect(mockExecuteRestore).not.toHaveBeenCalled()
    })

    it('returns partial restore evidence with capped error details', async () => {
        const { POST } = await import('../restore/route')

        const response = await POST(makeRequest('https://tenant.example.com/api/panel/vault/restore', {
            method: 'POST',
            body: JSON.stringify({ backup_name: 'tenant-alpha/backup.json.gz' }),
        }))
        const json = await readJson(response)

        expect(response.status).toBe(207)
        expect(mockExecuteRestore).toHaveBeenCalledWith(
            'tenant-alpha/backup.json.gz',
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(json.success).toBe(false)
        expect(json.errors).toHaveLength(20)
    })
})
