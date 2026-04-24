/**
 * POS Product Types — Lightweight types for Medusa product data
 *
 * These replace `any[]` in POS components where full Medusa SDK types
 * are too heavy or unavailable. Part of Phase 6 type safety polish.
 *
 * @module lib/pos/pos-product-types
 */

export interface POSVariant {
    id: string
    title: string | null
    sku: string | null
    barcode?: string | null
    inventory_quantity?: number | null
    prices?: Array<{
        amount: number
        currency_code: string
    }>
    calculated_price?: {
        calculated_amount: number
        currency_code: string
    }
}

export interface POSProduct {
    id: string
    title: string
    thumbnail: string | null
    variants: POSVariant[]
    collection?: { title: string } | null
    categories?: Array<{ id: string; name: string }> | null
    status?: string
}

export interface POSCategory {
    id: string
    name: string
}

/**
 * Shape of a cart item as persisted in localStorage.
 * Used for safe deserialization with validation.
 */
export interface POSSavedCartItem {
    id: string
    product_id?: string
    title?: string
    variant_title?: string | null
    thumbnail?: string | null
    sku?: string | null
    unit_price: number
    quantity: number
    currency_code?: string
}
