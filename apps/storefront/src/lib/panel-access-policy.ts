/**
 * Panel Access Policy — Single source of truth for Owner Panel authorization
 *
 * This constant defines which roles can access the Owner Panel.
 * Used by:
 * - proxy.ts (route-level protection)
 * - (panel)/layout.tsx (server component guard)
 * - panel-auth.ts (server action guard)
 *
 * Centralizing this prevents role mismatches across authorization layers.
 */

export {
    PANEL_ALLOWED_ROLES,
    isPanelRole,
    type PanelRole,
} from '@bootandstrap/platform-contract'
