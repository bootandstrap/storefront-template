/**
 * @module billing/providers/stripe
 * @description Stripe implementation of BillingGateway.
 *
 * This is the production provider. All Stripe-specific logic is isolated here
 * so that the rest of the platform remains provider-agnostic.
 *
 * Requirements:
 *   - STRIPE_SECRET_KEY environment variable
 *   - STRIPE_MAINTENANCE_PRICE_ID_CHF / STRIPE_MAINTENANCE_PRICE_ID_EUR
 *   - Stripe account with products configured per governance-contract.json
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
import type { BillingGateway, CreateCustomerParams, CustomerResult, PortalSessionParams, PortalSessionResult, MaintenanceSubscriptionParams, SubscriptionResult, CancelSubscriptionParams, ModuleCheckoutParams, CheckoutResult, AddModuleParams, ModuleSubscriptionResult, RemoveModuleParams, ChangeModuleTierParams, ModuleListResult, EntitlementResult, BillingWebhookEvent, WebhookResult, OperationResult } from '../types';
export interface TenantBillingStore {
    getStripeIds(tenantId: string): Promise<{
        customerId: string | null;
        subscriptionId: string | null;
    }>;
    setStripeIds(tenantId: string, customerId: string, subscriptionId?: string): Promise<void>;
    getTenantInfo(tenantId: string): Promise<{
        name: string;
        email: string | null;
    } | null>;
}
export declare class StripeBillingGateway implements BillingGateway {
    private readonly store;
    readonly provider: "stripe";
    constructor(store: TenantBillingStore);
    createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
    getCustomer(tenantId: string): Promise<CustomerResult>;
    createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult>;
    createMaintenanceSubscription(params: MaintenanceSubscriptionParams): Promise<SubscriptionResult>;
    getSubscription(tenantId: string): Promise<SubscriptionResult>;
    cancelSubscription(params: CancelSubscriptionParams): Promise<OperationResult>;
    createModuleCheckout(params: ModuleCheckoutParams): Promise<CheckoutResult>;
    addModuleToSubscription(params: AddModuleParams): Promise<ModuleSubscriptionResult>;
    removeModuleFromSubscription(params: RemoveModuleParams): Promise<OperationResult>;
    changeModuleTier(params: ChangeModuleTierParams): Promise<OperationResult>;
    listModuleSubscriptions(tenantId: string): Promise<ModuleListResult>;
    resolveEntitlements(tenantId: string): Promise<EntitlementResult>;
    handleWebhook(event: BillingWebhookEvent): Promise<WebhookResult>;
    private errorMessage;
}
//# sourceMappingURL=stripe.d.ts.map