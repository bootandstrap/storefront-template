import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    await supabase.auth.signOut()

    // Infer locale from referer to redirect to localized home
    const referer = request.headers.get('referer') || ''
    const localeMatch = referer.match(/\/(es|en)\//)
    const locale = localeMatch?.[1] || 'es'

    return NextResponse.redirect(
        new URL(`/${locale}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
        { status: 302 },
    )
}
