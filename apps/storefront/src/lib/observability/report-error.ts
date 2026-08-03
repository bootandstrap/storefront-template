/**
 * reportError — Unified error reporting utility
 *
 * Dual-write strategy:
 * 1. Sentry (if DSN configured) — for external monitoring, alerting, performance
 * 2. tenant_errors table (always) — for SuperAdmin Error Inbox
 *
 * Non-blocking. Safe to call from any server context.
 */

import 'server-only'

import * as Sentry from '@sentry/nextjs'
import { logTenantError } from '@/lib/log-tenant-error'
import { logger } from '@/lib/logger'

type ErrorSeverity = 'error' | 'warning' | 'critical'
type ErrorSource = 'webhook' | 'registration' | 'medusa' | 'config' | 'rls' | 'build' | 'checkout' | 'chat' | 'returns' | string

interface ReportErrorParams {
    error: Error | string
    source: ErrorSource
    severity?: ErrorSeverity
    details?: Record<string, unknown>
}

const ALLOWLISTED_DETAIL_KEYS = new Set([
    'trace_id',
    'tenant_id',
    'revision',
    'operation',
    'outcome',
    'duration_ms',
    'error_class',
    'request_id',
])

function allowlistedDetails(details: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(details).filter(([key, value]) =>
            ALLOWLISTED_DETAIL_KEYS.has(key)
            && (value === null || ['string', 'number', 'boolean'].includes(typeof value)),
        ),
    )
}

/**
 * Reports an error to both Sentry and the tenant_errors table.
 * Non-blocking — will not throw.
 */
export async function reportError({
    error,
    source,
    severity = 'error',
    details = {},
}: ReportErrorParams): Promise<void> {
    const message = error instanceof Error ? error.message : error
    const errorObj = error instanceof Error ? error : new Error(error)
    const safeDetails = allowlistedDetails(details)
    const traceId = typeof safeDetails.trace_id === 'string'
        ? safeDetails.trace_id
        : crypto.randomUUID()
    const tenantId = typeof safeDetails.tenant_id === 'string'
        ? safeDetails.tenant_id
        : null
    const revision = typeof safeDetails.revision === 'string'
        ? safeDetails.revision
        : process.env.DEPLOY_SHA || process.env.npm_package_version || 'dev'

    // 1. Sentry — if configured and initialized
    try {
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            Sentry.withScope((scope) => {
                scope.setTag('source', source)
                scope.setTag('severity', severity)
                scope.setExtras(safeDetails)

                if (severity === 'critical') {
                    scope.setLevel('fatal')
                } else if (severity === 'warning') {
                    scope.setLevel('warning')
                } else {
                    scope.setLevel('error')
                }

                Sentry.captureException(errorObj)
            })
        }
    } catch {
        // Sentry failure should never block
        logger.error('[reportError] Sentry capture failed')
    }

    try {
        await logger.evidence({
            trace_id: traceId,
            tenant_id: tenantId,
            revision,
            operation: `error.${source}`,
            outcome: 'failure',
            duration_ms: typeof safeDetails.duration_ms === 'number'
                ? safeDetails.duration_ms
                : 0,
            error_class: errorObj.name,
            attributes: { severity, source },
        })
    } catch {
        logger.error('[reportError] Evidence emission failed')
    }

    // 2. Supabase tenant_errors table — always (the fallback)
    await logTenantError({ source, message, severity, details: safeDetails })
}

/**
 * Check if Sentry is actively configured.
 * Used by admin settings to show status badge.
 */
export function isSentryConfigured(): boolean {
    return !!process.env.NEXT_PUBLIC_SENTRY_DSN
}
