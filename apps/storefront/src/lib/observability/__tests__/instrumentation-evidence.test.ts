import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCaptureRequestError = vi.fn()
const mockEvidence = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@sentry/nextjs', () => ({
    captureRequestError: mockCaptureRequestError,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        evidence: mockEvidence,
        error: mockLoggerError,
    },
}))

describe('storefront request instrumentation evidence', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockEvidence.mockResolvedValue(undefined)
    })

    it('preserves Sentry and propagates only allowlisted correlation fields', async () => {
        const { EVIDENCE_PROPAGATION_HEADERS, onRequestError } = await import('../../../instrumentation')
        const error = new TypeError('synthetic request failure')
        const request = {
            headers: {
                'x-trace-id': 'trace-instrumentation-test',
                'x-tenant-id': 'tenant-instrumentation-test',
                authorization: 'Bearer must-not-propagate',
            },
        }

        await onRequestError(error, request, { raw: 'context' })

        expect(EVIDENCE_PROPAGATION_HEADERS).toEqual(['x-trace-id', 'x-tenant-id'])
        expect(mockCaptureRequestError).toHaveBeenCalledWith(error, request, { raw: 'context' })
        expect(mockEvidence).toHaveBeenCalledWith(expect.objectContaining({
            trace_id: 'trace-instrumentation-test',
            tenant_id: 'tenant-instrumentation-test',
            operation: 'storefront.request_error',
            outcome: 'failure',
            error_class: 'TypeError',
        }))
        expect(mockEvidence.mock.calls[0][0]).not.toHaveProperty('authorization')
        expect(mockEvidence.mock.calls[0][0]).not.toHaveProperty('raw')
    })

    it('does not let evidence failure replace Sentry request handling', async () => {
        mockEvidence.mockRejectedValue(new Error('sink unavailable'))
        const { onRequestError } = await import('../../../instrumentation')

        await expect(onRequestError(new Error('business failure'), {
            headers: new Headers(),
        })).resolves.toBeUndefined()

        expect(mockCaptureRequestError).toHaveBeenCalledOnce()
        expect(mockLoggerError).toHaveBeenCalledWith('[instrumentation] Evidence emission failed')
    })
})
