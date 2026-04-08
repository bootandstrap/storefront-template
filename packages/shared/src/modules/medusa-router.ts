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

import type { ModuleRegistryEntry, MedusaModuleIntegration } from './types'

// ── Action Types ─────────────────────────────────────────────────────────

/** Medusa-side action types */
export type MedusaActionType =
    | 'configure_module'   // Enable/register a Medusa module
    | 'enable_workflow'    // Activate a workflow for this tenant
    | 'disable_workflow'   // Deactivate a workflow
    | 'register_subscriber' // Start listening to events
    | 'unregister_subscriber' // Stop listening to events
    | 'create_link'        // Create entity link
    | 'remove_link'        // Remove entity link
    | 'configure_api'      // Enable/disable API routes
    | 'seed_data'          // Seed initial data for the module
    | 'cleanup_data'       // Clean up module data on deactivation

/** A declarative action descriptor for the Medusa executor */
export interface MedusaAction {
    /** Action type */
    type: MedusaActionType
    /** Tenant this action targets */
    tenantId: string
    /** The governance module key that triggered this action */
    moduleKey: string
    /** Module tier level (affects which features to enable) */
    tierLevel: number
    /** Specific payload for the action type */
    payload: MedusaActionPayload
    /** Priority (lower = execute first). Default: 100 */
    priority: number
    /** Whether this action is idempotent */
    idempotent: boolean
}

/** Type-safe payloads per action type */
export type MedusaActionPayload =
    | { kind: 'module'; modulePath: string; config?: Record<string, unknown> }
    | { kind: 'workflow'; workflowId: string; config?: Record<string, unknown> }
    | { kind: 'subscriber'; eventName: string; subscriberPath?: string }
    | { kind: 'link'; from: string; to: string; linkType: string }
    | { kind: 'api'; routePath: string; enabled: boolean }
    | { kind: 'data'; action: 'seed' | 'cleanup'; dataType: string }

// ── Trigger Context ──────────────────────────────────────────────────────

/** What triggered the router */
export interface MedusaRouterTrigger {
    /** Type of governance change */
    type: 'activate' | 'upgrade' | 'downgrade' | 'deactivate'
    /** Tenant being changed */
    tenantId: string
    /** Module being changed */
    moduleKey: string
    /** New tier level (0 for deactivation) */
    newTierLevel: number
    /** Previous tier level (0 for first activation) */
    previousTierLevel: number
    /** Additional metadata */
    metadata?: Record<string, unknown>
}

// ── Router Result ────────────────────────────────────────────────────────

export interface MedusaRouterResult {
    /** Whether the routing succeeded */
    success: boolean
    /** Actions to execute (ordered by priority) */
    actions: MedusaAction[]
    /** Warnings about missing integration config */
    warnings: string[]
    /** Errors that prevented routing */
    errors: string[]
}

// ── MedusaModuleRouter ───────────────────────────────────────────────────

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
export class MedusaModuleRouter {
    constructor(
        private readonly modules: Record<string, ModuleRegistryEntry>
    ) {}

    /**
     * Route a governance module change to Medusa actions.
     */
    route(trigger: MedusaRouterTrigger): MedusaRouterResult {
        const result: MedusaRouterResult = {
            success: true,
            actions: [],
            warnings: [],
            errors: [],
        }

        // 1. Find the module in registry
        const moduleEntry = this.modules[trigger.moduleKey]
        if (!moduleEntry) {
            result.success = false
            result.errors.push(`Module '${trigger.moduleKey}' not found in registry`)
            return result
        }

        // 2. Check Medusa integration metadata
        const integration = moduleEntry.medusaIntegration
        if (!integration) {
            result.warnings.push(
                `Module '${trigger.moduleKey}' has no medusaIntegration defined — ` +
                `governance flags/limits applied but no Medusa-side effects`
            )
            return result
        }

        // 3. Route based on trigger type
        switch (trigger.type) {
            case 'activate':
                this.routeActivation(trigger, integration, result)
                break
            case 'upgrade':
                this.routeUpgrade(trigger, integration, result)
                break
            case 'downgrade':
                this.routeDowngrade(trigger, integration, result)
                break
            case 'deactivate':
                this.routeDeactivation(trigger, integration, result)
                break
        }

        // 4. Sort actions by priority (lower = first)
        result.actions.sort((a, b) => a.priority - b.priority)

        return result
    }

    /**
     * Get all module keys that have Medusa integrations.
     */
    getMedusaModules(): string[] {
        return Object.entries(this.modules)
            .filter(([, entry]) => entry.medusaIntegration)
            .map(([key]) => key)
    }

