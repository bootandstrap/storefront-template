/**
 * @module governance/report
 * @description Degraded mode alerting — structured logging + fire-and-forget tenant_errors.
 *
 * When Supabase is unreachable and the storefront falls back to degraded mode,
 * this module:
 * 1. Emits a structured JSON log for Dokploy/APM ingestion
 * 2. Fire-and-forgets an error record to tenant_errors table for SuperAdmin visibility
 *
 * @locked 🔴 CANONICAL — ecommerce-template/packages/shared is the source of truth.
 */
/**
 * Report that a storefront has entered degraded mode.
 * Fire-and-forget — never throws, never blocks.
 */
export declare function reportDegradedMode(tenantId: string, message: string): void;
//# sourceMappingURL=report.d.ts.map