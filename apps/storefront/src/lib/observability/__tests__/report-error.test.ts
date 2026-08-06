import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithScope = vi.fn()
const mockCaptureException = vi.fn()
const mockLogTenantError = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerEvidence = vi.fn()

vi.mock('@sentry/nextjs', () => ({
    withScope: mockWithScope,
    captureException: mockCaptureException,
}))

vi.mock('@/lib/log-tenant-error', () => ({
    logTenantError: mockLogTenantError,
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError, evidence: mockLoggerEvidence },
}))

describe('reportError', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        delete process.env.NEXT_PUBLIC_SENTRY_DSN
        mockLogTenantError.mockResolvedValue(undefined)
        mockLoggerEvidence.mockResolvedValue(undefined)
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
        expect(mockLoggerEvidence).toHaveBeenCalledWith(expect.objectContaining({
            trace_id: expect.stringMatching(/^[0-9a-f]{32}$/),
            request_id: expect.any(String),
            tenant_id: 'tenant_123',
            operation_id: expect.any(String),
            revision: expect.any(String),
            event_name: 'storefront.error.checkout',
            outcome: 'failure',
            error_code: 'Error',
        }))
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

    it('keeps tenant error recording independent from evidence sink failure', async () => {
        mockLoggerEvidence.mockRejectedValue(new Error('OTLP sink unavailable'))
        const { reportError } = await import('../report-error')

        await expect(reportError({
            error: new TypeError('synthetic failure'),
            source: 'medusa',
            details: {
                tenant_id: 'tenant-safe',
                password: 'must-not-propagate',
                payload: { raw: true },
            },
        })).resolves.toBeUndefined()

        expect(mockLogTenantError).toHaveBeenCalledWith(expect.objectContaining({
            details: { tenant_id: 'tenant-safe' },
        }))
        expect(mockLoggerError).toHaveBeenCalledWith('[reportError] Evidence emission failed')
    })
})
