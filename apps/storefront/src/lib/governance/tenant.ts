/**
 * @module governance/tenant
 * @description Tenant ID resolution with fail-closed security posture.
 *
 * @locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.
 * Source of truth: ecommerce-template/packages/shared/src/governance/tenant.ts
 * Sync via: scripts/sync-governance.sh
 */

import { logger } from '@/lib/logger'

export function isBuildPhase(): boolean {
    return process.env.NEXT_PHASE === 'phase-production-build'
}

export function getRequiredTenantId(): string {
    const id = process.env.TENANT_ID
    if (id) return id

    if (isBuildPhase()) {
        return '__build_prerender__'
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            '[FATAL] TENANT_ID is not set in production. All multi-tenant queries require tenant scoping.',
        )
    }

    logger.warn(
        '[config] ⚠️ TENANT_ID not set — queries will return no data. Set TENANT_ID in .env for local dev.',
    )
    return '__dev_no_tenant__'
}
