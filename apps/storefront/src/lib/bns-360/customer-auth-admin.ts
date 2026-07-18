import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

const globalForBns360AuthAdmin = globalThis as unknown as {
    __bns360AuthAdminClient?: SupabaseClient
}

function createBns360AuthAdminClient(): SupabaseClient {
    if (globalForBns360AuthAdmin.__bns360AuthAdminClient) return globalForBns360AuthAdmin.__bns360AuthAdminClient

    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error(
            '[bns-360-auth-admin] GOVERNANCE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and ' +
            'GOVERNANCE_SUPABASE_SERVICE_KEY are required for canary customer confirmation'
        )
    }

    globalForBns360AuthAdmin.__bns360AuthAdminClient = createSupabaseClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return globalForBns360AuthAdmin.__bns360AuthAdminClient
}

function assertCanaryCustomerEmail(email: string): void {
    const normalizedEmail = email.toLowerCase()
    if (!normalizedEmail.startsWith('bns360-customer+') || !normalizedEmail.endsWith('@bootandstrap.com')) {
        throw new Error('Refusing to confirm non-canary customer auth user')
    }
}

export async function createBns360CanaryCustomerAuthUser(input: {
    email: string
    password: string
    tenantId: string
    fullName: string
}): Promise<string> {
    assertCanaryCustomerEmail(input.email)

    const supabase = createBns360AuthAdminClient()
    const { data, error } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
            full_name: input.fullName,
            tenant_id: input.tenantId,
            role: 'customer',
        },
    })

    const userId = data.user?.id
    if (error || !userId) {
        throw new Error(error
            ? `Customer auth create failed: ${error.message}`
            : 'Customer auth create returned no user')
    }

    return userId
}

export async function confirmBns360CanaryCustomerAuthUser(userId: string, email: string): Promise<void> {
    if (!userId) throw new Error('Cannot confirm canary customer auth user without user id')
    assertCanaryCustomerEmail(email)

    const supabase = createBns360AuthAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
    })

    if (error) {
        throw new Error(`Customer auth confirmation failed: ${error.message}`)
    }
}
