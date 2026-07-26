/**
 * GET /api/panel/vault/backups — List all backups for the tenant
 */
import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantSlug } from '@/lib/backup/tenant-slug'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'

type ListBackupsRpc = (
    name: 'list_tenant_backups',
    args: { p_tenant_slug: string }
) => Promise<{ data: unknown; error: { message: string } | null }>

export async function GET(req: NextRequest) {
    try {
        const rl = await withRateLimit(req, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId } = await withPanelGuard()
        const slug = await getTenantSlug(tenantId)

        const supabase = createAdminClient()
        const listBackups = supabase.rpc as unknown as ListBackupsRpc
        const { data, error } = await listBackups(
            'list_tenant_backups',
            { p_tenant_slug: slug }
        )

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ backups: data ?? [] })
    } catch (err) {
        logger.error('[vault/backups] GET error:', err)
        return toPanelErrorResponse(err)
    }
}
