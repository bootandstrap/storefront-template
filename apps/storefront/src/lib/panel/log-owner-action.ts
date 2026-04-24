import 'server-only'
/**
 * logOwnerAction — Audit logging helper for owner panel actions
 *
 * Sends owner actions to the audit_log table in Supabase.
 * Every mutation in the panel should call this for traceability.
 *
 * Usage:
 *   await logOwnerAction(tenantId, 'product.create', { productId: '123', name: 'T-Shirt' })
 *   await logOwnerAction(tenantId, 'order.fulfill', { orderId: '456' })
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type OwnerActionCategory =
    | 'product'
    | 'order'
    | 'customer'
    | 'store'
    | 'inventory'
    | 'shipping'
    | 'subscription'
    | 'module'
    | 'page'
    | 'seo'
    | 'email'
    | 'analytics'
    | 'crm'
    | 'review'
    | 'carousel'
    | 'badge'
    | 'chatbot'
    | 'whatsapp'
    | 'return'
    | 'automation'
    | 'auth'
    | 'channel'
    | 'i18n'
    | 'social'
    | 'settings'
    | 'export'
    | 'pos'
    | 'capacity'
    | 'promotion'

interface LogOptions {
    /** User-friendly description for the audit log */
    description?: string
    /** Severity level */
    severity?: 'info' | 'warning' | 'error'
    /** The user ID performing the action (if available from auth context) */
    userId?: string
    /** Skip logging if true (for dev/test) */
    skip?: boolean
}

/**
 * Log an owner action to the audit_log table.
 *
 * Uses admin client (bypasses RLS) — safe for server actions.
 * Non-blocking: never throws, never breaks the calling action.
 *
 * @note For new actions, prefer using `panelAction` from `lib/safe-action.ts`
 *       which auto-audits via middleware. Use this function for legacy actions
 *       that haven't been migrated yet.
 */
export async function logOwnerAction(
    tenantId: string,
    action: `${OwnerActionCategory}.${string}`,
    metadata?: Record<string, unknown>,
    options?: LogOptions
): Promise<void> {
    if (options?.skip) return

    try {
        const admin = createAdminClient()

        await (admin as any).from('audit_log').insert({
            tenant_id: tenantId,
            action,
            user_id: options?.userId || null,
            metadata: {
                ...metadata,
                description: options?.description,
                severity: options?.severity || 'info',
                timestamp: new Date().toISOString(),
                source: 'owner_panel',
            },
        })
    } catch (err) {
        // Non-blocking — audit logging should never break the action
        logger.warn('[audit] Failed to log owner action', { action, error: err })
    }
}

/**
 * Quick helper for generating duration-formatted strings
 */
export function formatActionDuration(startMs: number): string {
    const ms = Date.now() - startMs
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}