    /**
     * Get the integration metadata for a specific module.
     */
    getIntegration(moduleKey: string): MedusaModuleIntegration | undefined {
        return this.modules[moduleKey]?.medusaIntegration
    }

    // ── Activation: enable everything ────────────────────────────────────

    private routeActivation(
        trigger: MedusaRouterTrigger,
        integration: MedusaModuleIntegration,
        result: MedusaRouterResult
    ): void {
        const base = { tenantId: trigger.tenantId, moduleKey: trigger.moduleKey, tierLevel: trigger.newTierLevel }

        // Configure Medusa module
        if (integration.modulePath) {
            result.actions.push({
                ...base,
                type: 'configure_module',
                payload: { kind: 'module', modulePath: integration.modulePath },
                priority: 10,
                idempotent: true,
            })
        }

        // Register subscribers
        if (integration.subscribers?.length) {
            for (const event of integration.subscribers) {
                result.actions.push({
                    ...base,
                    type: 'register_subscriber',
                    payload: { kind: 'subscriber', eventName: event },
                    priority: 20,
                    idempotent: true,
                })
            }
        }

        // Enable workflows
        if (integration.workflows?.length) {
            for (const workflowId of integration.workflows) {
                result.actions.push({
                    ...base,
                    type: 'enable_workflow',
                    payload: { kind: 'workflow', workflowId },
                    priority: 30,
                    idempotent: true,
                })
            }
        }

        // Create entity links
        if (integration.links?.length) {
            for (const link of integration.links) {
                result.actions.push({
                    ...base,
                    type: 'create_link',
                    payload: { kind: 'link', from: link.from, to: link.to, linkType: link.type },
                    priority: 40,
                    idempotent: true,
                })
            }
        }

        // Seed initial data
        if (integration.entities?.length) {
            result.actions.push({
                ...base,
                type: 'seed_data',
                payload: { kind: 'data', action: 'seed', dataType: trigger.moduleKey },
                priority: 50,
                idempotent: true,
            })
        }
    }

    // ── Upgrade: re-configure with higher tier ───────────────────────────

    private routeUpgrade(
        trigger: MedusaRouterTrigger,
        integration: MedusaModuleIntegration,
        result: MedusaRouterResult
    ): void {
        // On upgrade, re-run activation (actions are idempotent)
        // The difference is the tierLevel, which the executor can use
        // to conditionally enable tier-specific features
        this.routeActivation(trigger, integration, result)
    }

    // ── Downgrade: re-configure with lower tier ──────────────────────────

    private routeDowngrade(
        trigger: MedusaRouterTrigger,
        integration: MedusaModuleIntegration,
        result: MedusaRouterResult
    ): void {
        // On downgrade, re-run activation with new tier level
        // The executor must check tierLevel and disable features above the tier
        this.routeActivation(trigger, integration, result)
    }

    // ── Deactivation: remove everything ──────────────────────────────────

    private routeDeactivation(
        trigger: MedusaRouterTrigger,
        integration: MedusaModuleIntegration,
        result: MedusaRouterResult
    ): void {
        const base = { tenantId: trigger.tenantId, moduleKey: trigger.moduleKey, tierLevel: 0 }

        // Clean up data first (preserve order items)
        if (integration.entities?.length) {
            result.actions.push({
                ...base,
                type: 'cleanup_data',
                payload: { kind: 'data', action: 'cleanup', dataType: trigger.moduleKey },
                priority: 10,
                idempotent: true,
            })
        }

        // Remove entity links
        if (integration.links?.length) {
            for (const link of integration.links) {
                result.actions.push({
                    ...base,
                    type: 'remove_link',
                    payload: { kind: 'link', from: link.from, to: link.to, linkType: link.type },
                    priority: 20,
                    idempotent: true,
                })
            }
        }

        // Disable workflows
        if (integration.workflows?.length) {
            for (const workflowId of integration.workflows) {
                result.actions.push({
                    ...base,
                    type: 'disable_workflow',
                    payload: { kind: 'workflow', workflowId },
                    priority: 30,
                    idempotent: true,
                })
            }
        }

        // Unregister subscribers
        if (integration.subscribers?.length) {
            for (const event of integration.subscribers) {
                result.actions.push({
                    ...base,
                    type: 'unregister_subscriber',
                    payload: { kind: 'subscriber', eventName: event },
                    priority: 40,
                    idempotent: true,
                })
            }
        }
    }
}
