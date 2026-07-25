import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockCreateAdminClient = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerWarn = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { bucket: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: mockCreateAdminClient,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
        warn: mockLoggerWarn,
    },
}))

function makeRequest(): NextRequest {
    return new NextRequest(new Request('https://tenant.example.com/api/panel/data-export', { method: 'POST' }))
}

function makeAsyncJobsSelect(result: unknown[]) {
    const query = {
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(async () => ({ data: result })),
    }
    return query
}

describe('GET/POST /api/panel/data-export', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
    })

    it('enforces 24 hour export cooldown before enqueueing jobs', async () => {
        const asyncJobsQuery = makeAsyncJobsSelect([{ id: 'job_recent' }])
        const asyncJobs = {
            select: vi.fn(() => asyncJobsQuery),
            insert: vi.fn(async () => ({ error: null })),
        }
        mockCreateAdminClient.mockReturnValue({
            from: vi.fn(() => asyncJobs),
        })
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(429)
        expect(json).toMatchObject({ cooldown: true })
        expect(asyncJobs.insert).not.toHaveBeenCalled()
    })

    it('enqueues a tenant backup export job and writes audit evidence', async () => {
        const asyncJobsQuery = makeAsyncJobsSelect([])
        const asyncJobs = {
            select: vi.fn(() => asyncJobsQuery),
            insert: vi.fn(async () => ({ error: null })),
        }
        const auditLog = {
            insert: vi.fn(async () => ({ error: null })),
        }
        const from = vi.fn((table: string) => table === 'audit_log' ? auditLog : asyncJobs)
        mockCreateAdminClient.mockReturnValue({ from })
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(asyncJobs.insert).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: 'tenant_123',
            job_type: 'tenant_backup',
            payload: expect.objectContaining({
                type: 'gdpr_export',
                requested_by: 'owner_panel',
            }),
        }))
        expect(auditLog.insert).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: 'tenant_123',
            action: 'gdpr_data_export_requested',
        }))
        expect(json.success).toBe(true)
    })

    it('returns recent export jobs mapped to owner-safe status fields', async () => {
        const jobs = [{
            id: 'job_1',
            status: 'completed',
            created_at: '2026-07-25T00:00:00Z',
            completed_at: '2026-07-25T00:01:00Z',
            result: { download_url: 'https://signed.example.com/export.json' },
        }]
        const asyncJobsQuery = makeAsyncJobsSelect(jobs)
        const asyncJobs = {
            select: vi.fn(() => asyncJobsQuery),
        }
        mockCreateAdminClient.mockReturnValue({
            from: vi.fn(() => asyncJobs),
        })
        const { GET } = await import('../route')

        const response = await GET()
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.exports).toEqual([{
            id: 'job_1',
            status: 'completed',
            requestedAt: '2026-07-25T00:00:00Z',
            completedAt: '2026-07-25T00:01:00Z',
            downloadUrl: 'https://signed.example.com/export.json',
        }])
    })
})
