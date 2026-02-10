import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CheckStatus = 'ok' | 'degraded' | 'error'

interface DependencyCheck {
    status: CheckStatus
    latency_ms: number
    error?: string
}

/**
 * Readiness probe — /api/health/ready
 *
 * Checks all critical dependencies (Supabase, Medusa).
 * Returns 200 only if ALL dependencies are reachable.
 * Returns 503 if any dependency is unavailable.
 *
 * Used by Docker readinessProbe / load balancer health checks.
 */
export async function GET() {
    const checks: Record<string, DependencyCheck> = {}

    // ── Supabase ────────────────────────────────────────
    try {
        const t0 = Date.now()
        const supabase = await createClient()
        const { error } = await supabase.from('config').select('id').limit(1)
        checks.supabase = {
            status: error ? 'degraded' : 'ok',
            latency_ms: Date.now() - t0,
            ...(error && { error: error.message }),
        }
    } catch (err) {
        checks.supabase = {
            status: 'error',
            latency_ms: -1,
            error: err instanceof Error ? err.message : 'Unknown error',
        }
    }

    // ── Medusa API ──────────────────────────────────────
    const medusaUrl = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
    try {
        const t0 = Date.now()
        const res = await fetch(`${medusaUrl}/health`, {
            signal: AbortSignal.timeout(5000),
        })
        checks.medusa = {
            status: res.ok ? 'ok' : 'degraded',
            latency_ms: Date.now() - t0,
            ...(!res.ok && { error: `HTTP ${res.status}` }),
        }
    } catch (err) {
        checks.medusa = {
            status: 'error',
            latency_ms: -1,
            error: err instanceof Error ? err.message : 'Medusa unreachable',
        }
    }

    // ── Overall ─────────────────────────────────────────
    const statuses = Object.values(checks).map((c) => c.status)
    const overall: CheckStatus = statuses.includes('error')
        ? 'error'
        : statuses.includes('degraded')
            ? 'degraded'
            : 'ok'

    const httpStatus = overall === 'ok' ? 200 : 503

    return NextResponse.json(
        {
            status: overall,
            probe: 'readiness',
            timestamp: new Date().toISOString(),
            checks,
        },
        {
            status: httpStatus,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
    )
}
