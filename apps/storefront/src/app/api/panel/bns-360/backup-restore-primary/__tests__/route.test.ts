import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockRunBns360BackupRestorePrimaryJourney = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/bns-360/full-system-journeys', () => ({
    runBns360BackupRestorePrimaryJourney: mockRunBns360BackupRestorePrimaryJourney,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/bns-360/backup-restore-primary') {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest
}

describe('POST /api/panel/bns-360/backup-restore-primary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant-1' })
        mockRunBns360BackupRestorePrimaryJourney.mockResolvedValue({
            schema: 'bootandstrap.template.bns-360.backup-restore-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: { restoreDryRun: { safe: true } },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
    })

    it('runs behind owner panel guard and returns dry-run restore evidence', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockWithPanelGuard).toHaveBeenCalledWith()
        expect(mockRunBns360BackupRestorePrimaryJourney).toHaveBeenCalledWith({ tenantId: 'tenant-1' })
        expect(json.runtime.restoreDryRun.safe).toBe(true)
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('token')
    })
})
