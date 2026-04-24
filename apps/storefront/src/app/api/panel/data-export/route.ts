import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { logger } from '@/lib/logger'

/**
 * POST /api/panel/data-export
 *
 * GDPR Data Export — Owner requests a full export of their tenant data.
 * Enqueues a tenant_backup job with type='gdpr_export', which generates
 * a signed download link sent via email.
 *
 * Rate limited: 1 export per 24 hours (business) + platform-wide rate limit.
 */
export async function POST(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard()
        const admin = createAdminClient()

        // Check cooldown (1 per 24h)
        const cooldownCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: recent } = await (admin as any)
            .from('async_jobs')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('job_type', 'tenant_backup')
            .gte('created_at', cooldownCutoff)
            .limit(1)

        if (recent?.length) {
            return NextResponse.json(
                { error: 'Export already requested in the last 24 hours', cooldown: true },
                { status: 429 }
            )
        }

        // Enqueue GDPR export job
        const { error } = await (admin as any).from('async_jobs').insert({
            tenant_id: tenantId,
            job_type: 'tenant_backup',
            payload: {
                type: 'gdpr_export',
                requested_by: 'owner_panel',
                requested_at: new Date().toISOString(),
            },
        })

        if (error) {
            logger.error('[data-export] Failed to enqueue:', error.message)
            return NextResponse.json({ error: 'Failed to start export' }, { status: 500 })
        }

        // Audit log
        await (admin as any).from('audit_log').insert({
            tenant_id: tenantId,
            action: 'gdpr_data_export_requested',
            metadata: { source: 'owner_panel', timestamp: new Date().toISOString() },
        }).catch(() => { })

        return NextResponse.json({
            success: true,
            message: 'Export started. You will receive a download link via email.',
        })
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        logger.error('[data-export] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

/**
 * GET /api/panel/data-export
 *
 * Returns the status of the most recent data export request.
 */
export async function GET(req: NextRequest) {
    try {
        const { tenantId } = await withPanelGuard()
        const admin = createAdminClient()

        const { data: jobs } = await (admin as any)
            .from('async_jobs')
            .select('id, status, created_at, completed_at, result')
            .eq('tenant_id', tenantId)
            .eq('job_type', 'tenant_backup')
            .order('created_at', { ascending: false })
            .limit(3)

        const exports =
            jobs?.map((j: Record<string, unknown>) => ({
                id: j.id,
                status: j.status,
                requestedAt: j.created_at,
                completedAt: j.completed_at,
                downloadUrl: (j.result as Record<string, unknown>)?.download_url || null,
            })) || []

        return NextResponse.json({ exports })
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
