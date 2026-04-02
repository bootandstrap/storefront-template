/**
 * Safe Action Client — Composable Middleware Pipeline for Panel Server Actions
 *
 * Built on `next-safe-action` v8 — provides type-safe, validated server actions
 * with automatic audit logging, authentication, and plan limit enforcement.
 *
 * Architecture:
 *   actionClient            → base: perf logging + metadata
 *   └─ panelAction          → auth + config + **auto-audit** after success
 *      └─ limitedAction()   → factory: adds plan limit check for a resource
 *
 * Usage:
 *   // Simple panel action with auto-audit:
 *   export const myAction = panelAction
 *     .metadata({ actionName: 'create', category: 'product' })
 *     .schema(z.object({ title: z.string() }))
 *     .action(async ({ parsedInput, ctx }) => {
 *       // ctx.tenantId, ctx.appConfig, ctx.user, ctx.role available
 *       return { success: true }
 *     })
 *
 *   // Panel action with limit enforcement:
 *   export const createProduct = limitedAction('max_products', getProductCount)
 *     .metadata({ actionName: 'create', category: 'product' })
 *     .schema(createProductSchema)
 *     .action(async ({ parsedInput, ctx }) => {
 *       // Limit already checked — action only runs if within limits
 *       return { success: true }
 *     })
 *
 * @module safe-action
 * @see https://next-safe-action.dev
 */

import { createSafeActionClient } from 'next-safe-action'
import { z } from 'zod'
import { requirePanelAuth } from './panel-auth'
import { getConfigForTenant, type AppConfig } from './config'
import { checkLimit, type LimitableResource } from './limits'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OwnerActionCategory } from './panel/log-owner-action'

// ---------------------------------------------------------------------------
// Metadata Schema — every action self-describes
// ---------------------------------------------------------------------------

const metadataSchema = z.object({
  /** Verb: what operation (create, update, delete, save, import, export, moderate, approve, etc.) */
  actionName: z.string(),
  /** Domain: which module (product, order, settings, crm, email, seo, pos, review, etc.) */
  category: z.string(),
})

export type ActionMetadata = z.infer<typeof metadataSchema>

// ---------------------------------------------------------------------------
// Layer 1: Base client — performance monitoring + metadata
// ---------------------------------------------------------------------------

export const actionClient = createSafeActionClient({
  defineMetadataSchema: () => metadataSchema,
  handleServerError(error) {
    // Structured error for client consumption
    console.error('[safe-action] Server error:', error.message)
    return error.message
  },
})

// ---------------------------------------------------------------------------
// Layer 2: Authenticated Panel client — auth + config + auto-audit
// ---------------------------------------------------------------------------

export const panelAction = actionClient.use(async ({ next, metadata }) => {
  const startTime = performance.now()

  // Auth: throws if not authenticated or wrong role
  const auth = await requirePanelAuth()

  // Config: fetches full tenant config (featureFlags, planLimits, config)
  const appConfig = await getConfigForTenant(auth.tenantId)

  // Execute the action with enriched context
  const result = await next({
    ctx: {
      tenantId: auth.tenantId,
      user: auth.user,
      role: auth.role,
      supabase: auth.supabase,
      appConfig,
    },
  })

  // ── Auto-audit: log AFTER successful execution (non-blocking) ──
  const duration = Math.round(performance.now() - startTime)
  try {
    const admin = createAdminClient()
    await (admin as ReturnType<typeof createAdminClient>).from('audit_log' as any).insert({
      tenant_id: auth.tenantId,
      action: `${metadata.category}.${metadata.actionName}`,
      user_id: auth.user.id,
      metadata: {
        duration_ms: duration,
        severity: 'info',
        timestamp: new Date().toISOString(),
        source: 'panel_action',
        user_email: auth.user.email,
        role: auth.role,
      },
    } as any)
  } catch (err) {
    // Non-blocking — audit logging should never break the action
    console.warn(`[audit] Failed to log: ${metadata.category}.${metadata.actionName}`, err)
  }

  // Warn on slow actions (>2s)
  if (duration > 2000) {
    console.warn(`[slow-action] ${metadata.category}.${metadata.actionName}: ${duration}ms`)
  }

  return result
})

// ---------------------------------------------------------------------------
// Layer 3: Limited Panel Action — factory for actions requiring limit checks
// ---------------------------------------------------------------------------

/**
 * Creates a safe action client that enforces a plan limit before execution.
 *
 * @param resource - The limit key (e.g., 'max_products', 'max_categories')
 * @param getCurrentCount - Async function that returns the current usage count
 *
 * @example
 * ```ts
 * export const createProduct = limitedAction('max_products', async () => {
 *   const { count } = await getAdminProductsFull({ limit: 0 })
 *   return count ?? 0
 * })
 *   .metadata({ actionName: 'create', category: 'product' })
 *   .schema(createProductSchema)
 *   .action(async ({ parsedInput, ctx }) => { ... })
 * ```
 */
export function limitedAction(
  resource: LimitableResource,
  getCurrentCount: () => Promise<number>
) {
  return panelAction.use(async ({ next, ctx }) => {
    const currentCount = await getCurrentCount()
    const result = checkLimit(ctx.appConfig.planLimits, resource, currentCount)

    if (!result.allowed) {
      throw new Error(
        `LIMIT_EXCEEDED:${resource}:${result.current}/${result.limit}`
      )
    }

    return next({
      ctx: {
        ...ctx,
        limitCheck: result,
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Type exports for consumers
// ---------------------------------------------------------------------------

/** Context available inside a panelAction */
export type PanelActionContext = {
  tenantId: string
  user: { id: string; email?: string }
  role: string
  supabase: Awaited<ReturnType<typeof requirePanelAuth>>['supabase']
  appConfig: AppConfig
}
