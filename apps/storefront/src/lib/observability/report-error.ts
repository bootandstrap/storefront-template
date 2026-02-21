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

type ErrorSeverity = 'error' | 'warning' | 'critical'
type ErrorSource = 'webhook' | 'registration' | 'medusa' | 'config' | 'rls' | 'build' | 'checkout' | 'chat' | 'returns' | string

interface ReportErrorParams {
    error: Error | string
    source: ErrorSource
    severity?: ErrorSeverity
    details?: Record<string, unknown>
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

    // 1. Sentry — if configured and initialized
    try {
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            Sentry.withScope((scope) => {
                scope.setTag('source', source)
                scope.setTag('severity', severity)
                scope.setExtras(details)

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
        console.error('[reportError] Sentry capture failed')
    }

    // 2. Supabase tenant_errors table — always (the fallback)
    await logTenantError({ source, message, severity, details })
}

/**
 * Check if Sentry is actively configured.
 * Used by admin settings to show status badge.
 */
export function isSentryConfigured(): boolean {
    return !!process.env.NEXT_PUBLIC_SENTRY_DSN
}
