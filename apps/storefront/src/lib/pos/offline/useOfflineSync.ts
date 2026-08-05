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
import {
    createPOSSyncOperation,
    POSSyncTransportError,
    synchronizePOSOperation,
    type POSSyncCommitRequest,
    type POSSyncCommitResponse,
    type POSSyncResult,
    type POSSyncTransport,
} from './pos-sync-protocol'
import { logger } from '@/lib/logger'

// ── Constants ──

const PRODUCT_REFRESH_INTERVAL = 5 * 60 * 1000  // 5 minutes
const MAX_SYNC_ATTEMPTS = 3

type CreatePOSSaleAction = (input: {
    items: PendingSale['items']
    payment_method: 'cash' | 'card_terminal' | 'twint' | 'manual_card'
    customer_id?: string
    discount_amount: number
    note: string
    sync: {
        tenant_id: string
        operation_id: string
        idempotency_key: string
        client_id: string
        client_sequence: number
        known_server_sequence: number
    }
}) => Promise<{
    success: boolean
    error?: string
    display_id?: number
    sync?: {
        outcome: POSSyncCommitResponse['outcome']
        operation_id: string
        idempotency_key: string
        server_sequence: number
        last_client_sequence: number
    }
}>
type OfflineStore = typeof import('./offline-store')
type ProductSyncResult = import('./product-sync').ProductSyncResult

// ── Types ──

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export interface UseOfflineSyncReturn {
    isOnline: boolean
    syncStatus: SyncStatus
    pendingCount: number
    lastSyncTime: Date | null
    cachedProducts: CachedProduct[]
    offlineInventoryOffsets: Record<string, number>
    availability: 'available' | 'unavailable'
    availabilityError: string | null
    syncNow: () => Promise<void>
    queueOfflineSale: (sale: Omit<PendingSale,
        | 'id'
        | 'sync_attempts'
        | 'offline_ref'
        | 'tenant_id'
        | 'operation_id'
        | 'client_id'
        | 'client_sequence'
        | 'known_server_sequence'
        | 'sync_state'
    >) => Promise<void>
}

export async function applyProductCatalogSyncResult(
    store: Pick<OfflineStore, 'replaceProducts' | 'setLastSyncTime' | 'getProducts'>,
    result: ProductSyncResult,
): Promise<CachedProduct[]> {
    if (result.error) {
        throw new Error(result.error)
    }

    await store.replaceProducts(result.products)
    await store.setLastSyncTime(result.serverTime)
    return store.getProducts()
}

export async function syncPendingSaleWithProtocol(
    sale: PendingSale,
    expectedTenantId: string,
    transport: POSSyncTransport,
): Promise<POSSyncResult> {
    if (!sale.tenant_id?.trim()) {
        throw new Error('POS sync unavailable: tenant metadata is missing')
    }
    if (!sale.operation_id?.trim() || !sale.offline_ref?.trim() || !sale.client_id?.trim()) {
        throw new Error('POS sync unavailable: durable operation metadata is missing')
    }

    const grossAmount = sale.items.reduce(
        (total, item) => total + (item.unit_price * item.quantity),
        0,
    )
    const amountMinor = Math.max(0, grossAmount - sale.discount_amount)
    const operation = createPOSSyncOperation({
        tenantId: sale.tenant_id,
        operationId: sale.operation_id,
        idempotencyKey: sale.offline_ref,
        clientId: sale.client_id,
        clientSequence: sale.client_sequence,
        createdAt: sale.created_at,
        amountMinor,
        payload: {
            items: sale.items,
            payment_method: sale.payment_method,
            customer_id: sale.customer_id,
            discount_amount: sale.discount_amount,
        },
    })

    return synchronizePOSOperation({
        operation,
        expectedTenantId,
        knownServerSequence: sale.known_server_sequence,
    }, transport)
}

function authoritativeResponse(
    request: POSSyncCommitRequest,
    result: Awaited<ReturnType<CreatePOSSaleAction>>,
): POSSyncCommitResponse {
    const sync = result.sync
    const correlated = sync?.operation_id === request.operation.operationId
        && sync?.idempotency_key === request.operation.idempotencyKey
    const allowedOutcome = ['committed', 'duplicate', 'conflict'].includes(sync?.outcome ?? '')
    const sequenced = Number.isInteger(sync?.server_sequence)
        && (sync?.server_sequence ?? -1) >= request.knownServerSequence
        && Number.isInteger(sync?.last_client_sequence)
        && (sync?.last_client_sequence ?? -1) >= request.operation.clientSequence
    const commitAdvancedServer = sync?.outcome !== 'committed'
        || (sync?.server_sequence ?? -1) > request.knownServerSequence
    if (!correlated || !allowedOutcome || !sequenced || !commitAdvancedServer) {
        throw new POSSyncTransportError('unavailable', 'permanent', 'afterCommit')
    }
    return {
        outcome: sync.outcome,
        serverSequence: sync.server_sequence,
        lastClientSequence: sync.last_client_sequence,
    }
}

