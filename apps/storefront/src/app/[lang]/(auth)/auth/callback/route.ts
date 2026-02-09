import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ lang: string }> },
) {
    const { lang } = await params
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? `/${lang}/cuenta`

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Auth code exchange failed — redirect to localized login with error
    return NextResponse.redirect(`${origin}/${lang}/login?error=auth`)
}
