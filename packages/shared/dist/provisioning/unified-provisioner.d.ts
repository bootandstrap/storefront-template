/**
 * @module provisioning/unified-provisioner
 * @description UnifiedProvisioner — single pipeline for all tenant provisioning modes.
 *
 * Replaces the 3 divergent provisioning pipelines:
 *   1. seed-governance.ts (local template engine)
 *   2. demo-tenant-engine.ts (BSWEB demo provisioner)
 *   3. provisionTenantCore() (BSWEB production provisioner)
 *
 * All modes execute the same step sequence; the mode controls which steps
 * are skipped and what implementations (real vs mock) are used.
 *
 * Step sequence:
 *   1. validate_input → validate + normalize inputs
 *   2. create_tenant → upsert tenant row in Supabase
 *   3. seed_config → upsert store config
 *   4. seed_flags → upsert feature flags (all true in demo, contract defaults otherwise)
 *   5. seed_limits → upsert plan limits (max in demo, contract defaults otherwise)
 *   6. create_billing_customer → create customer in billing provider
 *   7. create_subscription → create maintenance subscription
 *   8. apply_module_bundle → activate module flags/limits
 *   9. create_github_repo → create tenant repo from template (production only)
 *   10. deploy_infrastructure → deploy to Dokploy (production only)
 *   11. verify_health → check tenant is healthy
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
import type { ProvisionerMode, ProvisionTenantInput, ProvisionResult, ProvisionerDependencies } from './types';
export declare class UnifiedProvisioner {
    private readonly mode;
    private readonly deps;
    private readonly steps;
    private readonly warnings;
    constructor(mode: ProvisionerMode, deps: ProvisionerDependencies);
    /** Quick check: is this a demo-like mode where all features are unlocked? */
    get isDemoLike(): boolean;
    /** Should billing operations run? */
    get shouldBill(): boolean;
    provision(input: ProvisionTenantInput): Promise<ProvisionResult>;
    private validateInput;
    private createTenant;
    private seedConfig;
    private seedFlags;
    private seedLimits;
    private createBillingCustomer;
    private createSubscription;
    private applyModuleBundle;
    private upsertWithRetry;
    private runStep;
    private skipStep;
    private buildResult;
    private generateUUID;
    private slugify;
}
//# sourceMappingURL=unified-provisioner.d.ts.map