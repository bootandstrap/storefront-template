import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET /api/health/ready — Readiness probe (Docker / Kubernetes / load balancer)
// ---------------------------------------------------------------------------
// Uses Supabase service-role key (bypasses RLS) so the probe works reliably
// without a user session context. Also pings Medusa /health.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type CheckStatus = 'ok' | 'degraded' | 'down'

interface DependencyCheck {
    status: CheckStatus
    latency_ms: number
    error?: string
}

export async function GET() {
    const checks: Record<string, DependencyCheck> = {}

    // ── Supabase (service-role — bypasses RLS) ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceKey) {
        try {
            const t0 = Date.now()
            const res = await fetch(
                `${supabaseUrl}/rest/v1/config?select=id&limit=1`,
                {
                    headers: {
                        apikey: serviceKey,
                        Authorization: `Bearer ${serviceKey}`,
                    },
                }
            )
            checks.supabase = {
                status: res.ok ? 'ok' : 'degraded',
                latency_ms: Date.now() - t0,
                ...((!res.ok) && { error: `HTTP ${res.status}` }),
            }
        } catch (err) {
            checks.supabase = {
                status: 'down',
                latency_ms: -1,
                error: err instanceof Error ? err.message : 'Unknown error',
            }
        }
    } else {
        checks.supabase = { status: 'down', latency_ms: -1, error: 'Not configured' }
    }

    // ── Medusa API ──
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
            status: 'down',
            latency_ms: -1,
            error: err instanceof Error ? err.message : 'Medusa unreachable',
        }
    }

    // ── Overall ──
    const statuses = Object.values(checks).map(c => c.status)
    const overall: CheckStatus = statuses.includes('down')
        ? 'down'
        : statuses.includes('degraded')
            ? 'degraded'
            : 'ok'

    const httpStatus = overall === 'ok' ? 200 : 503

    return NextResponse.json(
        {
            status: overall,
            probe: 'readiness',
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
            checks,
        },
        {
            status: httpStatus,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
    )
}
