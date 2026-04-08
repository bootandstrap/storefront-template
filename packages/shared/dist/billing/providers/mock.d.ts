/**
 * @module billing/providers/mock
 * @description Mock implementation of BillingGateway for tests, local dev, and demo mode.
 *
 * This gateway simulates all billing operations in-memory without touching
 * any external service. It allows the full provisioning pipeline to run
 * locally without Stripe credentials.
 *
 * Usage:
 *   const gateway = new MockBillingGateway()
 *   const result = await gateway.createMaintenanceSubscription({ ... })
 *   // result.subscriptionId === 'mock_sub_xxx'
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
import type { BillingGateway, CreateCustomerParams, CustomerResult, PortalSessionParams, PortalSessionResult, MaintenanceSubscriptionParams, SubscriptionResult, CancelSubscriptionParams, ModuleCheckoutParams, CheckoutResult, AddModuleParams, ModuleSubscriptionResult, RemoveModuleParams, ChangeModuleTierParams, ModuleListResult, EntitlementResult, BillingWebhookEvent, WebhookResult, OperationResult } from '../types';
export declare class MockBillingGateway implements BillingGateway {
    readonly provider: "mock";
    private customers;
    private subscriptions;
    /** Optional: track calls for test assertions */
    readonly calls: Array<{
        method: string;
        params: unknown;
        timestamp: number;
    }>;
    private track;
    /** Reset all state (useful between tests) */
    reset(): void;
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
}
//# sourceMappingURL=mock.d.ts.map