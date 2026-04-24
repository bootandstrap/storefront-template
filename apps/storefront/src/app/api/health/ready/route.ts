import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { getClientIp } from '@/lib/security/get-client-ip'

// ---------------------------------------------------------------------------
// GET /api/health/ready — Readiness probe (Docker / Kubernetes / load balancer)
// ---------------------------------------------------------------------------
// Protected by optional HEALTH_CHECK_TOKEN for production environments.
// Rate limited to 60 requests/min per IP.
// Uses Supabase service-role key (bypasses RLS) so the probe works reliably
// without a user session context. Also pings Medusa /health.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

const HEALTH_CHECK_TOKEN = process.env.HEALTH_CHECK_TOKEN

type CheckStatus = 'ok' | 'degraded' | 'down'

interface DependencyCheck {
    status: CheckStatus
    latency_ms: number
    error?: string
}

export async function GET(request: NextRequest) {
    // ── Rate limiting (60 req/min per IP) ──────────────────
    const clientIP = getClientIp(request)
    const rateCheck = checkRateLimit(`health:${clientIP}`, 60, 60_000)

    if (!rateCheck.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded', retryAfterMs: rateCheck.retryAfterMs },
            {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)),
                    'X-RateLimit-Remaining': '0',
                },
            }
        )
    }

    // ── Token auth (if HEALTH_CHECK_TOKEN is configured) ───
    if (HEALTH_CHECK_TOKEN) {
        const token = request.headers.get('x-health-token') ||
            request.nextUrl.searchParams.get('token')

        if (token !== HEALTH_CHECK_TOKEN) {
            return NextResponse.json(
                { error: 'Unauthorized — provide X-Health-Token header' },
                { status: 403 }
            )
        }
    }

    // ── Dependency checks ──────────────────────────────────
    const checks: Record<string, DependencyCheck> = {}

    // ── Supabase (anon key — RLS-enabled, no service_role needed) ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.GOVERNANCE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && anonKey) {
        try {
            const t0 = Date.now()
            const res = await fetch(
                `${supabaseUrl}/rest/v1/config?select=id&limit=1`,
                {
                    headers: {
                        apikey: anonKey,
                        Authorization: `Bearer ${anonKey}`,
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
        checks.supabase = { status: 'down', latency_ms: -1, error: 'No Supabase keys configured' }
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
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-RateLimit-Remaining': String(rateCheck.remaining),
            },
        }
    )
}
