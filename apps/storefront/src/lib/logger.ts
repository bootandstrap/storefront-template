/**
 * Structured Logger — Production-grade logging utility
 *
 * Provides JSON-structured log output with tenant_id and request_id
 * for correlation in log aggregation systems (Dokploy, CloudWatch, etc).
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('Order placed', { orderId: '123', amount: 29.99 })
 *   logger.withRequest(requestId, tenantId).warn('Rate limit hit')
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
    level: LogLevel
    message: string
    timestamp: string
    service: string
    tenant_id?: string | null
    request_id?: string | null
    [key: string]: unknown
}

const SERVICE_NAME = 'storefront'

function formatEntry(
    level: LogLevel,
    message: string,
    data: Record<string, unknown> = {},
    context: { tenant_id?: string | null; request_id?: string | null } = {}
): string {
    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        service: SERVICE_NAME,
        ...context,
        ...data,
    }

    // Remove undefined values for cleaner output
    return JSON.stringify(
        entry,
        (_key, value) => (value === undefined ? undefined : value),
    )
}

function createLogger(context: { tenant_id?: string | null; request_id?: string | null } = {}) {
    return {
        debug(message: string, data?: Record<string, unknown>) {
            if (process.env.NODE_ENV === 'production') return // skip debug in prod
            console.debug(formatEntry('debug', message, data, context))
        },

        info(message: string, data?: Record<string, unknown>) {
            console.log(formatEntry('info', message, data, context))
        },

        warn(message: string, data?: Record<string, unknown>) {
            console.warn(formatEntry('warn', message, data, context))
        },

        error(message: string, data?: Record<string, unknown>) {
            console.error(formatEntry('error', message, data, context))
        },

        /**
         * Create a child logger with request-scoped context
         */
        withRequest(requestId: string, tenantId?: string | null) {
            return createLogger({
                ...context,
                request_id: requestId,
                tenant_id: tenantId ?? context.tenant_id,
            })
        },

        /**
         * Create a child logger with tenant context
         */
        withTenant(tenantId: string) {
            return createLogger({ ...context, tenant_id: tenantId })
        },
    }
}

/**
 * Default logger instance. Use `logger.withRequest()` or `logger.withTenant()`
 * for request-scoped or tenant-scoped logging.
 */
export const logger = createLogger({
    tenant_id: process.env.TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || null,
})

export type { LogLevel, LogEntry }
export { createLogger }
