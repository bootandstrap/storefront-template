import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetRequiredTenantId = vi.fn()
const mockGetTenantSlug = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockExecuteRestore = vi.fn()
const mockGetConfig = vi.fn()
const mockProcessAbandonedCarts = vi.fn()
const mockProcessReviewRequests = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerWarn = vi.fn()

vi.mock('@/lib/config', () => ({
    getRequiredTenantId: mockGetRequiredTenantId,
    getConfig: mockGetConfig,
}))

vi.mock('@/lib/backup/tenant-slug', () => ({
    getTenantSlug: mockGetTenantSlug,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/backup/backup-restore', () => ({
    executeRestore: mockExecuteRestore,
}))

vi.mock('@/lib/email-automations', () => ({
    DEFAULT_AUTOMATION_CONFIG: {
        abandoned_cart_delay_hours: 24,
        review_request_delay_days: 7,
    },
    processAbandonedCarts: mockProcessAbandonedCarts,
    processReviewRequests: mockProcessReviewRequests,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
        warn: mockLoggerWarn,
    },
}))

function makeRequest(url: string, init?: RequestInit): NextRequest {
    return new NextRequest(new Request(url, init))
}

describe('POST /api/cron/restore', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        process.env.CRON_SECRET = 'cron_test_secret'
        mockGetRequiredTenantId.mockReturnValue('tenant_123')
        mockGetTenantSlug.mockResolvedValue('tenant-alpha')
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockExecuteRestore.mockResolvedValue({
            success: false,
            duration_ms: 50,
            categories: {},
            products: {},
            skipped_entities: [],
            errors: Array.from({ length: 25 }, (_, index) => `restore-error-${index}`),
        })
    })

    it('rejects missing or invalid cron credentials', async () => {
        const { POST } = await import('../restore/route')

        const response = await POST(makeRequest('https://tenant.example.com/api/cron/restore', {
            method: 'POST',
            body: JSON.stringify({ backup_key: 'tenant-alpha/backup.json.gz' }),
        }))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Unauthorized')
        expect(mockExecuteRestore).not.toHaveBeenCalled()
    })

    it('blocks backup keys outside the current tenant slug', async () => {
        const { POST } = await import('../restore/route')

        const response = await POST(makeRequest('https://tenant.example.com/api/cron/restore', {
            method: 'POST',
            headers: { authorization: 'Bearer cron_test_secret' },
            body: JSON.stringify({ backup_key: 'tenant-beta/backup.json.gz' }),
        }))
        const json = await response.json()

        expect(response.status).toBe(403)
        expect(json.error).toBe('Backup does not belong to this tenant')
        expect(mockExecuteRestore).not.toHaveBeenCalled()
    })

    it('executes tenant restore and caps partial error evidence', async () => {
        const { POST } = await import('../restore/route')

        const response = await POST(makeRequest('https://tenant.example.com/api/cron/restore', {
            method: 'POST',
            headers: { authorization: 'Bearer cron_test_secret' },
            body: JSON.stringify({ backup_key: 'tenant-alpha/backup.json.gz' }),
        }))
        const json = await response.json()

        expect(response.status).toBe(207)
        expect(mockExecuteRestore).toHaveBeenCalledWith(
            'tenant-alpha/backup.json.gz',
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(json.errors).toHaveLength(20)
    })
})

describe('POST /api/cron/email-automations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        process.env.CRON_SECRET = 'cron_test_secret'
        mockGetConfig.mockResolvedValue({
            featureFlags: {
                enable_abandoned_cart_emails: false,
                enable_email_campaigns: false,
            },
            planLimits: { max_email_sends_month: 100 },
            config: { tenant_id: 'tenant_123', default_currency: 'eur' },
        })
    })

    it('rejects unauthorized automation runs', async () => {
        const { POST } = await import('../email-automations/route')

        const response = await POST(new Request('https://tenant.example.com/api/cron/email-automations', { method: 'POST' }))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Unauthorized')
        expect(mockProcessAbandonedCarts).not.toHaveBeenCalled()
        expect(mockProcessReviewRequests).not.toHaveBeenCalled()
    })

    it('skips processing when tenant email automation flags are disabled', async () => {
        const { POST } = await import('../email-automations/route')

        const response = await POST(new Request('https://tenant.example.com/api/cron/email-automations', {
            method: 'POST',
            headers: { authorization: 'Bearer cron_test_secret' },
        }))
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json).toMatchObject({
            status: 'skipped',
            reason: 'No email automations enabled',
        })
        expect(mockProcessAbandonedCarts).not.toHaveBeenCalled()
        expect(mockProcessReviewRequests).not.toHaveBeenCalled()
    })
})
