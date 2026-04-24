import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { requirePanelAuth } from '@/lib/panel-auth'

export async function GET(request: NextRequest): Promise<NextResponse | never> {
    // Require authenticated panel session (owner or super_admin)
    try {
        await requirePanelAuth()
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'es'

    const cookieStore = await cookies()
    // Set cookie for 1 hour to bypass the panel redirect in cuenta/layout.tsx
    cookieStore.set('simulating_client', 'true', {
        path: '/',
        maxAge: 3600,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    })

    redirect(`/${lang}/cuenta`)
}
