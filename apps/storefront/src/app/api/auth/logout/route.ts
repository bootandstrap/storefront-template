import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'edge'

async function handleLegacyLogout(request: NextRequest) {
    // We use a 308 Permanent Redirect specifically to enforce METHOD PRESERVATION.
    // If a request hits this endpoint via POST, the 308 ensures the browser will 
    // issue a POST to the destination (/api/auth/signout) preserving form data
    // and CSRF intent. A 301/302 would downgrade it to a GET.
    
    // Reconstruct the destination URL based on the current origin
    const url = request.nextUrl.clone()
    url.pathname = '/api/auth/signout'
    url.search = request.nextUrl.search // Preserve any query strings

    return NextResponse.redirect(url, { status: 308 })
}

export async function GET(request: NextRequest) {
    return handleLegacyLogout(request)
}

export async function POST(request: NextRequest) {
    return handleLegacyLogout(request)
}
