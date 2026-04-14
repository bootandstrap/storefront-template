/**
 * POST /api/panel/vault/restore — Restore from a backup
 *
 * Request body: { backup_name: string }
 * Validates tenant ownership, then executes restore.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { getTenantSlug } from '@/lib/backup/tenant-slug'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { executeRestore } from '@/lib/backup/backup-restore'

export async function POST(request: NextRequest) {
    try {
        const rl = await withRateLimit(request, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId, appConfig } = await withPanelGuard()
        const slug = await getTenantSlug(tenantId)

        const body = await request.json()
        const backupName = body?.backup_name as string

        if (!backupName) {
            return NextResponse.json({ error: 'Missing backup_name' }, { status: 400 })
        }

        // Security: ensure the backup belongs to this tenant
        if (!backupName.startsWith(`${slug}/`)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Check if backups are enabled
        const flags = appConfig.featureFlags as unknown as Record<string, boolean>
        if (!flags.enable_backups) {
            return NextResponse.json({ error: 'Backups not enabled' }, { status: 403 })
        }

        const scope = await getTenantMedusaScope(tenantId)
        if (!scope) {
            return NextResponse.json({ error: 'Medusa not connected' }, { status: 400 })
        }

        // Execute restore
        const result = await executeRestore(backupName, scope)

        return NextResponse.json({
            success: result.success,
            duration_ms: result.duration_ms,
            categories: result.categories,
            products: result.products,
            skipped_entities: result.skipped_entities,
            errors: result.errors.slice(0, 20), // Cap error list
        }, { status: result.success ? 200 : 207 }) // 207 = Multi-Status (partial success)
    } catch (err) {
        console.error('[vault/restore] POST error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}
