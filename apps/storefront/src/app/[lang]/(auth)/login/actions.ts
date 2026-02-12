'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

    if (!email || !password) {
        return { error: 'Email and password are required', success: false }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
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

    // Fetch user role to determine redirect destination
    const { data: { user } } = await supabase.auth.getUser()
    let destination = `/${lang}/cuenta`

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role
        if (role === 'super_admin' || role === 'owner' || role === 'admin') {
            destination = `/${lang}/panel`
        }
    }

    redirect(destination)
}
