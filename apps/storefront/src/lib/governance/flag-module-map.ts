/**
 * flag-module-map.ts — Compact flag → module key mapping
 *
 * Extracted from feature-gate-config.ts for use by governance helpers.
 * Single source: the FLAG_MODULE_MAP in feature-gate-config.ts defines
 * flag → [moduleKey, i18nSuffix]. This file re-exports just flag → moduleKey.
 *
 * Auto-derived: if you add a new flag→module mapping, add it to
 * feature-gate-config.ts FLAG_MODULE_MAP — this file imports from there.
 *
 * @locked 🟡 SEMI-LOCKED — auto-derived from feature-gate-config.ts
 */

// We import the full FEATURE_GATE_MAP (which is auto-built from FLAG_MODULE_MAP)
// and extract just the flag→moduleKey relationship.
import { FEATURE_GATE_MAP } from '@/lib/feature-gate-config'

/**
 * Compact reverse map: flag_key → module_key
 * 
 * Example: { 'enable_chatbot': 'chatbot', 'enable_pos': 'pos', ... }
 */
export const FLAG_MODULE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(FEATURE_GATE_MAP).map(([flagKey, entry]) => [
    flagKey,
    entry.moduleKey,
  ])
)
