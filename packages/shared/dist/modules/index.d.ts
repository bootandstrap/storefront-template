/**
 * @module modules
 * @description Barrel export for the ModuleRegistry system.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
export type { ModuleRegistryEntry, ModuleRegistry, ModuleCategory, ModuleTierDefinition, MedusaModuleIntegration, ModuleComponent, FeatureGateMapping, PanelPolicyEntry, } from './types';
export { createModuleRegistry, getFeatureGateMap, getPanelPolicy, getModule, getModulesByCategory, findModuleByFlag, } from './registry';
export { MedusaModuleRouter } from './medusa-router';
export type { MedusaAction, MedusaActionType, MedusaActionPayload, MedusaRouterTrigger, MedusaRouterResult, } from './medusa-router';
//# sourceMappingURL=index.d.ts.map