'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { checkLimit } from '@/lib/limits'
import { logTenantError } from '@/lib/log-tenant-error'
import { logger } from '@/lib/logger'

export interface RegisterState {
    error: string | null
    success: boolean
}

export async function registerAction(
    _prev: RegisterState,
    formData: FormData,
): Promise<RegisterState> {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const lang = formData.get('lang') as string || 'es'

    if (!email || !password) {
        return { error: 'fields_required', success: false }
    }

    if (password.length < 6) {
        return { error: 'password_too_short', success: false }
    }

    // -----------------------------------------------------------------------
    // Governance: feature flag + plan limit (server-side enforcement)
    // Uses admin client for count (bypasses RLS → accurate tenant-scoped count)
    // -----------------------------------------------------------------------
    const { featureFlags, planLimits } = await getConfig()

    if (!isFeatureEnabled(featureFlags, 'enable_user_registration')) {
        return { error: 'registration_disabled', success: false }
    }

    const tenantId = getRequiredTenantId()

    // FAIL-CLOSED: if customer count query fails, block registration
    // rather than silently allowing unlimited registrations.
    const adminClient = createAdminClient()
    const { count: customerCount, error: countError } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer')
        .eq('tenant_id', tenantId)

    if (countError) {
        logger.error('[register] FAIL-CLOSED: Customer count query failed:', countError.message)
        await logTenantError({
            source: 'registration',
            severity: 'error',
            message: `Customer count query failed: ${countError.message}`,
            details: { code: countError.code },
        })
        return { error: 'unknown_error', success: false }
    }

    const limitCheck = checkLimit(planLimits, 'max_customers', customerCount ?? 0)
    if (!limitCheck.allowed) {
        return { error: 'max_customers_reached', success: false }
    }

    // Auth signup uses cookie-based client (creates user session)
    const supabase = await createClient()

    // -----------------------------------------------------------------------
    // Sign up
    // -----------------------------------------------------------------------
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName || email.split('@')[0],
            },
        },
    })

    if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
            return { error: 'email_exists', success: false }
        }
        if (error.message.includes('Password')) {
            return { error: 'password_too_weak', success: false }
        }
        logger.error('[register] Supabase error:', error.message)
        return { error: 'unknown_error', success: false }
    }

    // Auto-login: signUp with Supabase creates a session automatically
    redirect(`/${lang}/cuenta`)
}
