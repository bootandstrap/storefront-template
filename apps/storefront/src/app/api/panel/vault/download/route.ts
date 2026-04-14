/**
 * GET /api/panel/vault/download?name={path} — Generate signed download URL
 *
 * Returns a signed Supabase Storage URL (24h expiry) for downloading a backup.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantSlug } from '@/lib/backup/tenant-slug'

export async function GET(request: NextRequest) {
    try {
        const rl = await withRateLimit(request, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId } = await withPanelGuard()
        const slug = await getTenantSlug(tenantId)

        const { searchParams } = request.nextUrl
        const name = searchParams.get('name')

        if (!name || !slug) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        // Security: ensure the file belongs to this tenant
        if (!name.startsWith(`${slug}/`)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const supabase = createAdminClient()
        const { data, error } = await supabase
            .storage
            .from('tenant-backups')
            .createSignedUrl(name, 86400)  // 24 hour expiry

        if (error || !data?.signedUrl) {
            return NextResponse.json(
                { error: error?.message || 'Failed to generate URL' },
                { status: 500 }
            )
        }

        // Redirect to the signed URL for direct download
        return NextResponse.redirect(data.signedUrl)
    } catch (err) {
        console.error('[vault/download] GET error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}
