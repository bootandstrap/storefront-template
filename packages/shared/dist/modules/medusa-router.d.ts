/**
 * @module modules/medusa-router
 * @description MedusaModuleRouter — maps governance module activations to Medusa v2 side effects.
 *
 * When a governance module is activated, upgraded, or deactivated for a tenant,
 * this router determines what Medusa-side operations are needed:
 *   - Create/configure Medusa modules
 *   - Enable/disable workflows
 *   - Configure subscriber events
 *   - Set up entity links
 *
 * The router is declarative — it reads from the ModuleRegistry and produces a
 * list of MedusaActions that can be executed by a Medusa-side executor.
 *
 * ARCHITECTURE:
 *   1. Governance Engine activates module flags/limits for a tenant
 *   2. MedusaModuleRouter reads the `medusaIntegration` from the registry
 *   3. Router produces MedusaAction[] (CREATE_MODULE, ENABLE_WORKFLOW, etc.)
 *   4. Medusa executor (lives in apps/medusa) applies actions via Medusa SDK
 *
 * This design keeps the shared package Medusa-agnostic — it only produces
 * declarative action descriptors, not Medusa SDK calls.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
import type { ModuleRegistryEntry, MedusaModuleIntegration } from './types';
/** Medusa-side action types */
export type MedusaActionType = 'configure_module' | 'enable_workflow' | 'disable_workflow' | 'register_subscriber' | 'unregister_subscriber' | 'create_link' | 'remove_link' | 'configure_api' | 'seed_data' | 'cleanup_data';
/** A declarative action descriptor for the Medusa executor */
export interface MedusaAction {
    /** Action type */
    type: MedusaActionType;
    /** Tenant this action targets */
    tenantId: string;
    /** The governance module key that triggered this action */
    moduleKey: string;
    /** Module tier level (affects which features to enable) */
    tierLevel: number;
    /** Specific payload for the action type */
    payload: MedusaActionPayload;
    /** Priority (lower = execute first). Default: 100 */
    priority: number;
    /** Whether this action is idempotent */
    idempotent: boolean;
}
/** Type-safe payloads per action type */
export type MedusaActionPayload = {
    kind: 'module';
    modulePath: string;
    config?: Record<string, unknown>;
} | {
    kind: 'workflow';
    workflowId: string;
    config?: Record<string, unknown>;
} | {
    kind: 'subscriber';
    eventName: string;
    subscriberPath?: string;
} | {
    kind: 'link';
    from: string;
    to: string;
    linkType: string;
} | {
    kind: 'api';
    routePath: string;
    enabled: boolean;
} | {
    kind: 'data';
    action: 'seed' | 'cleanup';
    dataType: string;
};
/** What triggered the router */
export interface MedusaRouterTrigger {
    /** Type of governance change */
    type: 'activate' | 'upgrade' | 'downgrade' | 'deactivate';
    /** Tenant being changed */
    tenantId: string;
    /** Module being changed */
    moduleKey: string;
    /** New tier level (0 for deactivation) */
    newTierLevel: number;
    /** Previous tier level (0 for first activation) */
    previousTierLevel: number;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
export interface MedusaRouterResult {
    /** Whether the routing succeeded */
    success: boolean;
    /** Actions to execute (ordered by priority) */
    actions: MedusaAction[];
    /** Warnings about missing integration config */
    warnings: string[];
    /** Errors that prevented routing */
    errors: string[];
}
/**
 * MedusaModuleRouter — declarative router from governance events to Medusa actions.
 *
 * Usage:
 *   const router = new MedusaModuleRouter(registry.modules)
 *   const result = router.route({
 *       type: 'activate',
 *       tenantId: '...',
 *       moduleKey: 'ecommerce',
 *       newTierLevel: 2,
 *       previousTierLevel: 0,
 *   })
 *   // Execute result.actions in Medusa executor
 */
export declare class MedusaModuleRouter {
    private readonly modules;
    constructor(modules: Record<string, ModuleRegistryEntry>);
    /**
     * Route a governance module change to Medusa actions.
     */
    route(trigger: MedusaRouterTrigger): MedusaRouterResult;
    /**
     * Get all module keys that have Medusa integrations.
     */
    getMedusaModules(): string[];
    /**
     * Get the integration metadata for a specific module.
     */
    getIntegration(moduleKey: string): MedusaModuleIntegration | undefined;
    private routeActivation;
    private routeUpgrade;
    private routeDowngrade;
    private routeDeactivation;
}
//# sourceMappingURL=medusa-router.d.ts.map