/**
 * POS Utilities — Payment method filtering and helpers
 *
 * Core function: getEnabledPOSPaymentMethods(limits)
 * Mirrors the checkout payment-methods.ts pattern using max_pos_payment_methods.
 */

import type { PlanLimits } from '@/lib/config'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Get enabled POS payment methods based on plan limits
// ---------------------------------------------------------------------------

/**
 * Returns the POS payment methods available for this tenant.
 *
 * Logic:
 * 1. Start with the full PAYMENT_METHODS registry (ordered by priority)
 * 2. Apply `max_pos_payment_methods` plan limit:
 *    - 0 or undefined → unlimited (all methods)
 *    - N → first N methods by priority
 *
 * Cash is always priority 1, so Basic tier (limit=1) always gets cash.
 * Pro (limit=3) gets cash + card_terminal + manual_card.
 * Enterprise (limit=0 = unlimited) gets all 4.
 */
export function getEnabledPOSPaymentMethods(
    limits?: PlanLimits | null,
): PaymentMethod[] {
    const max = limits?.max_pos_payment_methods ?? 0

    // Sort by implicit priority (array order = priority order in PAYMENT_METHODS)
    const allMethods = PAYMENT_METHODS.map(m => m.key)

    if (max > 0 && allMethods.length > max) {
        return allMethods.slice(0, max)
    }

    return allMethods
}

// ---------------------------------------------------------------------------
// Currency formatting — delegates to unified formatPrice from currencies.ts
// ---------------------------------------------------------------------------

import { formatPrice } from '@/lib/i18n/currencies'

/**
 * Format a minor-unit amount (cents) as a currency string for POS display.
 *
 * This is a thin wrapper around the unified `formatPrice()` from the i18n
 * currency module. The currency code MUST come from tenant governance config
 * (config.default_currency). No hardcoded fallback.
 *
 * @param amount - Price in minor units (cents)
 * @param currencyCode - Currency code from tenant config (REQUIRED)
 */
export function formatPOSCurrency(
    amount: number,
    currencyCode: string,
): string {
    if (!currencyCode) {
        throw new Error('[POS] formatPOSCurrency: currencyCode is required — must come from tenant config.default_currency')
    }
    return formatPrice(amount, currencyCode)
}

// ---------------------------------------------------------------------------
// Tier derivation helpers
// ---------------------------------------------------------------------------

/**
 * Derive whether the History panel should be available.
 * History is a Pro feature — available when shifts are enabled.
 */
export function isPOSHistoryAvailable(featureFlags: Record<string, boolean>): boolean {
    return featureFlags.enable_pos_shifts === true
}

/**
 * Derive whether the Dashboard panel should be available.
 * Dashboard is an Enterprise feature — available when reports are enabled.
 */
export function isPOSDashboardAvailable(featureFlags: Record<string, boolean>): boolean {
    return featureFlags.enable_pos_reports === true
}
