import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

const globalForStorageAdmin = globalThis as unknown as {
    __supabaseStorageAdminClient?: SupabaseClient
}

/**
 * Storage operations for private tenant backups require elevated access.
 * This client is server-only and must never be used from panel CRUD paths.
 */
export function createStorageAdminClient(): SupabaseClient {
    if (globalForStorageAdmin.__supabaseStorageAdminClient) {
        return globalForStorageAdmin.__supabaseStorageAdminClient
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error(
            '[storage-admin-client] NEXT_PUBLIC_SUPABASE_URL and GOVERNANCE_SUPABASE_SERVICE_KEY ' +
            '(or SUPABASE_SERVICE_ROLE_KEY) are required for private tenant-backups access'
        )
    }

    globalForStorageAdmin.__supabaseStorageAdminClient = createSupabaseClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return globalForStorageAdmin.__supabaseStorageAdminClient
}
