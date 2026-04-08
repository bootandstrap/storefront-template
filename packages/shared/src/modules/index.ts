/**
 * @module modules
 * @description Barrel export for the ModuleRegistry system.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */

// Types
export type {
    ModuleRegistryEntry,
    ModuleRegistry,
    ModuleCategory,
    ModuleTierDefinition,
    MedusaModuleIntegration,
    ModuleComponent,
    FeatureGateMapping,
    PanelPolicyEntry,
} from './types'

// Registry builder and utilities
export {
    createModuleRegistry,
    getFeatureGateMap,
    getPanelPolicy,
    getModule,
    getModulesByCategory,
    findModuleByFlag,
} from './registry'

// Medusa integration router
export { MedusaModuleRouter } from './medusa-router'
export type {
    MedusaAction,
    MedusaActionType,
    MedusaActionPayload,
    MedusaRouterTrigger,
    MedusaRouterResult,
} from './medusa-router'
