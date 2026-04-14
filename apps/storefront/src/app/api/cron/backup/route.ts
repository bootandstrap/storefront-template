/**
 * POST /api/cron/backup — CRON-triggered automated backup
 *
 * Called by the BSWEB job queue processor (tenant_backup job type).
 * Requires CRON_SECRET authorization.
 *
 * This endpoint:
 * 1. Validates CRON_SECRET
 * 2. Resolves tenant scope from env
 * 3. Executes full backup + retention cleanup
 * 4. Returns results for the job processor to log
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRequiredTenantId } from '@/lib/config'
import { executeFullBackup } from '@/lib/backup/backup-executor'
import { executeRetention } from '@/lib/backup/backup-retention'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getTenantSlug } from '@/lib/backup/tenant-slug'

export async function POST(request: NextRequest) {
    try {
        // 1. Validate CRON_SECRET
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Parse optional params from body
        let maxBackups = 6
        let backupFrequencyHours = 168
        try {
            const body = await request.json()
            maxBackups = body?.max_backups ?? maxBackups
            backupFrequencyHours = body?.backup_frequency_hours ?? backupFrequencyHours
        } catch {
            // no body is fine
        }

        // 3. Resolve tenant
        const tenantId = getRequiredTenantId()
        const slug = await getTenantSlug(tenantId)
        const scope = await getTenantMedusaScope(tenantId)

        if (!scope) {
            return NextResponse.json(
                { error: 'Medusa not connected', tenant_id: tenantId },
                { status: 503 }
            )
        }

        // 4. Execute backup
        const backupResult = await executeFullBackup(tenantId, slug, scope)

        if (!backupResult.success) {
            return NextResponse.json(
                { error: backupResult.error, tenant_id: tenantId },
                { status: 500 }
            )
        }

        // 5. Run retention cleanup
        const retentionResult = await executeRetention(slug, maxBackups)

        return NextResponse.json({
            success: true,
            tenant_id: tenantId,
            slug,
            backup: {
                key: backupResult.backup_key,
                size_bytes: backupResult.size_bytes,
                duration_ms: backupResult.duration_ms,
                stats: backupResult.stats,
            },
            retention: {
                kept: retentionResult.kept.length,
                deleted: retentionResult.deleted.length,
                freed_bytes: retentionResult.total_freed_bytes,
            },
        })
    } catch (err) {
        console.error('[cron/backup] Error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}
