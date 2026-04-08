/**
 * @module api/admin/governance/provision
 * @description Governance-driven store provisioning endpoint.
 *
 * Called by the BSWEB provisioner after creating a tenant in Supabase.
 * Triggers the `provision-store` Medusa workflow which:
 *   1. Creates admin user
 *   2. Creates default region + currency
 *   3. Creates sales channel
 *   4. Creates publishable API key
 *   5. Optionally seeds demo products
 *   6. Notifies the storefront
 *
 * All steps are idempotent with compensation (rollback on failure).
 *
 * Auth: x-medusa-events-secret header (shared secret with BSWEB)
 *
 * POST /admin/governance/provision
 *   Body: ProvisionStoreInput
 *   Response: { success: boolean, result: ProvisionStoreOutput }
 *
 * GET /admin/governance/provision
 *   Response: { status: "ready", tenant_id: string }
 *
 * @locked 🔴 PLATFORM — Do not customize per tenant.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import provisionStoreWorkflow from "../../../workflows/provision-store"

// ── Auth guard ────────────────────────────────────────────────────────────

function isAuthorized(req: MedusaRequest): boolean {
    const secret = process.env.MEDUSA_EVENTS_SECRET
    if (!secret) {
        // No secret configured → reject all requests
        console.warn("[governance/provision] MEDUSA_EVENTS_SECRET not set — rejecting")
        return false
    }

    const header = req.headers["x-medusa-events-secret"]
    return header === secret
}

// ── POST: Trigger provisioning workflow ───────────────────────────────────

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    if (!isAuthorized(req)) {
        res.status(401).json({ error: "Unauthorized", message: "Invalid or missing x-medusa-events-secret" })
        return
    }

    try {
        const body = req.body as {
            tenant_id?: string
            admin_email?: string
            admin_password?: string
            country_code?: string
            currency_code?: string
            store_name?: string
            seed_demo?: boolean
        }

        // Validate required fields
        if (!body.tenant_id || !body.admin_email || !body.admin_password) {
            res.status(400).json({
                error: "Bad Request",
                message: "Missing required fields: tenant_id, admin_email, admin_password",
            })
            return
        }

        // Cross-tenant protection
        const envTenantId = process.env.TENANT_ID
        if (envTenantId && body.tenant_id !== envTenantId) {
            console.warn(
                JSON.stringify({
                    level: "warn",
                    event: "provision.cross_tenant_rejected",
                    requested: body.tenant_id,
                    actual: envTenantId,
                })
            )
            res.status(403).json({
                error: "Forbidden",
                message: "Tenant ID mismatch — this Medusa instance serves a different tenant",
            })
            return
        }

        console.log(
            JSON.stringify({
                level: "info",
                event: "provision.workflow_triggered",
                tenant_id: body.tenant_id,
                admin_email: body.admin_email,
            })
        )

        // Execute the provision-store workflow
        const { result } = await provisionStoreWorkflow(req.scope).run({
            input: {
                tenant_id: body.tenant_id,
                admin_email: body.admin_email,
                admin_password: body.admin_password,
                country_code: body.country_code || "ch",
                currency_code: body.currency_code || "chf",
                store_name: body.store_name || "BootandStrap Store",
                seed_demo: body.seed_demo ?? false,
            },
        })

        console.log(
            JSON.stringify({
                level: "info",
                event: "provision.workflow_complete",
                tenant_id: body.tenant_id,
                admin_created: result.admin_created,
                region_id: result.region_id,
                publishable_key: result.publishable_key ? "***" : null,
            })
        )

        res.status(200).json({
            success: true,
            result: {
                tenant_id: result.tenant_id,
                admin_created: result.admin_created,
                region_id: result.region_id,
                sales_channel_id: result.sales_channel_id,
                publishable_key: result.publishable_key,
                products_seeded: result.products_seeded,
            },
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(
            JSON.stringify({
                level: "error",
                event: "provision.workflow_error",
                error: message,
            })
        )
        res.status(500).json({
            success: false,
            error: message,
        })
    }
}

// ── GET: Readiness probe ─────────────────────────────────────────────────

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    res.status(200).json({
        status: "ready",
        tenant_id: process.env.TENANT_ID || null,
        endpoint: "/admin/governance/provision",
        method: "POST",
        required_headers: ["x-medusa-events-secret"],
        required_body: ["tenant_id", "admin_email", "admin_password"],
        optional_body: ["country_code", "currency_code", "store_name", "seed_demo"],
    })
}
