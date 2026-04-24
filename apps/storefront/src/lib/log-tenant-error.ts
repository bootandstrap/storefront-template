/**
 * logTenantError — Logs runtime errors to the `tenant_errors` table
 * for display in the SuperAdmin Error Inbox.
 *
 * Uses service_role client (bypasses RLS). Non-blocking (fire-and-forget).
 * Safe to call from any server context (webhooks, server actions, API routes).
 */

import 'server-only'
import { logger } from '@/lib/logger'

type ErrorSeverity = 'error' | 'warning' | 'critical'
type ErrorSource = 'webhook' | 'registration' | 'medusa' | 'config' | 'rls' | 'build' | string

interface LogErrorParams {
    source: ErrorSource
    message: string
    severity?: ErrorSeverity
    details?: Record<string, unknown>
}

export async function logTenantError({
    source,
    message,
    severity = 'error',
    details = {},
}: LogErrorParams): Promise<void> {
    try {
        const tenantId = process.env.TENANT_ID
        if (!tenantId) {
            logger.warn('[logTenantError] TENANT_ID not set — skipping error log')
            return
        }

        // Dynamic import to avoid circular dependencies and module evaluation issues
        // Uses governance client — tenant_errors lives in the central hub
        const { createGovernanceClient, getGovernanceMode } = await import('@/lib/supabase/governance')
        const supabase = createGovernanceClient()
        const mode = getGovernanceMode()

        if (mode === 'rpc') {
            // Phase 4.1: RPC via anon key (no service_role needed)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.rpc as any)('log_tenant_error', {
                p_tenant_id: tenantId,
                p_source: source,
                p_severity: severity,
                p_message: message,
                p_details: details,
            })

            if (error) {
                logger.error('[logTenantError] RPC failed:', error.message)
            }
        } else {
            // Legacy: direct insert via service_role
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('tenant_errors') as any).insert({
                tenant_id: tenantId,
                source,
                severity,
                message,
                details,
            })

            if (error) {
                logger.error('[logTenantError] Failed to insert:', error.message)
            }
        }
    } catch (err) {
        // Non-blocking: log to console if insert fails
        logger.error('[logTenantError] Exception:', err instanceof Error ? err.message : err)
    }
}
