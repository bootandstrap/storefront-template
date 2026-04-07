/**
 * Flag Display Names — Auto-derived from governance contract
 *
 * Instead of hardcoding 29+ flag labels, we derive them from the contract
 * and apply human-readable transforms. Custom overrides can be added
 * for flags that need specific labels.
 *
 * Zone: 🟢 SAFE — pure data, no side effects
 */

import contract from '@/lib/governance-contract.json'

// ── Custom label overrides (for flags needing specific wording) ───────
const LABEL_OVERRIDES: Record<string, string> = {
    enable_ecommerce: 'E-Commerce',
    enable_i18n: 'Multi-idioma',
    enable_crm: 'CRM',
    enable_admin_api: 'API de administración',
    enable_2fa: 'Autenticación 2FA',
    enable_apple_oauth: 'Login con Apple',
    enable_facebook_oauth: 'Login con Facebook',
    enable_google_oauth: 'Login con Google',
    enable_magic_link: 'Magic Link',
    enable_seo: 'SEO',
}

// ── Humanize function ─────────────────────────────────────────────────
function humanizeFlag(key: string): string {
    return key
        .replace(/^enable_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
}

// ── Build registry from contract ──────────────────────────────────────
const FLAG_LABELS: Record<string, string> = {}

// 1. Scan all flags from contract keys
if (contract.flags?.keys) {
    for (const flag of contract.flags.keys) {
        FLAG_LABELS[flag] = LABEL_OVERRIDES[flag] ?? humanizeFlag(flag)
    }
}

// 2. Also scan module tier flag_effects (catches phantom flags)
if (contract.modules?.catalog) {
    for (const mod of contract.modules.catalog) {
        for (const tier of mod.tiers ?? []) {
            for (const flag of Object.keys(tier.flag_effects ?? {})) {
                if (!(flag in FLAG_LABELS)) {
                    FLAG_LABELS[flag] = LABEL_OVERRIDES[flag] ?? humanizeFlag(flag)
                }
            }
        }
    }
}

export { FLAG_LABELS }

/**
 * Get a human-readable label for a feature flag.
 * Falls back to humanized key if not in registry.
 */
export function getFlagLabel(flagKey: string): string {
    return FLAG_LABELS[flagKey] ?? humanizeFlag(flagKey)
}
