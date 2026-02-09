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
 * Format a price for display.
 * Converts from cents to display format using Intl.NumberFormat.
 */
export function formatPrice(
    amount: number,
    currency: string,
    locale: string = 'es-ES'
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount / 100)
}

/**
 * Convenience: get a formatted price string directly from a variant.
 * Returns null if no price is available.
 */
export function getFormattedPrice(
    variant: MedusaVariant | undefined | null,
    locale: string = 'es-ES'
): string | null {
    const resolved = getPrice(variant)
    if (!resolved) return null
    return formatPrice(resolved.amount, resolved.currency, locale)
}
