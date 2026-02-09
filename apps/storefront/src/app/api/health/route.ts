import { NextResponse } from 'next/server'

const startTime = Date.now()

/**
 * Health check endpoint for Docker / load balancer / monitoring.
 * GET /api/health → { status: "ok", uptime, timestamp, version }
 */
export async function GET() {
    return NextResponse.json(
        {
            status: 'ok',
            uptime: Math.floor((Date.now() - startTime) / 1000),
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV || 'development',
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        }
    )
}
