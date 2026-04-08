/**
 * @module modules
 * @description Barrel export for the ModuleRegistry system.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
// Registry builder and utilities
export { createModuleRegistry, getFeatureGateMap, getPanelPolicy, getModule, getModulesByCategory, findModuleByFlag, } from './registry';
// Medusa integration router
export { MedusaModuleRouter } from './medusa-router';
//# sourceMappingURL=index.js.map