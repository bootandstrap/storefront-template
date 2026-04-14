/**
 * GET /api/panel/vault/storage — Real storage usage for the tenant
 * POST /api/panel/vault/backup — Trigger manual backup
 */
import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { getTenantStorageUsage } from '@/lib/storage-usage'
import { executeFullBackup } from '@/lib/backup/backup-executor'
import { executeRetention } from '@/lib/backup/backup-retention'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getTenantSlug } from '@/lib/backup/tenant-slug'

export async function GET(req: NextRequest) {
    try {
        const rl = await withRateLimit(req, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId, appConfig } = await withPanelGuard()
        const slug = await getTenantSlug(tenantId)
        const usage = await getTenantStorageUsage(slug)
        const storageLimitMb = (appConfig.planLimits as unknown as Record<string, number>).storage_limit_mb ?? 250

        return NextResponse.json({
            usage,
            limit_mb: storageLimitMb,
            usage_percent: storageLimitMb > 0
                ? Math.round((usage.total.mb / storageLimitMb) * 100)
                : 0,
        })
    } catch (err) {
        console.error('[vault/storage] GET error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const rl = await withRateLimit(req, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { tenantId, appConfig } = await withPanelGuard()
        const slug = await getTenantSlug(tenantId)
        const scope = await getTenantMedusaScope(tenantId)

        if (!scope) {
            return NextResponse.json({ error: 'Medusa not connected' }, { status: 400 })
        }

        // Check if backups are enabled
        const flags = appConfig.featureFlags as Record<string, boolean>
        if (!flags.enable_backups) {
            return NextResponse.json({ error: 'Backups not enabled' }, { status: 403 })
        }

        // Execute backup
        const result = await executeFullBackup(tenantId, slug, scope)
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        // Run retention cleanup after successful backup
        const limits = appConfig.planLimits as unknown as Record<string, number>
        const maxBackups = limits.max_backups ?? 6
        const retention = await executeRetention(slug, maxBackups)

        return NextResponse.json({
            backup: {
                key: result.backup_key,
                size_bytes: result.size_bytes,
                duration_ms: result.duration_ms,
                stats: result.stats,
            },
            retention: {
                kept: retention.kept.length,
                deleted: retention.deleted.length,
                freed_bytes: retention.total_freed_bytes,
            },
        })
    } catch (err) {
        console.error('[vault/backup] POST error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}
