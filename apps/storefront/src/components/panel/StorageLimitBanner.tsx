/**
 * StorageLimitBanner — Shows storage usage warnings in the Owner Panel.
 *
 * Fetches tenant storage via the vault/storage API and displays tiered warnings:
 * - 80-95%: yellow warning
 * - 95-100%: red critical
 * - 100%+: red block message
 *
 * Designed to be embedded in product/catalog pages where uploads happen.
 *
 * @module components/panel/StorageLimitBanner
 */
'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, HardDrive, XCircle } from 'lucide-react'

interface StorageLimitBannerProps {
    /** Storage limit in MB from plan_limits */
    storageLimitMb: number
    /** Optional dictionary for i18n */
    labels?: {
        warningTitle?: string
        criticalTitle?: string
        blockedTitle?: string
        usedOf?: string
    }
}

interface StorageData {
    total: { mb: number }
}

export function StorageLimitBanner({ storageLimitMb, labels }: StorageLimitBannerProps) {
    const [storage, setStorage] = useState<StorageData | null>(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        async function fetchStorage() {
            try {
                const res = await fetch('/api/panel/vault')
                if (res.ok) {
                    const data = await res.json()
                    // Vault route returns { usage: { total: { mb } }, limit_mb, usage_percent }
                    if (data?.usage) {
                        setStorage(data.usage)
                    }
                }
            } catch {
                // Non-critical — fail silently
            }
        }
        fetchStorage()
    }, [])

    if (!storage || dismissed || storageLimitMb <= 0) return null

    const usedMb = storage.total.mb
    const usagePercent = Math.round((usedMb / storageLimitMb) * 100)

    // Only show if usage > 80%
    if (usagePercent < 80) return null

    const isBlocked = usagePercent >= 100
    const isCritical = usagePercent >= 95

    const config = isBlocked
        ? {
            bg: 'bg-red-50 border-red-300',
            icon: <XCircle className="w-5 h-5 text-red-600 shrink-0" />,
            title: labels?.blockedTitle || '⛔ Almacenamiento lleno — no se pueden subir más archivos',
            textColor: 'text-red-800',
            subColor: 'text-red-600',
        }
        : isCritical
        ? {
            bg: 'bg-red-50 border-red-200',
            icon: <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />,
            title: labels?.criticalTitle || '🔴 Almacenamiento casi lleno',
            textColor: 'text-red-700',
            subColor: 'text-red-500',
        }
        : {
            bg: 'bg-amber-50 border-amber-200',
            icon: <HardDrive className="w-5 h-5 text-amber-500 shrink-0" />,
            title: labels?.warningTitle || '⚠️ Almacenamiento alto',
            textColor: 'text-amber-700',
            subColor: 'text-amber-500',
        }

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${config.bg} animate-in fade-in duration-300`}>
            {config.icon}
            <div className="flex-1 min-w-0">
                <span className={`text-sm font-bold ${config.textColor}`}>{config.title}</span>
                <p className={`text-xs mt-0.5 ${config.subColor}`}>
                    {usedMb.toFixed(1)} MB / {storageLimitMb} MB ({usagePercent}%)
                    {' · '}
                    {labels?.usedOf || 'Libera espacio eliminando imágenes o contacta soporte para ampliación.'}
                </p>
            </div>
            {!isBlocked && (
                <button
                    onClick={() => setDismissed(true)}
                    className="text-slate-400 hover:text-slate-600 text-sm px-2"
                    aria-label="Cerrar"
                >
                    ✕
                </button>
            )}
        </div>
    )
}
