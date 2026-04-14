/**
 * VaultClient — Tenant Backup & Storage Management UI
 *
 * Part of the Capacidad module. Shows:
 * - Real-time storage meter (images + backups breakdown)
 * - Backup history with download + restore
 * - Manual backup trigger (gated by enable_manual_backup)
 * - Next scheduled backup countdown
 *
 * @module panel/capacidad/VaultClient
 */
'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import {
    HardDrive,
    Download,
    Shield,
    Clock,
    Archive,
    Image as ImageIcon,
    RefreshCw,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Zap,
    RotateCcw,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface StorageUsage {
    images: { count: number; bytes: number; mb: number }
    backups: { count: number; bytes: number; mb: number }
    total: { bytes: number; mb: number }
}

interface BackupEntry {
    name: string
    size_bytes: number
    size_mb: number
    created_at: string
    mime_type: string
}

interface VaultProps {
    lang: string
    storageLimitMb: number
    enableBackups: boolean
    enableManualBackup: boolean
    maxBackups: number
    backupFrequencyHours: number
    labels: {
        title: string
        subtitle: string
        storage: string
        images: string
        backups: string
        used: string
        limit: string
        backupHistory: string
        noBackups: string
        noBackupsDesc: string
        createBackup: string
        creatingBackup: string
        download: string
        lastBackup: string
        nextBackup: string
        full: string
        incremental: string
        backupSuccess: string
        backupError: string
        size: string
        date: string
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

function getStorageColor(percent: number): string {
    if (percent < 50) return '#22c55e'
    if (percent < 80) return '#eab308'
    return '#ef4444'
}

function timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VaultClient({
    lang,
    storageLimitMb,
    enableBackups,
    enableManualBackup,
    maxBackups,
    backupFrequencyHours,
    labels,
}: VaultProps) {
    const [usage, setUsage] = useState<StorageUsage | null>(null)
    const [backups, setBackups] = useState<BackupEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [backupInProgress, setBackupInProgress] = useState(false)
    const [restoreInProgress, setRestoreInProgress] = useState<string | null>(null)
    const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [isPending, startTransition] = useTransition()

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [storageRes, backupsRes] = await Promise.all([
                fetch('/api/panel/vault'),
                fetch('/api/panel/vault/backups'),
            ])
            if (storageRes.ok) {
                const data = await storageRes.json()
                setUsage(data.usage)
            }
            if (backupsRes.ok) {
                const data = await backupsRes.json()
                setBackups(data.backups ?? [])
            }
        } catch { /* silently fail */ }
        setLoading(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const triggerBackup = useCallback(async () => {
        setBackupInProgress(true)
        setActionResult(null)
        try {
            const res = await fetch('/api/panel/vault', { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                setActionResult({ type: 'success', message: labels.backupSuccess })
                startTransition(() => { fetchData() })
            } else {
                setActionResult({ type: 'error', message: data.error || labels.backupError })
            }
        } catch {
            setActionResult({ type: 'error', message: labels.backupError })
        }
        setBackupInProgress(false)
    }, [labels, fetchData])

    const triggerRestore = useCallback(async (backupName: string) => {
        const confirmed = window.confirm(
            'Restore from this backup?\n\n' +
            '• Categories and products will be recreated if missing\n' +
            '• Existing data will NOT be overwritten\n' +
            '• Orders and customers are not affected\n\n' +
            'Continue?'
        )
        if (!confirmed) return

        setRestoreInProgress(backupName)
        setActionResult(null)
        try {
            const res = await fetch('/api/panel/vault/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backup_name: backupName }),
            })
            const data = await res.json()
            if (res.ok || res.status === 207) {
                const cats = data.categories || {}
                const prods = data.products || {}
                setActionResult({
                    type: data.success ? 'success' : 'error',
                    message: `Restore: ${cats.created + prods.created} created, ${cats.skipped + prods.skipped} skipped${data.errors?.length ? `, ${data.errors.length} errors` : ''}`,
                })
            } else {
                setActionResult({ type: 'error', message: data.error || 'Restore failed' })
            }
        } catch {
            setActionResult({ type: 'error', message: 'Restore failed' })
        }
        setRestoreInProgress(null)
    }, [])

    const usagePercent = usage && storageLimitMb > 0
        ? Math.round((usage.total.mb / storageLimitMb) * 100) : 0
    const storageColor = getStorageColor(usagePercent)
    const lastBackup = backups.length > 0 ? backups[0] : null
    const nextBackupDate = lastBackup
        ? new Date(new Date(lastBackup.created_at).getTime() + backupFrequencyHours * 3600000)
        : null

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Storage Meter */}
            <div className="bg-sf-0 border border-sf-3/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-brand" />
                        <h3 className="text-sm font-bold text-tx">{labels.storage}</h3>
                    </div>
                    <button onClick={fetchData} disabled={isPending}
                        className="p-1.5 rounded-lg hover:bg-sf-1 transition-colors text-tx-muted">
                        <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="space-y-2">
                    <div className="h-3 rounded-full bg-sf-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(usagePercent, 100)}%`, backgroundColor: storageColor }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-tx-muted">
                        <span>{usage?.total.mb ?? 0} MB {labels.used}</span>
                        <span>{storageLimitMb} MB {labels.limit}</span>
                    </div>
                </div>

                {usage && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sf-1/50">
                            <ImageIcon className="w-4 h-4 text-purple-500" />
                            <div>
                                <p className="text-xs font-bold text-tx">{usage.images.mb} MB</p>
                                <p className="text-[10px] text-tx-muted">{usage.images.count} {labels.images}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sf-1/50">
                            <Archive className="w-4 h-4 text-teal-500" />
                            <div>
                                <p className="text-xs font-bold text-tx">{usage.backups.mb} MB</p>
                                <p className="text-[10px] text-tx-muted">{usage.backups.count} {labels.backups}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Manual Backup + Schedule */}
            {enableBackups && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {enableManualBackup && (
                        <button onClick={triggerBackup} disabled={backupInProgress}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-lg shadow-brand-soft">
                            {backupInProgress
                                ? <><Loader2 className="w-4 h-4 animate-spin" />{labels.creatingBackup}</>
                                : <><Shield className="w-4 h-4" />{labels.createBackup}</>}
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-xs text-tx-muted px-3">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{lastBackup ? `${labels.lastBackup}: ${timeAgo(lastBackup.created_at)}` : labels.noBackups}</span>
                        {nextBackupDate && nextBackupDate > new Date() && (
                            <span className="text-tx-muted/60">· {labels.nextBackup}: {nextBackupDate.toLocaleDateString(lang)}</span>
                        )}
                    </div>
                </div>
            )}

            {/* Action result toast */}
            {actionResult && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
                    actionResult.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {actionResult.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {actionResult.message}
                </div>
            )}

            {/* Backup History */}
            <div className="bg-sf-0 border border-sf-3/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-brand" />
                    <h3 className="text-sm font-bold text-tx">{labels.backupHistory}</h3>
                    <span className="text-xs text-tx-muted ml-auto">{backups.length}/{maxBackups} max</span>
                </div>

                {backups.length === 0 ? (
                    <div className="text-center py-8">
                        <Shield className="w-8 h-8 mx-auto text-tx-muted opacity-30 mb-2" />
                        <p className="text-sm text-tx-muted">{labels.noBackups}</p>
                        <p className="text-xs text-tx-muted mt-1">{labels.noBackupsDesc}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {backups.map((backup, idx) => {
                            const isLatest = idx === 0
                            const fileName = backup.name.split('/').pop() || backup.name
                            const isFull = fileName.includes('_full')
                            const isRestoring = restoreInProgress === backup.name

                            return (
                                <div key={backup.name}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                        isLatest ? 'bg-sf-0 border-brand/20' : 'bg-sf-0 border-sf-3/20 opacity-80'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        isFull ? 'bg-brand-subtle' : 'bg-teal-50'
                                    }`}>
                                        {isFull ? <Zap className="w-4 h-4 text-brand" /> : <RefreshCw className="w-3.5 h-3.5 text-teal-600" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-tx">{isFull ? labels.full : labels.incremental}</p>
                                            {isLatest && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">LATEST</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-tx-muted">
                                            {new Date(backup.created_at).toLocaleString(lang)}{' · '}{formatBytes(backup.size_bytes)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => triggerRestore(backup.name)} disabled={!!restoreInProgress}
                                            className="p-2 rounded-lg text-tx-muted hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                                            title="Restore">
                                            {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => window.open(`/api/panel/vault/download?name=${encodeURIComponent(backup.name)}`, '_blank')}
                                            className="p-2 rounded-lg text-tx-muted hover:text-brand hover:bg-sf-1 transition-colors"
                                            title={labels.download}>
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
