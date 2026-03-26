/**
 * POS Offline Store — IndexedDB Wrapper
 *
 * Zero-dependency IndexedDB interface for:
 * - Product catalog cache (offline product search)
 * - Pending sales queue (offline sales, synced on reconnect)
 * - Sync metadata (last sync timestamp)
 *
 * DB: pos_offline, version 1
 */

// ── Types ──

export interface CachedProduct {
    id: string
    title: string
    thumbnail: string | null
    status: string
    variants: CachedVariant[]
    categories: { id: string; name: string }[]
    updated_at: string
}

export interface CachedVariant {
    id: string
    title: string | null
    sku: string | null
    prices: { amount: number; currency_code: string }[]
}

export interface PendingSale {
    id?: number                     // IDB auto-increment
    offline_ref: string             // UUID — idempotency key
    items: { variant_id: string; quantity: number; unit_price: number }[]
    payment_method: string
    customer_id?: string
    customer_name?: string
    discount_amount: number
    created_at: string              // ISO timestamp
    sync_attempts: number
    last_error?: string
}

// ── Constants ──

const DB_NAME = 'pos_offline'
const DB_VERSION = 1
const STORE_PRODUCTS = 'products'
const STORE_SALES = 'pending_sales'
const STORE_META = 'sync_meta'

// ── DB Connection ──

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise

    dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not available'))
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result

            // Products store (keyed by product ID)
            if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
                const productStore = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' })
                productStore.createIndex('by_sku', 'variants_skus', { multiEntry: true })
                productStore.createIndex('by_updated', 'updated_at')
            }

            // Pending sales (auto-increment key)
            if (!db.objectStoreNames.contains(STORE_SALES)) {
                const salesStore = db.createObjectStore(STORE_SALES, {
                    keyPath: 'id',
                    autoIncrement: true,
                })
                salesStore.createIndex('by_ref', 'offline_ref', { unique: true })
                salesStore.createIndex('by_created', 'created_at')
            }

            // Sync metadata (key-value)
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'key' })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => {
            dbPromise = null
            reject(request.error)
        }
    })

    return dbPromise
}

// ── Helpers ──

function tx(
    storeName: string,
    mode: IDBTransactionMode = 'readonly',
): Promise<{ store: IDBObjectStore; tx: IDBTransaction; db: IDBDatabase }> {
    return openDB().then(db => {
        const transaction = db.transaction(storeName, mode)
        return { store: transaction.objectStore(storeName), tx: transaction, db }
    })
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

function txComplete(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(new Error('Transaction aborted'))
    })
}

// ── Product Cache ──

/**
 * Cache an array of products into IndexedDB.
 * Overwrites existing entries with the same ID.
 */
export async function cacheProducts(products: CachedProduct[]): Promise<void> {
    const { store, tx: transaction } = await tx(STORE_PRODUCTS, 'readwrite')

    for (const product of products) {
        // Flatten SKUs for the multiEntry index
        const skus = product.variants
            .map(v => v.sku)
            .filter((s): s is string => !!s)

        store.put({
            ...product,
            variants_skus: skus,
        })
    }

    await txComplete(transaction)
}

/** Get all cached products */
export async function getProducts(): Promise<CachedProduct[]> {
    const { store } = await tx(STORE_PRODUCTS)
    const results = await promisify(store.getAll())
    // Strip the internal variants_skus field
    return results.map(({ variants_skus: _, ...rest }) => rest as CachedProduct)
}

/** Find a product by one of its variant SKUs */
export async function getProductBySku(sku: string): Promise<CachedProduct | null> {
    const { store } = await tx(STORE_PRODUCTS)
    const index = store.index('by_sku')
    const result = await promisify(index.get(sku))
    if (!result) return null
    const { variants_skus: _, ...product } = result
    return product as CachedProduct
}

/** Clear the entire product cache */
export async function clearProductCache(): Promise<void> {
    const { store, tx: transaction } = await tx(STORE_PRODUCTS, 'readwrite')
    store.clear()
    await txComplete(transaction)
}

// ── Pending Sales Queue ──

/** Queue a sale for later sync. Returns the auto-generated ID. */
export async function queueSale(sale: Omit<PendingSale, 'id'>): Promise<number> {
    const { store } = await tx(STORE_SALES, 'readwrite')
    const id = await promisify(store.add(sale))
    return id as number
}

/** Get all pending (unsynced) sales, ordered by creation time */
export async function getPendingSales(): Promise<PendingSale[]> {
    const { store } = await tx(STORE_SALES)
    const index = store.index('by_created')
    return promisify(index.getAll())
}

/** Remove a sale from the queue after successful sync */
export async function removePendingSale(id: number): Promise<void> {
    const { store, tx: transaction } = await tx(STORE_SALES, 'readwrite')
    store.delete(id)
    await txComplete(transaction)
}

/** Update a pending sale (e.g., increment sync_attempts, set last_error) */
export async function updatePendingSale(sale: PendingSale): Promise<void> {
    const { store, tx: transaction } = await tx(STORE_SALES, 'readwrite')
    store.put(sale)
    await txComplete(transaction)
}

/** Count pending sales */
export async function getPendingSaleCount(): Promise<number> {
    const { store } = await tx(STORE_SALES)
    return promisify(store.count())
}

/** Check if a sale with this offline_ref already exists */
export async function hasPendingSaleRef(ref: string): Promise<boolean> {
    const { store } = await tx(STORE_SALES)
    const index = store.index('by_ref')
    const result = await promisify(index.getKey(ref))
    return result !== undefined
}

// ── Sync Metadata ──

export async function getLastSyncTime(): Promise<number | null> {
    const { store } = await tx(STORE_META)
    const result = await promisify(store.get('last_sync'))
    return result?.value ?? null
}

export async function setLastSyncTime(ts: number): Promise<void> {
    const { store, tx: transaction } = await tx(STORE_META, 'readwrite')
    store.put({ key: 'last_sync', value: ts })
    await txComplete(transaction)
}

// ── Cleanup ──

/** Delete the entire database (for testing/reset) */
export async function destroyDB(): Promise<void> {
    dbPromise = null
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}
