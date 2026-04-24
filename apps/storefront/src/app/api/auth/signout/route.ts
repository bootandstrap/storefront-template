import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const runtime = 'edge'

async function handleSignout(request: NextRequest) {
    const supabase = await createClient()
    
    // Attempt standard Supabase auth annihilation
    try {
        await supabase.auth.signOut()
    } catch (e) {
        // Continue even if Supabase fails to ensure we still drop local cookies
        logger.error('Supabase signout failed during edge handler:', e)
    }

    // Infer locale from referer to redirect to localized home
    const referer = request.headers.get('referer') || ''
    const localeMatch = referer.match(/\/(es|en)\//)
    const locale = localeMatch?.[1] || 'es'

    const redirectUrl = new URL(`/${locale}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    const response = NextResponse.redirect(redirectUrl, { status: 302 })

    // BFCache Annihilation - Force the browser to never cache the post-logout state
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // Defensive Cookie Sweeping
    // Explicitly destroy known auth/session cookies to guarantee terminal state
    const cookiesToAnnihilate = [
        'sb-access-token', 
        'sb-refresh-token',
        'medusa_cart_id', // Clear transient cart to reset guest state
        '_medusa_jwt',    // Clear any Medusa identity
        '_medusa_session' 
    ]
    
    // We also look for specific Supabase project cookies (sb-{project_ref}-auth-token)
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieNames = cookieHeader.split(';').map(c => c.trim().split('=')[0])
    
    cookieNames.forEach(cookieName => {
        if (cookieName.startsWith('sb-') && cookieName.endsWith('-auth-token')) {
            cookiesToAnnihilate.push(cookieName)
        }
    })

    cookiesToAnnihilate.forEach(cookieName => {
        response.cookies.delete(cookieName)
        // Also set explicit expiry as safety net
        response.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
    })

    return response
}

export async function POST(request: NextRequest) {
    return handleSignout(request)
}

export async function GET(request: NextRequest) {
    return handleSignout(request)
}
