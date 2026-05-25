import 'server-only'

import { resolveTenantContext } from '@bootandstrap/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { profilesTable } from '@/lib/chat/db'

export interface ChatPanelContext {
    tenantId: string
    userId: string | null
    isAuthenticated: boolean
    isPanelAccessAllowed: boolean
}

export async function getChatPanelContext(expectedTenantId: string): Promise<ChatPanelContext> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            tenantId: expectedTenantId,
            userId: null,
            isAuthenticated: false,
            isPanelAccessAllowed: false,
        }
    }

    const { data: profile } = await profilesTable()
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    const tenantContext = resolveTenantContext({
        profileRole: profile?.role ?? null,
        metadataRole: user.user_metadata?.role ?? null,
        profileTenantId: profile?.tenant_id ?? null,
        envTenantId: process.env.TENANT_ID ?? null,
    })

    return {
        tenantId: expectedTenantId,
        userId: user.id,
        isAuthenticated: true,
        isPanelAccessAllowed: tenantContext.isPanelRole && tenantContext.tenantId === expectedTenantId,
    }
}
