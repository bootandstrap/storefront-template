/**
 * Shared price utilities for consistent price display across template.
 * Used by ProductCard, product detail page, checkout, etc.
 */

import type { MedusaVariant } from './client'

export interface ResolvedPrice {
    amount: number
    currency: string
}

/**
 * Extract the best available price from a variant.
 * Prefers calculated_price (includes discounts) over raw prices.
 */
export function getPrice(variant: MedusaVariant | undefined | null): ResolvedPrice | null {
    if (!variant) return null

    // Prefer calculated_price (includes promotions/discounts)
    if (variant.calculated_price) {
        return {
            amount: variant.calculated_price.calculated_amount,
            currency: variant.calculated_price.currency_code,
        }
    }

    // Fallback to raw prices
    const price = variant.prices?.[0]
    if (price) {
        return {
            amount: price.amount,
            currency: price.currency_code,
        }
    }

    return null
}

/**
 * Extract the original (pre-discount) price from a variant.
 * Returns the original_amount from calculated_price, or falls back to raw prices.
 * Used alongside getPrice() to show strikethrough pricing.
 */
export function getOriginalPrice(variant: MedusaVariant | undefined | null): ResolvedPrice | null {
    if (!variant) return null

    if (variant.calculated_price?.original_amount != null) {
        return {
            amount: variant.calculated_price.original_amount,
            currency: variant.calculated_price.currency_code,
        }
    }

    // Fallback to raw prices (same as getPrice fallback — no discount info available)
    const price = variant.prices?.[0]
    if (price) {
        return {
            amount: price.amount,
            currency: price.currency_code,
        }
    }

    return null
}

/**
 * Format a price for display.
 * Delegates to the unified i18n/currencies engine which handles
 * zero-decimal currencies (COP, CLP, JPY) correctly.
 */
import { formatPrice } from '@/lib/i18n/currencies'
export { formatPrice }

/**
 * Convenience: get a formatted price string directly from a variant.
 * Returns null if no price is available.
 */
export function getFormattedPrice(
    variant: MedusaVariant | undefined | null,
    locale: string = 'en'
): string | null {
    const resolved = getPrice(variant)
    if (!resolved) return null
    return formatPrice(resolved.amount, resolved.currency)
}
