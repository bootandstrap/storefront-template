/**
 * @module billing/types
 * @description Provider-agnostic billing types for multi-provider payment support.
 *
 * BootandStrap Business Model:
 *   - Web Base: 1500 CHF one-time (Stripe manual capture → reserve → capture)
 *   - Maintenance: 40 CHF/mo recurring (1st month free trial)
 *   - Modules: variable per module/tier (recurring subscriptions)
 *
 * This abstraction enables swapping Stripe for LemonSqueezy, Paddle, etc.
 * without changing business logic in the governance engine or provisioning pipeline.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */

// ── Billing Provider Identity ─────────────────────────────────────────────

/** Supported billing providers */
export type BillingProvider = 'stripe' | 'lemon_squeezy' | 'paddle' | 'mock'

/** Currency codes supported by BootandStrap */
export type BillingCurrency = 'CHF' | 'EUR' | 'USD'

// ── Core Gateway Interface ────────────────────────────────────────────────

/**
 * BillingGateway — Strategy interface for multi-provider billing.
 *
 * Each method is designed to be provider-agnostic:
 * - Input types use BootandStrap domain concepts (tenant, module, tier)
 * - Output types are normalized wrappers around provider-specific responses
 * - Errors are caught and returned as { error: string | null } — never thrown
 *
 * Implementations:
 *   - StripeBillingGateway (production)
 *   - MockBillingGateway (tests, local dev, demo)
 *   - LemonSqueezyGateway (future)
 */
export interface BillingGateway {
    /** Provider identifier for logging and diagnostics */
    readonly provider: BillingProvider

    // ── Customer Management ───────────────────────────────────────────────

    /** Create a billing customer for a tenant */
    createCustomer(params: CreateCustomerParams): Promise<CustomerResult>

    /** Get customer details by tenant ID */
    getCustomer(tenantId: string): Promise<CustomerResult>

    /** Create a customer portal session (self-service billing management) */
    createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult>

    // ── Subscription Management ───────────────────────────────────────────

    /** Create the maintenance subscription for a newly provisioned tenant */
    createMaintenanceSubscription(params: MaintenanceSubscriptionParams): Promise<SubscriptionResult>

    /** Get subscription status for a tenant */
    getSubscription(tenantId: string): Promise<SubscriptionResult>

    /** Cancel a tenant's subscription (at period end by default) */
    cancelSubscription(params: CancelSubscriptionParams): Promise<OperationResult>

    // ── Module Billing ────────────────────────────────────────────────────

    /** Create a checkout session for a module purchase */
    createModuleCheckout(params: ModuleCheckoutParams): Promise<CheckoutResult>

    /** Add a module to an existing subscription */
    addModuleToSubscription(params: AddModuleParams): Promise<ModuleSubscriptionResult>

    /** Remove a module from a subscription */
    removeModuleFromSubscription(params: RemoveModuleParams): Promise<OperationResult>

    /** Change a module's tier (upgrade/downgrade) */
    changeModuleTier(params: ChangeModuleTierParams): Promise<OperationResult>

    /** List active module subscriptions for a tenant */
    listModuleSubscriptions(tenantId: string): Promise<ModuleListResult>

    // ── Entitlements ──────────────────────────────────────────────────────

    /** Resolve module entitlements from a customer's active subscriptions */
    resolveEntitlements(tenantId: string): Promise<EntitlementResult>

    // ── Webhook Processing ────────────────────────────────────────────────

    /** Process a billing webhook event (provider-specific payload) */
    handleWebhook(event: BillingWebhookEvent): Promise<WebhookResult>
}

// ── Parameter Types ───────────────────────────────────────────────────────

export interface CreateCustomerParams {
    tenantId: string
    tenantName: string
    ownerEmail?: string | null
    currency?: BillingCurrency
    /** Provider-specific metadata (e.g., Stripe metadata fields) */
    metadata?: Record<string, string>
}

export interface PortalSessionParams {
    tenantId: string
    returnUrl: string
}

export interface MaintenanceSubscriptionParams {
    tenantId: string
    tenantName: string
    ownerEmail?: string | null
    currency?: BillingCurrency
    /** Override trial period (default: 30 days) */
    trialDays?: number
}

export interface CancelSubscriptionParams {
    tenantId: string
    /** If true, cancel immediately. If false (default), cancel at period end */
    immediately?: boolean
}

export interface ModuleCheckoutParams {
    tenantId: string
    moduleKey: string
    tierLevel: number
    /** URL to redirect after successful checkout */
    successUrl: string
    /** URL to redirect after cancelled checkout */
    cancelUrl: string
    currency?: BillingCurrency
}

export interface AddModuleParams {
    tenantId: string
    moduleKey: string
    /** Provider-specific price ID */
    priceId: string
}

export interface RemoveModuleParams {
    tenantId: string
    moduleKey: string
}

export interface ChangeModuleTierParams {
    tenantId: string
    moduleKey: string
    newTierKey: string
    /** Provider-specific price ID for the new tier */
    newPriceId: string
}

// ── Result Types ──────────────────────────────────────────────────────────

/** Base result — all results include an error field */
export interface OperationResult {
    error: string | null
}

export interface CustomerResult extends OperationResult {
    customerId: string | null
    email?: string | null
}

export interface PortalSessionResult extends OperationResult {
    url: string | null
}

export interface SubscriptionResult extends OperationResult {
    subscriptionId: string | null
    customerId: string | null
    status: SubscriptionStatus | null
}

export interface CheckoutResult extends OperationResult {
    checkoutUrl: string | null
    sessionId: string | null
}

export interface ModuleSubscriptionResult extends OperationResult {
    subscriptionItemId: string | null
}

export interface ModuleListResult extends OperationResult {
    modules: ModuleSubscriptionItem[]
}

export interface EntitlementResult extends OperationResult {
    entitlements: ModuleEntitlement[]
}

export interface WebhookResult extends OperationResult {
    handled: boolean
    eventType: string
    tenantId?: string
}

// ── Domain Types ──────────────────────────────────────────────────────────

export type SubscriptionStatus =
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'unpaid'
    | 'cancelled'
    | 'incomplete'

/** A module subscription item on a tenant's billing account */
export interface ModuleSubscriptionItem {
    moduleKey: string
    itemId: string
    priceId: string
    tierLevel?: number
    status: SubscriptionStatus
}

/**
 * Resolved entitlement for a module — derived from billing subscriptions.
 * This is the bridge between billing and governance:
 *   entitlement.enabledFlags → feature_flags table
 *   entitlement.limitOverrides → plan_limits table
 */
export interface ModuleEntitlement {
    moduleKey: string
    tierLevel: number
    tierName: string
    /** Feature flags this entitlement enables */
    enabledFlags: string[]
    /** Plan limit overrides (e.g., { max_pos_payment_methods: 10 }) */
    limitOverrides: Record<string, number>
    /** Provider-specific subscription item ID */
    providerItemId?: string
}

/** Normalized webhook event — provider implementations convert their format to this */
export interface BillingWebhookEvent {
    /** Provider-specific event type (e.g., 'invoice.paid') */
    type: string
    /** Provider-specific event data */
    data: Record<string, unknown>
    /** Raw event for signature verification */
    rawBody?: string
    /** Signature header for verification */
    signature?: string
}
