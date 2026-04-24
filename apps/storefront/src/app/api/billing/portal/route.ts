/**
 * POST /api/billing/portal → Redirect to /api/billing-portal
 *
 * Legacy redirect — the canonical billing portal route is /api/billing-portal.
 * 308 preserves POST method and body.
 */

import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    const url = request.nextUrl.clone()
    url.pathname = '/api/billing-portal'
    return NextResponse.redirect(url, { status: 308 })
}
