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
export function reportDegradedMode(tenantId, message) {
    // Structured JSON log for Dokploy
    console.error(JSON.stringify({
        level: 'error',
        service: 'storefront',
        timestamp: new Date().toISOString(),
        tenant_id: tenantId,
        severity: 'critical',
        error: message,
        action: 'degraded_mode_activated',
    }));
    // Fire-and-forget to tenant_errors table via raw REST (avoids generated type issues)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
        fetch(`${supabaseUrl}/rest/v1/tenant_errors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                tenant_id: tenantId,
                source: 'config_degraded_mode',
                severity: 'critical',
                message,
                details: { timestamp: new Date().toISOString() },
            }),
        }).catch(() => {
            /* truly fire-and-forget */
        });
    }
}
//# sourceMappingURL=report.js.map