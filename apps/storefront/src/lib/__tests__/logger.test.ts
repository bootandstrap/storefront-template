/**
 * Logger Tests — verify structured output format
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from '../logger'

describe('Structured Logger', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
        vi.spyOn(console, 'warn').mockImplementation(() => { })
        vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('outputs valid JSON', () => {
        const logger = createLogger()
        logger.info('test message')

        expect(consoleSpy).toHaveBeenCalledOnce()
        const output = consoleSpy.mock.calls[0][0]
        const parsed = JSON.parse(output)
        expect(parsed.level).toBe('info')
        expect(parsed.message).toBe('test message')
        expect(parsed.service).toBe('storefront')
        expect(parsed.timestamp).toBeDefined()
    })

    it('includes custom data', () => {
        const logger = createLogger()
        logger.info('order placed', { orderId: '123', amount: 29.99 })

        const parsed = JSON.parse(consoleSpy.mock.calls[0][0])
        expect(parsed.orderId).toBe('123')
        expect(parsed.amount).toBe(29.99)
    })

    it('withRequest adds request context', () => {
        const logger = createLogger()
        const reqLogger = logger.withRequest('req-abc', 'tenant-xyz')
        reqLogger.info('handling request')

        const parsed = JSON.parse(consoleSpy.mock.calls[0][0])
        expect(parsed.request_id).toBe('req-abc')
        expect(parsed.tenant_id).toBe('tenant-xyz')
    })

    it('withTenant adds tenant context', () => {
        const logger = createLogger()
        const tenantLogger = logger.withTenant('tenant-123')
        tenantLogger.info('tenant operation')

        const parsed = JSON.parse(consoleSpy.mock.calls[0][0])
        expect(parsed.tenant_id).toBe('tenant-123')
    })

    it('child loggers inherit context', () => {
        const logger = createLogger({ tenant_id: 'base-tenant' })
        const child = logger.withRequest('req-1')
        child.info('child log')

        const parsed = JSON.parse(consoleSpy.mock.calls[0][0])
        expect(parsed.tenant_id).toBe('base-tenant')
        expect(parsed.request_id).toBe('req-1')
    })

    it('warn uses console.warn', () => {
        const warnSpy = vi.spyOn(console, 'warn')
        const logger = createLogger()
        logger.warn('something concerning')

        expect(warnSpy).toHaveBeenCalledOnce()
        const parsed = JSON.parse(warnSpy.mock.calls[0][0])
        expect(parsed.level).toBe('warn')
    })

    it('error uses console.error', () => {
        const errorSpy = vi.spyOn(console, 'error')
        const logger = createLogger()
        logger.error('something broke', { code: 'ERR_001' })

        expect(errorSpy).toHaveBeenCalledOnce()
        const parsed = JSON.parse(errorSpy.mock.calls[0][0])
        expect(parsed.level).toBe('error')
        expect(parsed.code).toBe('ERR_001')
    })
})
