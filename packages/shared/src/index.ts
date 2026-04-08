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

// Billing gateway (multi-provider: Stripe, Mock, future LemonSqueezy/Paddle)
export * from "./billing";

// Provisioning pipeline (UnifiedProvisioner: local → demo → staging → production)
export * from "./provisioning";

// Module registry (auto-derived from governance-contract.json)
export * from "./modules";
