import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePostLoginDestination } from '@/lib/auth-routing'
import { reconcileLegacyOwnerRole } from '@/lib/legacy-owner-auth'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ lang: string }> },
) {
    const { lang } = await params
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next')

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            let role: string | null = data.user?.user_metadata?.role ?? null
            let profileTenantId: string | null = null

            if (data.user?.id) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, tenant_id')
                    .eq('id', data.user.id)
                    .single()

                profileTenantId = (profile?.tenant_id as string | null) ?? null
                role = profile?.role || role

                role = await reconcileLegacyOwnerRole({
                    userId: data.user.id,
                    userEmail: data.user.email,
                    currentRole: role,
                    profileTenantId,
                })
            }

            const destination = resolvePostLoginDestination({
                lang,
                role,
                requestedRedirect: next,
            })

            return NextResponse.redirect(`${origin}${destination}`)
        }
    }

    // Auth code exchange failed — redirect to localized login with error
    return NextResponse.redirect(`${origin}/${lang}/login?error=auth`)
}
