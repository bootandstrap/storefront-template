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
// ── Canonical Currency Registry ───────────────────────────────────────
export const CURRENCIES = [
    // ── Global ──
    { code: "eur", symbol: "€", name: "Euro", flag: "🇪🇺", region: "Europa", intlLocale: "de-DE" },
    { code: "usd", symbol: "$", name: "US Dollar", flag: "🇺🇸", region: "América", intlLocale: "en-US" },
    { code: "chf", symbol: "CHF", name: "Swiss Franc", flag: "🇨🇭", region: "Suiza", intlLocale: "de-CH" },
    { code: "gbp", symbol: "£", name: "British Pound", flag: "🇬🇧", region: "Reino Unido", intlLocale: "en-GB" },
    // ── Scandinavia ──
    { code: "sek", symbol: "kr", name: "Swedish Krona", flag: "🇸🇪", region: "Suecia", intlLocale: "sv-SE" },
    { code: "dkk", symbol: "kr", name: "Danish Krone", flag: "🇩🇰", region: "Dinamarca", intlLocale: "da-DK" },
    { code: "nok", symbol: "kr", name: "Norwegian Krone", flag: "🇳🇴", region: "Noruega", intlLocale: "nb-NO" },
    // ── Eastern Europe ──
    { code: "pln", symbol: "zł", name: "Polish Zloty", flag: "🇵🇱", region: "Polonia", intlLocale: "pl-PL" },
    { code: "czk", symbol: "Kč", name: "Czech Koruna", flag: "🇨🇿", region: "Chequia", intlLocale: "cs-CZ" },
    { code: "huf", symbol: "Ft", name: "Hungarian Forint", flag: "🇭🇺", region: "Hungría", intlLocale: "hu-HU" },
    { code: "ron", symbol: "lei", name: "Romanian Leu", flag: "🇷🇴", region: "Rumanía", intlLocale: "ro-RO" },
    // ── Latin America ──
    { code: "mxn", symbol: "MX$", name: "Peso Mexicano", flag: "🇲🇽", region: "México", intlLocale: "es-MX" },
    { code: "cop", symbol: "$", name: "Peso Colombiano", flag: "🇨🇴", region: "Colombia", intlLocale: "es-CO" },
    { code: "clp", symbol: "$", name: "Peso Chileno", flag: "🇨🇱", region: "Chile", intlLocale: "es-CL" },
    { code: "ars", symbol: "$", name: "Peso Argentino", flag: "🇦🇷", region: "Argentina", intlLocale: "es-AR" },
    { code: "pen", symbol: "S/", name: "Sol Peruano", flag: "🇵🇪", region: "Perú", intlLocale: "es-PE" },
    { code: "brl", symbol: "R$", name: "Real Brasileño", flag: "🇧🇷", region: "Brasil", intlLocale: "pt-BR" },
    { code: "uyu", symbol: "$U", name: "Peso Uruguayo", flag: "🇺🇾", region: "Uruguay", intlLocale: "es-UY" },
    { code: "crc", symbol: "₡", name: "Colón Costarricense", flag: "🇨🇷", region: "Costa Rica", intlLocale: "es-CR" },
    { code: "dop", symbol: "RD$", name: "Peso Dominicano", flag: "🇩🇴", region: "Rep. Dominicana", intlLocale: "es-DO" },
    { code: "gtq", symbol: "Q", name: "Quetzal", flag: "🇬🇹", region: "Guatemala", intlLocale: "es-GT" },
    { code: "bob", symbol: "Bs", name: "Boliviano", flag: "🇧🇴", region: "Bolivia", intlLocale: "es-BO" },
];
// ── Derived constants ─────────────────────────────────────────────────
/** All valid currency codes */
export const CURRENCY_CODES = CURRENCIES.map(c => c.code);
/** code → symbol lookup (fast path for Medusa message templates) */
export const CURRENCY_SYMBOL_MAP = Object.fromEntries(CURRENCIES.map(c => [c.code, c.symbol]));
/** code → CurrencyInfo lookup */
export const CURRENCY_INFO_MAP = Object.fromEntries(CURRENCIES.map(c => [c.code, c]));
/** code → Intl locale */
export const CURRENCY_INTL_MAP = Object.fromEntries(CURRENCIES.filter(c => c.intlLocale).map(c => [c.code, c.intlLocale]));
//# sourceMappingURL=currencies.js.map