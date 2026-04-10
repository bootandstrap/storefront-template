// ============================================
// E-Commerce Template — Shared Types & Constants
// @bootandstrap/shared v0.3.0
// ============================================
// Domain types & constants
export * from "./types";
export * from "./constants";
export * from "./currencies";
// Governance engine (schemas, adapters, circuit breaker, cache)
export * from "./governance";
// Module registry (auto-derived from governance-contract.json)
export * from "./modules";
// NOTE: billing and provisioning are NOT re-exported from the barrel.
// They contain server-only dependencies (stripe) that break Turbopack
// when bundled into client components. Import them via subpaths:
//   import { ... } from '@bootandstrap/shared/billing'
//   import { ... } from '@bootandstrap/shared/provisioning'
//# sourceMappingURL=index.js.map