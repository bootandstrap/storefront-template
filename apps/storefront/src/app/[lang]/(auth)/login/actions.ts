'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolvePostLoginDestination } from '@/lib/auth-routing'
import { reconcileLegacyOwnerRole } from '@/lib/panel-auth'

export interface LoginState {
    error: string | null
    success: boolean
}

export async function loginAction(
    _prev: LoginState,
    formData: FormData,
): Promise<LoginState> {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const lang = formData.get('lang') as string || 'es'
    const requestedRedirect = formData.get('redirect') as string | null

    if (!email || !password) {
        return { error: 'missing_fields', success: false }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        // Map common Supabase auth errors to user-friendly messages
        if (error.message.includes('Invalid login credentials')) {
            return { error: 'invalid_credentials', success: false }
        }
        if (error.message.includes('Email not confirmed')) {
            return { error: 'email_not_confirmed', success: false }
        }
        return { error: 'unknown_error', success: false }
    }

    // Use user from signIn response directly (avoids cookie timing issues)
    const user = data.user
    let role: string | null = user?.user_metadata?.role ?? null
    let profileTenantId: string | null = null

    if (user) {
        // Check profiles table for role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single()

        profileTenantId = (profile?.tenant_id as string | null) ?? null
        role = profile?.role || role

        role = await reconcileLegacyOwnerRole({
            userId: user.id,
            userEmail: user.email,
            currentRole: role,
            profileTenantId,
        })
    }

    const destination = resolvePostLoginDestination({
        lang,
        role,
        requestedRedirect,
    })

    redirect(destination)
}
