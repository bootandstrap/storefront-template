/**
 * Structured Logger — Production-grade logging utility
 *
 * Provides JSON-structured log output with tenant_id, request_id, and
 * trace_id for cross-service correlation (SuperAdmin → Storefront → Medusa).
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('Order placed', { orderId: '123', amount: 29.99 })
 *   logger.withRequest(requestId, tenantId).warn('Rate limit hit')
 *   logger.withTrace(traceId).info('Cross-service call')
 *   const result = await logger.timed('fetch-config', fetchConfig)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
    level: LogLevel
    message: string
    timestamp: string
    service: string
    version?: string
    tenant_id?: string | null
    request_id?: string | null
    trace_id?: string | null
    duration_ms?: number
    [key: string]: unknown
}

const SERVICE_NAME = 'storefront'
const SERVICE_VERSION = process.env.npm_package_version || process.env.DEPLOY_SHA || 'dev'

function formatEntry(
    level: LogLevel,
    message: string,
    data: Record<string, unknown> = {},
    context: { tenant_id?: string | null; request_id?: string | null; trace_id?: string | null } = {}
): string {
    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        ...context,
        ...data,
    }

    // Remove undefined values for cleaner output
    return JSON.stringify(
        entry,
        (_key, value) => (value === undefined ? undefined : value),
    )
}

function createLogger(context: { tenant_id?: string | null; request_id?: string | null; trace_id?: string | null } = {}) {
    /** Normalize any log data to Record<string, unknown> for JSON output */
    function normalizeData(data: unknown): Record<string, unknown> | undefined {
        if (data === undefined || data === null) return undefined
        if (typeof data === 'string') return { detail: data }
        if (data instanceof Error) return { error: data.message, stack: data.stack }
        if (typeof data === 'object') return data as Record<string, unknown>
        return { value: data }
    }

    return {
        debug(message: string, data?: unknown) {
            if (process.env.NODE_ENV === 'production') return // skip debug in prod
            console.debug(formatEntry('debug', message, normalizeData(data), context))
        },

        info(message: string, data?: unknown) {
            console.log(formatEntry('info', message, normalizeData(data), context))
        },

        warn(message: string, data?: unknown) {
            console.warn(formatEntry('warn', message, normalizeData(data), context))
        },

        error(message: string, data?: unknown) {
            console.error(formatEntry('error', message, normalizeData(data), context))
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

        /**
         * Create a child logger with a global trace ID for cross-service
         * correlation (e.g., SuperAdmin → Storefront → Medusa).
         */
        withTrace(traceId: string) {
            return createLogger({ ...context, trace_id: traceId })
        },

        /**
         * Execute an async operation and log its duration.
         * Useful for SLO tracking on critical paths like config fetch.
         */
        async timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
            const t0 = Date.now()
            try {
                const result = await fn()
                const duration_ms = Date.now() - t0
                console.log(formatEntry('info', `${label} completed`, { duration_ms }, context))
                return result
            } catch (err) {
                const duration_ms = Date.now() - t0
                console.error(formatEntry('error', `${label} failed`, {
                    duration_ms,
                    error: err instanceof Error ? err.message : String(err),
                }, context))
                throw err
            }
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
