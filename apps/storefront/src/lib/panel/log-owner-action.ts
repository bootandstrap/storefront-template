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

import { createClient } from '@/lib/supabase/client'

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

interface LogOptions {
    /** User-friendly description for the audit log */
    description?: string
    /** Severity level */
    severity?: 'info' | 'warning' | 'error'
    /** Skip logging if true (for dev/test) */
    skip?: boolean
}

export async function logOwnerAction(
    tenantId: string,
    action: `${OwnerActionCategory}.${string}`,
    metadata?: Record<string, unknown>,
    options?: LogOptions
): Promise<void> {
    if (options?.skip) return

    try {
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()

        await supabase.from('audit_log').insert({
            tenant_id: tenantId,
            action,
            user_id: user?.id || null,
            metadata: {
                ...metadata,
                description: options?.description,
                severity: options?.severity || 'info',
                timestamp: new Date().toISOString(),
                source: 'owner_panel',
            },
        })
    } catch (err) {
        // Non-blocking — audit logging should never break the UI
        console.warn('[audit] Failed to log owner action:', action, err)
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
