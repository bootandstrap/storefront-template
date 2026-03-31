/**
 * POS Offline Banner
 *
 * Sticky top banner showing connectivity + sync status.
 * Transitions: 🔴 Offline → 🟡 Syncing → 🟢 Synced
 */
'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, CloudUpload } from 'lucide-react'
import type { SyncStatus } from '@/lib/pos/offline/useOfflineSync'

interface POSOfflineBannerProps {
    isOnline: boolean
    syncStatus: SyncStatus
    pendingCount: number
    lastSyncTime: Date | null
    onSyncNow: () => void
    labels: Record<string, string>
}

export default function POSOfflineBanner({
    isOnline,
    syncStatus,
    pendingCount,
    lastSyncTime,
    onSyncNow,
    labels,
}: POSOfflineBannerProps) {
    const [visible, setVisible] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    // Show banner when offline or syncing or has pending sales
    useEffect(() => {
        if (!isOnline || syncStatus === 'syncing' || pendingCount > 0) {
            setVisible(true)
            setDismissed(false)
        } else if (syncStatus === 'synced' && isOnline) {
            // Show "synced" briefly then hide
            const timer = setTimeout(() => setVisible(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [isOnline, syncStatus, pendingCount])

    if (!visible || dismissed) return null

    // ── State configs ──
    const config = !isOnline
        ? {
            bg: 'bg-red-500/95',
            icon: <WifiOff className="w-4 h-4" />,
            text: labels['panel.pos.offline'] || 'Sin conexión — Las ventas se guardarán localmente',
            showPending: true,
            showSync: false,
            animate: false,
        }
        : syncStatus === 'syncing'
            ? {
                bg: 'bg-amber-500/95',
                icon: <RefreshCw className="w-4 h-4 animate-spin" />,
                text: labels['panel.pos.syncing'] || 'Sincronizando ventas pendientes…',
                showPending: true,
                showSync: false,
                animate: true,
            }
            : syncStatus === 'error'
                ? {
                    bg: 'bg-orange-500/95',
                    icon: <AlertCircle className="w-4 h-4" />,
                    text: labels['panel.pos.syncError'] || 'Error de sincronización',
                    showPending: true,
                    showSync: true,
                    animate: false,
                }
                : {
                    bg: 'bg-emerald-500/95',
                    icon: <CheckCircle2 className="w-4 h-4" />,
                    text: labels['panel.pos.synced'] || 'Todo sincronizado',
                    showPending: false,
                    showSync: false,
                    animate: false,
                }

    const timeAgo = lastSyncTime
        ? formatTimeAgo(lastSyncTime)
        : null

    return (
        <div
            className={`${config.bg} text-white px-4 py-2 flex items-center justify-between gap-3
                         text-sm font-medium backdrop-blur-sm transition-all duration-300
                         animate-[slide-down_0.3s_ease-out]`}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2 min-w-0">
                {config.icon}
                <span className="truncate">{config.text}</span>

                {config.showPending && pendingCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                     bg-white/20 text-xs font-bold whitespace-nowrap">
                        <CloudUpload className="w-3 h-3" />
                        {pendingCount}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {timeAgo && isOnline && (
                    <span className="text-xs opacity-75 hidden sm:inline">
                        {labels['panel.pos.lastSync'] || 'Última sync'}: {timeAgo}
                    </span>
                )}

                {config.showSync && (
                    <button
                        onClick={onSyncNow}
                        aria-label={labels['panel.pos.retry'] || 'Retry sync'}
                        className="px-3 py-1.5 rounded-md bg-white/20 hover:bg-glass min-h-[36px]
                                   text-xs font-medium transition-colors
                                   focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                    >
                        {labels['panel.pos.retry'] || 'Reintentar'}
                    </button>
                )}
            </div>
        </div>
    )
}

// ── Helper ──

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return '< 1 min'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `${hours}h`
}
