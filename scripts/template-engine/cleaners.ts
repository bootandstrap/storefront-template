/**
 * Template Engine — Deep Cleaners
 *
 * Cleans ALL Medusa data in FK-safe order.
 * Handles Medusa v2 specificities:
 * - completed draft orders can't be deleted (ignored)
 * - orders need to be cancelled first
 * - products with order references may fail delete (ignored)
 *
 * Each cleaner is idempotent — safe to run on empty DB.
 */

import { MedusaClient } from './medusa-client'
import type { LogFn } from './types'

export async function cleanDraftOrders(client: MedusaClient, log: LogFn): Promise<number> {
    const drafts = await client.getDraftOrders(500)
    if (!drafts.length) {
        log('✅', 'No draft orders to clean')
        return 0
    }

    // In Medusa v2, completed draft orders CANNOT be deleted via API.
    // They are effectively "frozen" after conversion to real orders.
    // We only attempt to delete draft orders still in "draft" status.
    const deletable = drafts.filter(d => d.status === 'draft' || d.status === 'open' || d.status === 'requires_action')
    const nonDeletable = drafts.length - deletable.length

    if (!deletable.length) {
        log('⏭️', `Draft orders: ${nonDeletable} completed (cannot delete, ignoring)`)
        return 0
    }

    const { deleted, failed } = await client.bulkDelete('draft-orders', deletable.map(d => d.id), { retries: 0 })
    log('🧹', `Draft orders: ${deleted} deleted, ${failed} failed, ${nonDeletable} completed (ignored)`)
    return deleted
}

export async function cleanOrders(client: MedusaClient, log: LogFn): Promise<number> {
    const orders = await client.getOrders(500)
    if (!orders.length) {
        log('✅', 'No orders to clean')
        return 0
    }

    // Cancel all non-cancelled orders first
    let cancelled = 0
    for (const order of orders) {
        if (order.status !== 'canceled' && order.status !== 'cancelled') {
            try {
                await client.request(`/admin/orders/${order.id}/cancel`, { method: 'POST', retries: 0 })
                cancelled++
            } catch {
                // May already be cancelled or in un-cancellable state
            }
        }
    }

    log('🧹', `Orders: ${cancelled} cancelled (of ${orders.length} total)`)
    return cancelled
}

export async function cleanCarts(client: MedusaClient, log: LogFn): Promise<number> {
    try {
        const carts = await client.getCarts(500)
        if (!carts.length) {
            log('✅', 'No carts to clean')
            return 0
        }

        const { deleted } = await client.bulkDelete('carts', carts.map(c => c.id), { retries: 0 })
        log('🧹', `Carts: ${deleted} deleted`)
        return deleted
    } catch {
        log('⏭️', 'Carts cleanup skipped (endpoint not available)')
        return 0
    }
}

export async function cleanCustomers(client: MedusaClient, log: LogFn): Promise<number> {
    const customers = await client.getCustomers(500)
    if (!customers.length) {
        log('✅', 'No customers to clean')
        return 0
    }

    // Only delete demo customers (by email pattern)
    const demoCustomers = customers.filter(c =>
        c.email.includes('@bootandstrap.demo') ||
        c.email.includes('@demo.local') ||
        c.email.includes('demo-customer')
    )

    if (!demoCustomers.length) {
        log('✅', `No demo customers to clean (${customers.length} real customers preserved)`)
        return 0
    }

    const { deleted, failed } = await client.bulkDelete('customers', demoCustomers.map(c => c.id), { retries: 0 })
    log('🧹', `Customers: ${deleted} demo deleted, ${failed} failed (${customers.length - demoCustomers.length} real preserved)`)
    return deleted
}

export async function cleanProducts(client: MedusaClient, log: LogFn): Promise<number> {
    const products = await client.getProducts(500)
    if (!products.length) {
        log('✅', 'No products to clean')
        return 0
    }

    // Products referenced by orders may fail to delete — that's OK
    const { deleted, failed } = await client.bulkDelete('products', products.map(p => p.id), { retries: 0 })
    if (failed > 0) {
        log('🧹', `Products: ${deleted} deleted, ${failed} skipped (referenced by orders)`)
    } else {
        log('🧹', `Products: ${deleted} deleted`)
    }
    return deleted
}

export async function cleanCategories(client: MedusaClient, log: LogFn): Promise<number> {
    const categories = await client.getCategories(200)
    if (!categories.length) {
        log('✅', 'No categories to clean')
        return 0
    }

    const { deleted, failed } = await client.bulkDelete('product-categories', categories.map(c => c.id), { retries: 0 })
    if (failed > 0) {
        log('🧹', `Categories: ${deleted} deleted, ${failed} failed`)
    } else {
        log('🧹', `Categories: ${deleted} deleted`)
    }
    return deleted
}

export async function cleanShippingOptions(client: MedusaClient, log: LogFn): Promise<number> {
    const options = await client.getShippingOptions()
    if (!options.length) {
        log('✅', 'No shipping options to clean')
        return 0
    }

    const { deleted, failed } = await client.bulkDelete('shipping-options', options.map(o => o.id), { retries: 0 })
    log('🧹', `Shipping options: ${deleted} deleted, ${failed} failed`)
    return deleted
}

// ── Full Deep Clean ──────────────────────────────────────────

export async function deepClean(
    client: MedusaClient,
    log: LogFn,
    options: { hardReset?: boolean } = {}
): Promise<void> {
    log('🧹', '═══ DEEP CLEAN START ═══')

    // FK-safe order: dependents first
    await cleanDraftOrders(client, log)
    await cleanOrders(client, log)
    await cleanCarts(client, log)
    await cleanCustomers(client, log)
    await cleanProducts(client, log)
    await cleanCategories(client, log)

    if (options.hardReset) {
        log('⚠️', 'Hard reset: cleaning shipping options...')
        await cleanShippingOptions(client, log)
    }

    log('🧹', '═══ DEEP CLEAN COMPLETE ═══')
}
