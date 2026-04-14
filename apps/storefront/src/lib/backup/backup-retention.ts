/**
 * Backup Retention Engine — Auto-prune old backups
 *
 * Implements a 3-tier retention policy (daily/weekly/monthly).
 * Runs after every successful backup to keep storage under control.
 *
 * Strategy:
 * 1. List all backups for a tenant
 * 2. Classify each by age bucket (daily, weekly, monthly)
 * 3. Keep only the newest N in each bucket
 * 4. Enforce max_total as hard ceiling
 * 5. Delete excess from Supabase Storage
 *
 * @module lib/backup/backup-retention
 */
import 'server-only'

import type { RetentionPolicy, BackupManifestEntry } from './backup-types'
import { RETENTION_TIERS } from './backup-types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(date1: Date, date2: Date): number {
    return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
}

function weekNumber(date: Date): string {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const week1 = new Date(d.getFullYear(), 0, 4)
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
}

function monthKey(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
}

// ── Core Retention Logic ─────────────────────────────────────────────────────

export interface RetentionResult {
    kept: string[]
    deleted: string[]
    total_freed_bytes: number
}

/**
 * Resolve which retention tier to use based on max_backups governance limit.
 */
export function resolveRetentionPolicy(maxBackups: number): RetentionPolicy {
    if (maxBackups >= 28) return RETENTION_TIERS.enterprise
    if (maxBackups >= 14) return RETENTION_TIERS.standard
    return RETENTION_TIERS.base
}

/**
 * Determine which backups to keep and which to delete.
 *
 * Does NOT perform deletion — just returns the decision.
 * Caller is responsible for executing deletions.
 */
export function planRetention(
    backups: BackupManifestEntry[],
    policy: RetentionPolicy,
): RetentionResult {
    const now = new Date()
    const kept: string[] = []
    const deleted: string[] = []
    let totalFreedBytes = 0

    // Sort by created_at DESC (newest first)
    const sorted = [...backups].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Classify by retention bucket
    const dailyKeep = new Set<string>()   // Keep newest N from last 14 days
    const weeklyKeep = new Set<string>()  // Keep 1 per week for last 8 weeks
    const monthlyKeep = new Set<string>() // Keep 1 per month for last 6 months

    // Daily: keep the newest `keep_daily` entries from recent backups
    const dailyCandidates = sorted.filter(b => daysBetween(new Date(b.created_at), now) <= 14)
    dailyCandidates.slice(0, policy.keep_daily).forEach(b => dailyKeep.add(b.name))

    // Weekly: keep 1 per week (the newest in each week)
    const weeklyBuckets = new Map<string, BackupManifestEntry>()
    for (const b of sorted) {
        const wk = weekNumber(new Date(b.created_at))
        if (!weeklyBuckets.has(wk)) {
            weeklyBuckets.set(wk, b)
        }
    }
    const weeklyEntries = Array.from(weeklyBuckets.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, policy.keep_weekly)
    weeklyEntries.forEach(b => weeklyKeep.add(b.name))

    // Monthly: keep 1 per month (the newest in each month)
    const monthlyBuckets = new Map<string, BackupManifestEntry>()
    for (const b of sorted) {
        const mk = monthKey(new Date(b.created_at))
        if (!monthlyBuckets.has(mk)) {
            monthlyBuckets.set(mk, b)
        }
    }
    const monthlyEntries = Array.from(monthlyBuckets.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, policy.keep_monthly)
    monthlyEntries.forEach(b => monthlyKeep.add(b.name))

    // Merge all "keep" sets
    const allKept = new Set<string>([...dailyKeep, ...weeklyKeep, ...monthlyKeep])

    // Enforce max_total hard ceiling
    if (allKept.size > policy.max_total) {
        // Keep only the newest max_total entries
        const sortedKept = [...allKept].sort((a, b) => {
            const aEntry = sorted.find(s => s.name === a)
            const bEntry = sorted.find(s => s.name === b)
            return new Date(bEntry?.created_at || 0).getTime() - new Date(aEntry?.created_at || 0).getTime()
        })
        const excess = sortedKept.slice(policy.max_total)
        excess.forEach(name => allKept.delete(name))
    }

    // Classify final decisions
    for (const backup of sorted) {
        if (allKept.has(backup.name)) {
            kept.push(backup.name)
        } else {
            deleted.push(backup.name)
            totalFreedBytes += backup.size_bytes
        }
    }

    return { kept, deleted, total_freed_bytes: totalFreedBytes }
}

/**
 * Execute retention cleanup for a tenant.
 *
 * Lists backups from Supabase Storage, plans retention, and deletes expired ones.
 */
export async function executeRetention(
    tenantSlug: string,
    maxBackups: number,
): Promise<RetentionResult> {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // List all backups
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
        'list_tenant_backups',
        { p_tenant_slug: tenantSlug }
    )

    if (rpcError || !rpcData) {
        console.error('[backup-retention] Failed to list backups:', rpcError)
        return { kept: [], deleted: [], total_freed_bytes: 0 }
    }

    const backups: BackupManifestEntry[] = Array.isArray(rpcData) ? rpcData : []
    if (backups.length === 0) {
        return { kept: [], deleted: [], total_freed_bytes: 0 }
    }

    // Plan retention
    const policy = resolveRetentionPolicy(maxBackups)
    const plan = planRetention(backups, policy)

    // Execute deletions
    for (const name of plan.deleted) {
        // Extract filename from full path (tenant-backups/{slug}/{filename})
        const fileName = name.replace(`${tenantSlug}/`, '')
        try {
            const { error } = await supabase
                .storage
                .from('tenant-backups')
                .remove([name])

            if (error) {
                console.error(`[backup-retention] Failed to delete ${name}:`, error.message)
            }
        } catch (err) {
            console.error(`[backup-retention] Error deleting ${name}:`, err)
        }
    }

    console.log(
        `[backup-retention] ${tenantSlug}: kept=${plan.kept.length}, deleted=${plan.deleted.length}, freed=${(plan.total_freed_bytes / 1024).toFixed(1)} KB`
    )

    return plan
}
