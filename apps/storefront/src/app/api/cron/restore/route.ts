/**
 * POST /api/cron/restore — CRON-triggered limited tenant restore
 *
 * Called by BSWEB admin-plane restore jobs.
 * Requires CRON_SECRET authorization.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRequiredTenantId } from '@/lib/config'
import { getTenantSlug } from '@/lib/backup/tenant-slug'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { executeRestore } from '@/lib/backup/backup-restore'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const backupKey = body?.backup_key as string | undefined
        if (!backupKey) {
            return NextResponse.json({ error: 'Missing backup_key' }, { status: 400 })
        }

        const tenantId = getRequiredTenantId()
        const slug = await getTenantSlug(tenantId)
        if (!backupKey.startsWith(`${slug}/`)) {
            return NextResponse.json({ error: 'Backup does not belong to this tenant' }, { status: 403 })
        }

        const scope = await getTenantMedusaScope(tenantId)
        if (!scope) {
            return NextResponse.json({ error: 'Medusa not connected' }, { status: 503 })
        }

        const result = await executeRestore(backupKey, scope)

        return NextResponse.json({
            success: result.success,
            backup_key: backupKey,
            duration_ms: result.duration_ms,
            categories: result.categories,
            products: result.products,
            skipped_entities: result.skipped_entities,
            errors: result.errors.slice(0, 20),
        }, { status: result.success ? 200 : 207 })
    } catch (err) {
        logger.error('[cron/restore] Error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        )
    }
}
