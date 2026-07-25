import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithScope = vi.fn()
const mockCaptureException = vi.fn()
const mockLogTenantError = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@sentry/nextjs', () => ({
    withScope: mockWithScope,
    captureException: mockCaptureException,
}))

vi.mock('@/lib/log-tenant-error', () => ({
    logTenantError: mockLogTenantError,
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

describe('reportError', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        delete process.env.NEXT_PUBLIC_SENTRY_DSN
        mockLogTenantError.mockResolvedValue(undefined)
        mockWithScope.mockImplementation((callback: (scope: {
            setTag: ReturnType<typeof vi.fn>
            setExtras: ReturnType<typeof vi.fn>
            setLevel: ReturnType<typeof vi.fn>
        }) => void) => {
            callback({
                setTag: vi.fn(),
                setExtras: vi.fn(),
                setLevel: vi.fn(),
            })
        })
    })

    it('always writes to tenant_errors even when Sentry is not configured', async () => {
        const { reportError, isSentryConfigured } = await import('../report-error')

        await reportError({
            error: 'checkout failed',
            source: 'checkout',
            severity: 'warning',
            details: { tenant_id: 'tenant_123' },
        })

        expect(isSentryConfigured()).toBe(false)
        expect(mockWithScope).not.toHaveBeenCalled()
        expect(mockLogTenantError).toHaveBeenCalledWith({
            source: 'checkout',
            message: 'checkout failed',
            severity: 'warning',
            details: { tenant_id: 'tenant_123' },
        })
    })

    it('captures configured Sentry errors and still records tenant error evidence', async () => {
        process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0'
        const { reportError, isSentryConfigured } = await import('../report-error')
        const error = new Error('medusa timeout')

        await reportError({
            error,
            source: 'medusa',
            severity: 'critical',
            details: { operation: 'sync' },
        })

        expect(isSentryConfigured()).toBe(true)
        expect(mockWithScope).toHaveBeenCalledTimes(1)
        expect(mockCaptureException).toHaveBeenCalledWith(error)
        expect(mockLogTenantError).toHaveBeenCalledWith({
            source: 'medusa',
            message: 'medusa timeout',
            severity: 'critical',
            details: { operation: 'sync' },
        })
    })
})