export function createPOSSyncTransport(createPOSSale: CreatePOSSaleAction): POSSyncTransport {
    return {
        async commit(request: POSSyncCommitRequest): Promise<POSSyncCommitResponse> {
            const payload = request.operation.payload
            const result = await createPOSSale({
                items: payload.items as PendingSale['items'],
                payment_method: payload.payment_method as PendingSale['payment_method'] as 'cash' | 'card_terminal' | 'twint' | 'manual_card',
                customer_id: payload.customer_id as string | undefined,
                discount_amount: payload.discount_amount as number,
                note: `offline_ref:${request.operation.idempotencyKey}`,
                sync: {
                    tenant_id: request.operation.tenantId,
                    operation_id: request.operation.operationId,
                    idempotency_key: request.operation.idempotencyKey,
                    client_id: request.operation.clientId,
                    client_sequence: request.operation.clientSequence,
                    known_server_sequence: request.knownServerSequence,
                },
            })
            if (!result.success) {
                const errorMessage = result.error || 'POS server rejected the sale'
                const isAuthFailure = /auth|unauthori[sz]ed|forbidden/i.test(errorMessage)
                throw new POSSyncTransportError(
                    isAuthFailure ? 'auth_lost' : 'unavailable',
                    'permanent',
                    'beforeAck',
                )
            }
            return authoritativeResponse(request, result)
        },
    }
}

async function syncQueuedSale(
    store: OfflineStore,
    sale: PendingSale,
    tenantId: string | undefined,
    transport: POSSyncTransport,
) {
    if (!tenantId) throw new Error('POS sync unavailable: tenant identity is missing')
    const result = await syncPendingSaleWithProtocol(sale, tenantId, transport)

    if (result.state === 'acknowledged') {
        await store.setPOSServerSequence(result.serverSequence)
        await store.removePendingSale(sale.id!)
        return
    }
    await store.updatePendingSale({
        ...sale,
        sync_attempts: sale.sync_attempts + 1,
        known_server_sequence: result.serverSequence,
        sync_state: result.state,
        last_error: result.outcome,
    })
}

async function drainPendingSales(
    store: OfflineStore,
    pendingSales: PendingSale[],
    tenantId: string | undefined,
    transport: POSSyncTransport,
) {
    for (const sale of pendingSales) {
        if (sale.sync_attempts >= MAX_SYNC_ATTEMPTS) continue
        try {
            await syncQueuedSale(store, sale, tenantId, transport)
        } catch (error) {
            await store.updatePendingSale({
                ...sale,
                sync_attempts: sale.sync_attempts + 1,
                sync_state: 'retryable_error',
                last_error: error instanceof Error ? error.message : 'Network error',
            })
        }
    }
}

// ── Hook ──

export function useOfflineSync(tenantId?: string): UseOfflineSyncReturn {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
    const [pendingCount, setPendingCount] = useState(0)
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
    const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([])
    const [availabilityError, setAvailabilityError] = useState<string | null>(null)

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
                if (!cancelled) setAvailabilityError(null)
            } catch (error) {
                if (!cancelled) {
                    setAvailabilityError(error instanceof Error
                        ? error.message
                        : 'POS offline storage is unavailable')
                }
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

            const transport = createPOSSyncTransport(createPOSSale)

            await drainPendingSales(store, pendingSales, tenantId, transport)

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
    }, [pendingCount, computeInventoryOffsets, tenantId])

    // ── Refresh product cache from server ──
    const refreshProducts = useCallback(async () => {
        if (!navigator.onLine) return

        try {
            const store = await import('./offline-store')
            const { syncProductCatalogAction } = await import('./product-sync')

            const lastSync = await store.getLastSyncTime()
            const result = await syncProductCatalogAction(lastSync ?? undefined)

            const allProducts = await applyProductCatalogSyncResult(store, result)
            setLastSyncTime(new Date(result.serverTime))
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
        async (sale: Omit<PendingSale,
            | 'id'
            | 'sync_attempts'
            | 'offline_ref'
            | 'tenant_id'
            | 'operation_id'
            | 'client_id'
            | 'client_sequence'
            | 'known_server_sequence'
            | 'sync_state'
        >) => {
            try {
                if (!tenantId) {
                    throw new Error('POS sync unavailable: tenant identity is missing')
                }
                const store = await import('./offline-store')
                const offlineRef = crypto.randomUUID()
                const [clientId, clientSequence, serverSequence] = await Promise.all([
                    store.getOrCreatePOSClientId(),
                    store.nextPOSClientSequence(),
                    store.getPOSServerSequence(),
                ])

                await store.queueSale({
                    ...sale,
                    offline_ref: offlineRef,
                    tenant_id: tenantId,
                    operation_id: offlineRef,
                    client_id: clientId,
                    client_sequence: clientSequence,
                    known_server_sequence: serverSequence,
                    sync_state: 'queued',
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
        [computeInventoryOffsets, tenantId]
    )

    return {
        isOnline,
        syncStatus,
        pendingCount,
        lastSyncTime,
        cachedProducts,
        offlineInventoryOffsets,
        availability: availabilityError ? 'unavailable' : 'available',
        availabilityError,
        syncNow,
        queueOfflineSale,
    }
}
