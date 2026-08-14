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
                'x-trace-id': '0123456789abcdef0123456789abcdef',
                'x-request-id': 'request-instrumentation-test',
                'x-tenant-id': 'tenant-instrumentation-test',
                'x-principal-id': 'principal-instrumentation-test',
                'x-operation-id': 'operation-instrumentation-test',
                authorization: 'Bearer must-not-propagate',
            },
        }

        await onRequestError(error, request, { raw: 'context' })

        expect(EVIDENCE_PROPAGATION_HEADERS).toEqual([
            'x-trace-id', 'x-request-id', 'x-tenant-id', 'x-principal-id', 'x-operation-id',
        ])
        expect(mockCaptureRequestError).toHaveBeenCalledWith(error, request, { raw: 'context' })
        expect(mockEvidence).toHaveBeenCalledWith(expect.objectContaining({
            trace_id: '0123456789abcdef0123456789abcdef',
            request_id: 'request-instrumentation-test',
            tenant_id: 'tenant-instrumentation-test',
            principal_id: 'principal-instrumentation-test',
            operation_id: 'operation-instrumentation-test',
            event_name: 'storefront.request_error',
            outcome: 'failure',
            error_code: 'TypeError',
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
