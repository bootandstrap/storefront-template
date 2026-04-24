/**
 * POS Offline Sync Hook
 *
 * Manages the complete offline lifecycle:
 * - Product cache loading + periodic refresh
 * - Offline sale queueing
 * - Automatic queue drain on reconnect
 * - Connectivity state tracking
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CachedProduct, PendingSale } from './offline-store'
import { logger } from '@/lib/logger'

// ── Constants ──

const PRODUCT_REFRESH_INTERVAL = 5 * 60 * 1000  // 5 minutes
const SYNC_RETRY_DELAYS = [2000, 5000, 15000]   // Retry backoff
const MAX_SYNC_ATTEMPTS = 3
const STALE_SALE_MAX_AGE = 24 * 60 * 60 * 1000  // 24 hours

// ── Types ──

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export interface UseOfflineSyncReturn {
    isOnline: boolean
    syncStatus: SyncStatus
    pendingCount: number
    lastSyncTime: Date | null
    cachedProducts: CachedProduct[]
    offlineInventoryOffsets: Record<string, number>
    syncNow: () => Promise<void>
    queueOfflineSale: (sale: Omit<PendingSale, 'id' | 'sync_attempts' | 'offline_ref'>) => Promise<void>
}

// ── Hook ──

export function useOfflineSync(): UseOfflineSyncReturn {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
    const [pendingCount, setPendingCount] = useState(0)
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
    const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([])

    const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isSyncingRef = useRef(false)

    // ── Load cached products from IndexedDB on mount ──
    useEffect(() => {
        let cancelled = false

        async function init() {
            try {
                const store = await import('./offline-store')
                const products = await store.getProducts()
                if (!cancelled) setCachedProducts(products)

                const count = await store.getPendingSaleCount()
                if (!cancelled) setPendingCount(count)

                const lastSync = await store.getLastSyncTime()
                if (!cancelled && lastSync) setLastSyncTime(new Date(lastSync))
            } catch {
                // IndexedDB unavailable — degrade gracefully
            }
        }

        init()
        return () => { cancelled = true }
    }, [])

    // ── Online/offline event listeners ──
    useEffect(() => {
        function handleOnline() {
            setIsOnline(true)
        }
        function handleOffline() {
            setIsOnline(false)
            setSyncStatus('idle')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // ── Compute Offline Inventory Offsets ──
    const [offlineInventoryOffsets, setOfflineInventoryOffsets] = useState<Record<string, number>>({})

    const computeInventoryOffsets = useCallback(async () => {
        try {
            const store = await import('./offline-store')
            const allPending = await store.getPendingSales()
            const offsets: Record<string, number> = {}
            for (const sale of allPending) {
                for (const item of sale.items) {
                    offsets[item.variant_id] = (offsets[item.variant_id] || 0) + item.quantity
                }
            }
            setOfflineInventoryOffsets(offsets)
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        computeInventoryOffsets()
    }, [pendingCount, computeInventoryOffsets])

    // ── Drain pending sales queue ──
    const drainQueue = useCallback(async () => {
        if (isSyncingRef.current) return
        isSyncingRef.current = true

        try {
            // Check for pending sales BEFORE expensive dynamic imports
            const store = await import('./offline-store')

            // Auto-purge stale sales (>24h old or exceeded max sync attempts)
            const allPending = await store.getPendingSales()
            const now = Date.now()
            for (const sale of allPending) {
                const age = now - new Date(sale.created_at).getTime()
                if (age > STALE_SALE_MAX_AGE || sale.sync_attempts >= MAX_SYNC_ATTEMPTS) {
                    await store.removePendingSale(sale.id!)
                }
            }

            const currentCount = await store.getPendingSaleCount()

            // Nothing to sync — skip server action import entirely
            if (currentCount === 0) {
                setPendingCount(0)
                setSyncStatus('synced')
                return
            }

            setSyncStatus('syncing')

            const { createPOSSale } = await import(
                '@/app/[lang]/(panel)/panel/pos/actions'
            )

            const pendingSales = await store.getPendingSales()

            for (const sale of pendingSales) {
                if (sale.sync_attempts >= MAX_SYNC_ATTEMPTS) continue

                try {
                    const result = await createPOSSale({
                        items: sale.items,
                        payment_method: sale.payment_method as 'cash' | 'card_terminal' | 'twint' | 'manual_card',
                        customer_id: sale.customer_id,
                        discount_amount: sale.discount_amount,
                        note: `offline_ref:${sale.offline_ref}`,
                    })

                    if (result.success) {
                        await store.removePendingSale(sale.id!)
                    } else {
                        await store.updatePendingSale({
                            ...sale,
                            sync_attempts: sale.sync_attempts + 1,
                            last_error: result.error || 'Unknown error',
                        })
                    }
                } catch (err) {
                    await store.updatePendingSale({
                        ...sale,
                        sync_attempts: sale.sync_attempts + 1,
                        last_error: err instanceof Error ? err.message : 'Network error',
                    })
                }
            }

            const remaining = await store.getPendingSaleCount()
            setPendingCount(remaining)
            setSyncStatus(remaining === 0 ? 'synced' : 'error')
        } catch {
            // Only show error if there were actually pending sales to sync
            // Prevents false banner when Medusa/server is temporarily unreachable
            // and there is nothing to sync
            if (pendingCount > 0) {
                setSyncStatus('error')
            } else {
                setSyncStatus('idle')
            }
        } finally {
            isSyncingRef.current = false
            computeInventoryOffsets()
        }
    }, [pendingCount, computeInventoryOffsets])

    // ── Refresh product cache from server ──
    const refreshProducts = useCallback(async () => {
        if (!navigator.onLine) return

        try {
            const store = await import('./offline-store')
            const { syncProductCatalogAction } = await import('./product-sync')

            const lastSync = await store.getLastSyncTime()
            const result = await syncProductCatalogAction(lastSync ?? undefined)

            if (result.products.length > 0) {
                await store.cacheProducts(result.products)
            }

            await store.setLastSyncTime(result.serverTime)
            setLastSyncTime(new Date(result.serverTime))

            // Reload full cache
            const allProducts = await store.getProducts()
            setCachedProducts(allProducts)
        } catch {
            // Silent failure — cached products still available
        }
    }, [])

    // ── Sync now (manual trigger) ──
    const syncNow = useCallback(async () => {
        await drainQueue()
        await refreshProducts()
    }, [drainQueue, refreshProducts])

    // ── Auto-sync on reconnect ──
    useEffect(() => {
        if (isOnline) {
            // Drain queue when coming back online
            drainQueue()
            // Refresh products
            refreshProducts()
        }
    }, [isOnline, drainQueue, refreshProducts])

    // ── Periodic product refresh (every 5 min when online) ──
    useEffect(() => {
        if (isOnline) {
            refreshTimerRef.current = setInterval(refreshProducts, PRODUCT_REFRESH_INTERVAL)
        } else {
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
        }

        return () => {
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
        }
    }, [isOnline, refreshProducts])

    // ── Queue an offline sale ──
    const queueOfflineSale = useCallback(
        async (sale: Omit<PendingSale, 'id' | 'sync_attempts' | 'offline_ref'>) => {
            try {
                const store = await import('./offline-store')
                const offlineRef = crypto.randomUUID()

                await store.queueSale({
                    ...sale,
                    offline_ref: offlineRef,
                    sync_attempts: 0,
                })

                const count = await store.getPendingSaleCount()
                setPendingCount(count)
                computeInventoryOffsets()
            } catch (err) {
                logger.error('[POS Offline] Failed to queue sale:', err)
                throw err
            }
        },
        [computeInventoryOffsets]
    )

    return {
        isOnline,
        syncStatus,
        pendingCount,
        lastSyncTime,
        cachedProducts,
        offlineInventoryOffsets,
        syncNow,
        queueOfflineSale,
    }
}

