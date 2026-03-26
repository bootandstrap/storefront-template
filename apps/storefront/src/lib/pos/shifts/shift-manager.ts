/**
 * POS Shift Manager — IndexedDB-backed shift tracking
 *
 * Manages open/close cashier shifts with cash counting.
 * Works offline — shifts stored in IndexedDB.
 * Gated by `enable_pos_history` (Pro tier).
 */

import type { POSShift } from '../pos-config'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'pos_offline'
const STORE_NAME = 'shifts'

// ---------------------------------------------------------------------------
// DB helpers (reuses existing IDB connection pattern from offline-store)
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        // Use version 2 to add shifts store
        const req = indexedDB.open(DB_NAME, 2)

        req.onupgradeneeded = () => {
            const db = req.result
            // Create shifts store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
                store.createIndex('status', 'status', { unique: false })
                store.createIndex('opened_at', 'opened_at', { unique: false })
            }
            // Ensure other stores exist too (v1 → v2 migration)
            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('pending_sales')) {
                const salesStore = db.createObjectStore('pending_sales', {
                    keyPath: 'offline_ref',
                })
                salesStore.createIndex('created_at', 'created_at', { unique: false })
            }
            if (!db.objectStoreNames.contains('sync_meta')) {
                db.createObjectStore('sync_meta', { keyPath: 'key' })
            }
        }

        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

function txn<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    return openDB().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, mode)
                const store = tx.objectStore(STORE_NAME)
                const req = fn(store)
                req.onsuccess = () => resolve(req.result)
                req.onerror = () => reject(req.error)
            })
    )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open a new shift with initial cash count.
 */
export async function openShift(openingCash: number): Promise<POSShift> {
    // Close any existing open shift first
    const current = await getCurrentShift()
    if (current) {
        await closeShift(current.id, openingCash, 0, 0)
    }

    const shift: POSShift = {
        id: crypto.randomUUID(),
        opened_at: new Date().toISOString(),
        opening_cash: openingCash,
        total_sales: 0,
        total_revenue: 0,
        status: 'open',
    }

    await txn('readwrite', (store) => store.put(shift))
    return shift
}

/**
 * Close the current shift with final cash count.
 */
export async function closeShift(
    shiftId: string,
    closingCash: number,
    totalSales: number,
    totalRevenue: number
): Promise<POSShift | null> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const getReq = store.get(shiftId)

        getReq.onsuccess = () => {
            const shift = getReq.result as POSShift | undefined
            if (!shift) {
                resolve(null)
                return
            }

            // Calculate expected cash = opening + cash sales revenue
            const expectedCash = shift.opening_cash + totalRevenue

            const updated: POSShift = {
                ...shift,
                closed_at: new Date().toISOString(),
                closing_cash: closingCash,
                expected_cash: expectedCash,
                cash_difference: closingCash - expectedCash,
                total_sales: totalSales,
                total_revenue: totalRevenue,
                status: 'closed',
            }

            const putReq = store.put(updated)
            putReq.onsuccess = () => resolve(updated)
            putReq.onerror = () => reject(putReq.error)
        }

        getReq.onerror = () => reject(getReq.error)
    })
}

/**
 * Get the currently open shift (if any).
 */
export async function getCurrentShift(): Promise<POSShift | null> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const idx = store.index('status')
        const req = idx.getAll('open')

        req.onsuccess = () => {
            const shifts = req.result as POSShift[]
            resolve(shifts.length > 0 ? shifts[0] : null)
        }
        req.onerror = () => reject(req.error)
    })
}

/**
 * Increment sale count on the current shift.
 * Called after each successful sale.
 */
export async function recordShiftSale(saleTotal: number): Promise<void> {
    const current = await getCurrentShift()
    if (!current) return

    const updated: POSShift = {
        ...current,
        total_sales: current.total_sales + 1,
        total_revenue: current.total_revenue + saleTotal,
    }

    await txn('readwrite', (store) => store.put(updated))
}

/**
 * Get shift history (most recent first).
 */
export async function getShiftHistory(limit = 10): Promise<POSShift[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const idx = store.index('opened_at')
        const req = idx.getAll()

        req.onsuccess = () => {
            const shifts = (req.result as POSShift[])
                .sort((a, b) => b.opened_at.localeCompare(a.opened_at))
                .slice(0, limit)
            resolve(shifts)
        }
        req.onerror = () => reject(req.error)
    })
}
