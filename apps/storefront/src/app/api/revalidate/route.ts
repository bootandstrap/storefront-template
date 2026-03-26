import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limiter'

// ---------------------------------------------------------------------------
// Internal revalidation endpoint (infrastructure — NOT a commercial API)
// POST /api/revalidate
// Body: { path?: string, secret: string }
//
// Protection layers:
//   1. REVALIDATION_SECRET (mandatory — shared between SuperAdmin and storefront)
//   2. REVALIDATION_ALLOWED_IPS (optional — comma-separated allowlist)
//   3. Rate limiting (30 req/min per IP)
//   4. Timing-safe secret comparison (prevents timing oracle attacks)
// ---------------------------------------------------------------------------

const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET
const ALLOWED_IPS_RAW = process.env.REVALIDATION_ALLOWED_IPS

/** Parse allowed IPs once at startup */
const ALLOWED_IPS: string[] | null = ALLOWED_IPS_RAW
    ? ALLOWED_IPS_RAW.split(',').map(ip => ip.trim()).filter(Boolean)
    : null

/**
 * Timing-safe string comparison to prevent timing oracle attacks.
 * Returns false if lengths differ (leaks length info, but that's acceptable
 * for fixed-length secrets and prevents the more dangerous byte-by-byte oracle).
 */
function isSecretValid(provided: string, expected: string): boolean {
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
    try {
        // ── Rate limiting (30 req/min per IP) ──────────────────
        const clientIP = getClientIP(request)
        const rateCheck = checkRateLimit(`revalidate:${clientIP}`, 30, 60_000)

        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded', retryAfterMs: rateCheck.retryAfterMs },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)),
                    },
                }
            )
        }

        // ── IP allowlist check ─────────────────────────────────
        if (ALLOWED_IPS && !ALLOWED_IPS.includes(clientIP)) {
            console.warn(`[revalidate] Rejected request from ${clientIP} — not in allowlist`)
            return NextResponse.json(
                { error: 'Forbidden — IP not in allowlist' },
                { status: 403 }
            )
        }

        // ── Secret validation (timing-safe) ────────────────────
        if (!REVALIDATION_SECRET) {
            return NextResponse.json(
                { error: 'Revalidation endpoint not configured — set REVALIDATION_SECRET' },
                { status: 503 }
            )
        }

        const body = await request.json()
        const { secret, path } = body as { secret?: string; path?: string }

        if (!secret || !isSecretValid(secret, REVALIDATION_SECRET)) {
            return NextResponse.json(
                { error: 'Invalid revalidation secret' },
                { status: 401 }
            )
        }

        // ── Revalidate ─────────────────────────────────────────
        if (path) {
            revalidatePath(path)
        } else {
            revalidatePath('/', 'layout')
        }

        // Also clear in-memory config cache
        const { revalidateConfig } = await import('@/lib/config')
        await revalidateConfig()

        return NextResponse.json({
            revalidated: true,
            path: path || '/',
            timestamp: new Date().toISOString(),
        })
    } catch (err) {
        console.error('[revalidate] Error:', err)
        return NextResponse.json(
            { error: 'Revalidation failed' },
            { status: 500 }
        )
    }
}
