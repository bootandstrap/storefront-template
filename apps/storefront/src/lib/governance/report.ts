/**
 * @module governance/report
 * @description Degraded mode alerting — structured logging + fire-and-forget tenant_errors.
 *
 * @locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.
 * Source of truth: ecommerce-template/packages/shared/src/governance/report.ts
 * Sync via: scripts/sync-governance.sh
 */

export function reportDegradedMode(tenantId: string, message: string): void {
    console.error(
        JSON.stringify({
            level: 'error',
            service: 'storefront',
            timestamp: new Date().toISOString(),
            tenant_id: tenantId,
            severity: 'critical',
            error: message,
            action: 'degraded_mode_activated',
        }),
    )

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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
        })
    }
}
