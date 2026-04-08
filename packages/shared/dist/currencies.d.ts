/**
 * Shared Currency Engine — SSOT for currency data across all apps
 *
 * This is THE canonical source for currency symbols, names, and metadata.
 * ALL consumers must derive from or validate against this data:
 *
 * - Storefront: imports directly via @bootandstrap/shared
 * - Medusa: validated via drift test (separate build pipeline)
 *
 * Zone: 🟢 SAFE — pure data, no side effects, no runtime dependencies
 */
export interface CurrencyInfo {
    /** ISO 4217 code, lowercase */
    code: string;
    /** Symbol for price display */
    symbol: string;
    /** Human-readable name */
    name: string;
    /** Emoji flag */
    flag: string;
    /** Geographic region label (for UI grouping) */
    region?: string;
    /** Intl.NumberFormat locale for proper formatting */
    intlLocale?: string;
}
export declare const CURRENCIES: CurrencyInfo[];
/** All valid currency codes */
export declare const CURRENCY_CODES: string[];
/** code → symbol lookup (fast path for Medusa message templates) */
export declare const CURRENCY_SYMBOL_MAP: Record<string, string>;
/** code → CurrencyInfo lookup */
export declare const CURRENCY_INFO_MAP: Record<string, CurrencyInfo>;
/** code → Intl locale */
export declare const CURRENCY_INTL_MAP: Record<string, string>;
//# sourceMappingURL=currencies.d.ts.map