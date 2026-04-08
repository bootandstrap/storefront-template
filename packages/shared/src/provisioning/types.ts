/**
 * @module provisioning/types
 * @description Types for the UnifiedProvisioner — single pipeline for all environments.
 *
 * The provisioner operates in 4 modes:
 *   - local:      Seeds governance from contract. MockBilling. No Dokploy.
 *   - demo:       All flags enabled, max limits. MockBilling. Optional Dokploy.
 *   - staging:    Real governance but mock billing. No Stripe charges.
 *   - production: Full pipeline — Stripe billing, Dokploy deploy, GitHub repo creation.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */

import type { BillingCurrency } from '../billing/types'

// ── Mode ──────────────────────────────────────────────────────────────────

export type ProvisionerMode = 'local' | 'demo' | 'staging' | 'production'

// ── Input ─────────────────────────────────────────────────────────────────

export interface ProvisionTenantInput {
    /** Tenant UUID (auto-generated if not provided) */
    tenantId?: string
    /** Human-readable tenant/store name */
    tenantName: string
    /** URL-safe slug (auto-generated from name if not provided) */
    slug?: string
    /** Owner email (required for production, optional for local/demo) */
    ownerEmail?: string | null
    /** Store domain (e.g., campifruit.bootandstrap.com) */
    domain?: string
    /** Billing currency */
    currency?: BillingCurrency

    /** Module bundle to activate (e.g., 'all_max' for demo) */
    moduleBundle?: string | null
    /** Skip billing operations (useful for staging) */
    skipBilling?: boolean
    /** Skip GitHub repo creation (useful for local/staging) */
    skipRepoCreation?: boolean
    /** Skip Dokploy deployment (useful for local) */
    skipDeploy?: boolean

    /** Industry template ID for seeding config */
    templateId?: string
    /** Additional metadata pass-through */
    metadata?: Record<string, unknown>
}

// ── Output ────────────────────────────────────────────────────────────────

export interface ProvisionResult {
    success: boolean
    tenantId: string
    slug: string
    mode: ProvisionerMode

    /** Steps executed with individual results */
    steps: ProvisionStepResult[]

    /** Stripe IDs (null in mock mode) */
    billing: {
        customerId: string | null
        subscriptionId: string | null
        provider: string
    }

    /** Module activation result */
    modules: {
        flagsEnabled: number
        flagsTotal: number
        limitsSet: number
    }

    /** Errors accumulated during provisioning (non-fatal errors don't fail the pipeline) */
    warnings: string[]

    /** Total time in ms */
    durationMs: number
}

/** Individual step result in the provisioning pipeline */
export interface ProvisionStepResult {
    step: ProvisionStep
    status: 'success' | 'skipped' | 'failed'
    durationMs: number
    error?: string
    details?: Record<string, unknown>
}

export type ProvisionStep =
    | 'validate_input'
    | 'create_tenant'
    | 'seed_config'
    | 'seed_flags'
    | 'seed_limits'
    | 'create_billing_customer'
    | 'create_subscription'
    | 'apply_module_bundle'
    | 'create_github_repo'
    | 'deploy_infrastructure'
    | 'verify_health'

// ── Governance Source ──────────────────────────────────────────────────────

/** Contract structure — loaded from governance-contract.json */
export interface GovernanceContractSource {
    version?: string
    flags: {
        keys: string[]
        defaults?: Record<string, boolean>
    }
    limits: {
        keys: string[]
        defaults?: Record<string, number | string | null>
    }
    /** Module catalog — real contract uses {catalog: [...]} wrapper */
    modules?: {
        catalog?: Array<{
            key: string
            name: string
            icon?: string
            description?: string
            category?: string
            popular?: boolean
            requires?: string[]
            payment_type?: string
            tiers?: Array<{
                key: string
                name: string
                price_chf?: number
                features?: string[]
                recommended?: boolean
                flag_effects?: Record<string, boolean>
                limit_effects?: Record<string, number>
                stripe_price_ids?: Record<string, string>
            }>
        }>
        count?: number
        keys?: string[]
        payment_types?: string[]
    }
}

// ── Config Source ──────────────────────────────────────────────────────────

/** Store config template for seeding */
export interface StoreConfigTemplate {
    business_name: string
    primary_color?: string
    accent_color?: string
    language?: string
    default_currency?: string
    active_currencies?: string[]
    active_languages?: string[]
    timezone?: string
    contact_phone?: string
    logo_url?: string
    description?: string
    store_email?: string
}

// ── Dependencies Interface ────────────────────────────────────────────────
// The UnifiedProvisioner uses dependency injection for external services.
// This allows each mode to provide the right implementation.

export interface ProvisionerDependencies {
    /** Supabase admin client for DB operations */
    supabase: SupabaseProvisionClient
    /** Billing gateway (Stripe or Mock) */
    billing: import('../billing/types').BillingGateway
    /** Logger */
    log: (icon: string, message: string) => void
    /** Contract source (governance-contract.json content) */
    contract: GovernanceContractSource
}

/** Minimal Supabase interface needed by the provisioner */
export interface SupabaseProvisionClient {
    from(table: string): {
        select(columns?: string): {
            eq(column: string, value: string): {
                maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
                single(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
            }
        }
        insert(row: Record<string, unknown>): Promise<{ error: { message: string } | null }>
        upsert(row: Record<string, unknown>, options?: { onConflict: string }): Promise<{ error: { message: string } | null }>
        update(row: Record<string, unknown>): {
            eq(column: string, value: string): Promise<{ error: { message: string } | null }>
        }
    }
}

// ── Max Limits Preset ─────────────────────────────────────────────────────

/** Enterprise max limits — used for demo mode and full-featured testing */
export const ENTERPRISE_MAX_LIMITS: Record<string, number | string | null> = {
    plan_name: 'enterprise_max',
    plan_tier: 'enterprise',
    plan_expires_at: null,
    max_products: 10000,
    max_categories: 1000,
    max_orders_month: 100000,
    max_customers: 100000,
    max_admin_users: 50,
    max_email_sends_month: 100000,
    max_requests_day: 1000000,
    storage_limit_mb: 50000,
    max_images_per_product: 50,
    max_cms_pages: 200,
    max_carousel_slides: 50,
    max_languages: 20,
    max_currencies: 20,
    max_whatsapp_templates: 100,
    max_file_upload_mb: 500,
    max_custom_domains: 10,
    max_badges: 100,
    max_newsletter_subscribers: 100000,
    max_chatbot_messages_month: 50000,
    max_reviews_per_product: 500,
    max_wishlist_items: 1000,
    max_promotions_active: 100,
    max_payment_methods: 10,
    max_crm_contacts: 100000,
    max_pos_payment_methods: 10,
    max_automations: 100,
    max_pos_kiosk_devices: 50,
}
