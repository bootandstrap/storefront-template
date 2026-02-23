import { NextResponse } from 'next/server'

/**
 * Liveness probe — /api/health/live
 *
 * Fast, no-dependency check. Returns 200 if the Node.js process is alive.
 * Used by Docker HEALTHCHECK and Kubernetes livenessProbe.
 */
export function GET() {
    return NextResponse.json(
        {
            status: 'ok',
            probe: 'liveness',
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
    )
}
