import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const startTime = Date.now()

type CheckStatus = 'ok' | 'degraded' | 'error'

interface DependencyCheck {
    status: CheckStatus
    latency_ms: number
    error?: string
}

/**
 * Deep health check endpoint for Docker / load balancer / monitoring.
 *
 * GET /api/health         → quick liveness probe
 * GET /api/health?deep=1  → includes Supabase + Medusa connectivity
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const deep = searchParams.get('deep') === '1'

    const base = {
        status: 'ok' as CheckStatus,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
    }

    if (!deep) {
        return NextResponse.json(base, {
            status: 200,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        })
    }

    // ── Deep checks ──────────────────────────────────
    const checks: Record<string, DependencyCheck> = {}

    // Supabase DB
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

    // Medusa API
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

    // Overall status
    const statuses = Object.values(checks).map(c => c.status)
    const overall: CheckStatus = statuses.includes('error')
        ? 'degraded'
        : statuses.includes('degraded')
            ? 'degraded'
            : 'ok'

    const httpStatus = overall === 'ok' ? 200 : 503

    return NextResponse.json(
        { ...base, status: overall, checks },
        {
            status: httpStatus,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
    )
}
