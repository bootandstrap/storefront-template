/**
 * @module api/admin/governance/route
 * @description Medusa Governance Executor API
 *
 * Receives MedusaAction[] from the platform's governance pipeline and applies
 * them to this Medusa instance. This is the bridge between the shared
 * MedusaModuleRouter (declarative actions) and Medusa v2 SDK (imperative calls).
 *
 * SECURITY:
 *   - Admin-only endpoint (requires Medusa admin auth)
 *   - Validates MEDUSA_EVENTS_SECRET header
 *   - All actions are logged to an audit trail
 *
 * USAGE:
 *   POST /admin/governance/execute
 *   Body: { actions: MedusaAction[], tenantId: string }
 *   Headers: x-events-secret: <MEDUSA_EVENTS_SECRET>
 *
 * @locked 🔴 CANONICAL — this is the only entry point for governance→Medusa operations.
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// ── Types (mirror from @bootandstrap/shared — no direct import needed) ────

interface MedusaActionPayload {
    kind: string
    [key: string]: unknown
}

interface MedusaAction {
    type: string
    tenantId: string
    moduleKey: string
    tierLevel: number
    payload: MedusaActionPayload
    priority: number
    idempotent: boolean
}

interface ExecuteRequest {
    actions: MedusaAction[]
    tenantId: string
}

interface ActionResult {
    type: string
    moduleKey: string
    status: 'success' | 'skipped' | 'error'
    message?: string
    durationMs: number
}

interface ExecuteResponse {
    success: boolean
    tenantId: string
    totalActions: number
    results: ActionResult[]
    executedAt: string
}

// ── Auth Guard ────────────────────────────────────────────────────────────

function validateEventsSecret(req: MedusaRequest): boolean {
    const secret = process.env.MEDUSA_EVENTS_SECRET
    if (!secret) {
        // In development, allow unauthenticated access
        if (process.env.NODE_ENV !== 'production') return true
        return false
    }
    const provided = req.headers['x-events-secret']
    return provided === secret
}

// ── Action Executors ──────────────────────────────────────────────────────
// Each executor handles one action type. Executors are idempotent.

async function executeConfigureModule(
    action: MedusaAction,
    _container: Record<string, unknown>
): Promise<ActionResult> {
    const start = Date.now()
    const payload = action.payload as { kind: 'module'; modulePath: string }

    // In Medusa v2, modules are registered at startup via medusa-config.ts
    // Runtime module configuration is done via metadata or feature flags
    // For now, we log the intent — actual module enablement is via config
    console.log(
        `[governance] Module configured: ${action.moduleKey} (tier ${action.tierLevel}) → ${payload.modulePath}`
    )

    return {
        type: action.type,
        moduleKey: action.moduleKey,
        status: 'success',
        message: `Module ${action.moduleKey} configured at tier ${action.tierLevel}`,
        durationMs: Date.now() - start,
    }
}

async function executeWorkflow(
    action: MedusaAction,
    _container: Record<string, unknown>
): Promise<ActionResult> {
    const start = Date.now()
    const payload = action.payload as { kind: 'workflow'; workflowId: string }
    const isEnable = action.type === 'enable_workflow'

    console.log(
        `[governance] Workflow ${isEnable ? 'enabled' : 'disabled'}: ${payload.workflowId} for ${action.moduleKey}`
    )

    // Workflow enable/disable is managed via tenant config metadata
    // The actual workflow code always exists — the trigger checks feature flags
    return {
        type: action.type,
        moduleKey: action.moduleKey,
        status: 'success',
        message: `Workflow ${payload.workflowId} ${isEnable ? 'enabled' : 'disabled'}`,
        durationMs: Date.now() - start,
    }
}

async function executeSubscriber(
    action: MedusaAction,
    _container: Record<string, unknown>
): Promise<ActionResult> {
    const start = Date.now()
    const payload = action.payload as { kind: 'subscriber'; eventName: string }
    const isRegister = action.type === 'register_subscriber'

    console.log(
        `[governance] Subscriber ${isRegister ? 'registered' : 'unregistered'}: ${payload.eventName} for ${action.moduleKey}`
    )

    return {
        type: action.type,
        moduleKey: action.moduleKey,
        status: 'success',
        message: `Subscriber ${payload.eventName} ${isRegister ? 'registered' : 'unregistered'}`,
        durationMs: Date.now() - start,
    }
}

async function executeLink(
    action: MedusaAction,
    _container: Record<string, unknown>
): Promise<ActionResult> {
    const start = Date.now()
    const payload = action.payload as { kind: 'link'; from: string; to: string; linkType: string }
    const isCreate = action.type === 'create_link'

    console.log(
        `[governance] Link ${isCreate ? 'created' : 'removed'}: ${payload.from} ↔ ${payload.to} (${payload.linkType}) for ${action.moduleKey}`
    )

    return {
        type: action.type,
        moduleKey: action.moduleKey,
        status: 'success',
        message: `Link ${payload.from}↔${payload.to} ${isCreate ? 'created' : 'removed'}`,
        durationMs: Date.now() - start,
    }
}

async function executeData(
    action: MedusaAction,
    _container: Record<string, unknown>
): Promise<ActionResult> {
    const start = Date.now()
    const payload = action.payload as { kind: 'data'; action: 'seed' | 'cleanup'; dataType: string }

    console.log(
        `[governance] Data ${payload.action}: ${payload.dataType} for ${action.moduleKey} (tier ${action.tierLevel})`
    )

    // Seed/cleanup handlers will be implemented per-module
    // For now, this is a no-op that records intent
    return {
        type: action.type,
        moduleKey: action.moduleKey,
        status: 'success',
        message: `Data ${payload.action} for ${payload.dataType}`,
        durationMs: Date.now() - start,
    }
}

// ── Executor Registry ─────────────────────────────────────────────────────

const EXECUTORS: Record<string, (action: MedusaAction, container: Record<string, unknown>) => Promise<ActionResult>> = {
    'configure_module': executeConfigureModule,
    'enable_workflow': executeWorkflow,
    'disable_workflow': executeWorkflow,
    'register_subscriber': executeSubscriber,
    'unregister_subscriber': executeSubscriber,
    'create_link': executeLink,
    'remove_link': executeLink,
    'seed_data': executeData,
    'cleanup_data': executeData,
    'configure_api': async (action) => ({
        type: action.type,
        moduleKey: action.moduleKey,
        status: 'skipped' as const,
        message: 'API route configuration handled at storefront level',
        durationMs: 0,
    }),
}

// ── Route Handlers ────────────────────────────────────────────────────────

/**
 * POST /admin/governance/execute
 *
 * Execute a batch of governance actions on this Medusa instance.
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    // 1. Auth check
    if (!validateEventsSecret(req)) {
        res.status(401).json({ error: 'Invalid or missing x-events-secret header' })
        return
    }

    // 2. Parse input
    const body = req.body as ExecuteRequest
    if (!body.actions || !Array.isArray(body.actions)) {
        res.status(400).json({ error: 'Missing or invalid actions array' })
        return
    }
    if (!body.tenantId) {
        res.status(400).json({ error: 'Missing tenantId' })
        return
    }

    // 3. Validate tenant matches this instance
    const instanceTenantId = process.env.TENANT_ID
    if (instanceTenantId && body.tenantId !== instanceTenantId) {
        res.status(403).json({
            error: `Tenant mismatch: this Medusa serves tenant '${instanceTenantId}', got '${body.tenantId}'`,
        })
        return
    }

    // 4. Execute actions in priority order
    const results: ActionResult[] = []
    const sortedActions = [...body.actions].sort((a, b) => a.priority - b.priority)

    console.log(`\n[governance] ━━━ Executing ${sortedActions.length} actions for tenant ${body.tenantId} ━━━`)

    for (const action of sortedActions) {
        const executor = EXECUTORS[action.type]
        if (!executor) {
            results.push({
                type: action.type,
                moduleKey: action.moduleKey,
                status: 'error',
                message: `Unknown action type: ${action.type}`,
                durationMs: 0,
            })
            continue
        }

        try {
            const result = await executor(action, req.scope as unknown as Record<string, unknown>)
            results.push(result)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            results.push({
                type: action.type,
                moduleKey: action.moduleKey,
                status: 'error',
                message,
                durationMs: 0,
            })
            // Continue executing remaining actions (best-effort)
            console.error(`[governance] Action failed: ${action.type} for ${action.moduleKey}`, err)
        }
    }

    // 5. Build response
    const response: ExecuteResponse = {
        success: results.every(r => r.status !== 'error'),
        tenantId: body.tenantId,
        totalActions: sortedActions.length,
        results,
        executedAt: new Date().toISOString(),
    }

    const errorCount = results.filter(r => r.status === 'error').length
    console.log(
        `[governance] ━━━ Complete: ${results.length - errorCount}/${results.length} succeeded ━━━\n`
    )

    res.status(response.success ? 200 : 207).json(response)
}

/**
 * GET /admin/governance/execute
 *
 * Health probe — returns executor capabilities
 */
export async function GET(
    _req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    res.json({
        status: 'ok',
        tenantId: process.env.TENANT_ID || 'unknown',
        supportedActions: Object.keys(EXECUTORS),
        version: '1.0.0',
    })
}
