import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import type { AppConfig } from '@/lib/config'
import {
    shouldCircuitSkipFetch,
    getCachedConfig,
    getRequiredTenantId,
    isBuildPhase,
} from '@/lib/governance'

// ---------------------------------------------------------------------------
// GET /api/v1/governance/health — Governance subsystem health
// ---------------------------------------------------------------------------
// Returns circuit breaker state, cache status, and governance configuration
// health for external monitoring (Dokploy health checks, admin panel, cron).
//
// Auth: CRON_SECRET or HEALTH_CHECK_TOKEN header required.
// Phase 6 of MEGA PLAN v4 — Observability Hardening
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET
const HEALTH_CHECK_TOKEN = process.env.HEALTH_CHECK_TOKEN

function isAuthorized(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const healthToken = request.headers.get('x-health-token')

    if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true
    if (HEALTH_CHECK_TOKEN && healthToken === HEALTH_CHECK_TOKEN) return true

    return false
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const t0 = Date.now()

    // ── Circuit breaker state ──────────────────────────────────────
    const circuitOpen = shouldCircuitSkipFetch()
    const circuitState = circuitOpen ? 'open' : 'closed'

    // ── Cache state ────────────────────────────────────────────────
    let cacheStatus: 'hit' | 'miss' | 'unavailable' = 'unavailable'
    let degradedMode = false
    let tenantStatus = 'unknown'

    try {
        const tenantId = getRequiredTenantId()
        const cached = getCachedConfig()

        if (cached) {
            cacheStatus = 'hit'
            degradedMode = (cached as AppConfig & { _degraded?: boolean })._degraded ?? false
            tenantStatus = (cached as AppConfig & { tenantStatus?: string }).tenantStatus ?? 'unknown'
        } else {
            cacheStatus = 'miss'
        }

        // ── Config fetch test (if circuit is closed) ─────────────────
        if (!circuitOpen && !isBuildPhase()) {
            const result = await getConfig() as AppConfig & { _degraded?: boolean; tenantStatus?: string }
            degradedMode = result._degraded ?? false
            tenantStatus = result.tenantStatus ?? 'unknown'
        }
    } catch {
        // Non-fatal: config fetch may fail
    }

    const response = {
        status: degradedMode ? 'degraded' : 'healthy',
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - t0,
        governance: {
            circuitBreaker: circuitState,
            cacheStatus,
            degradedMode,
            tenantStatus,
        },
        buildInfo: {
            nodeEnv: process.env.NODE_ENV,
            uptimeSeconds: Math.floor(process.uptime()),
        },
    }

    return NextResponse.json(response, {
        status: degradedMode ? 503 : 200,
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
    })
}
