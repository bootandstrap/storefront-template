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

/** Roles permitted to access the Owner Panel */
export const PANEL_ALLOWED_ROLES = ['owner', 'super_admin'] as const

export type PanelRole = (typeof PANEL_ALLOWED_ROLES)[number]

/**
 * Check if a role string is a valid panel role.
 */
export function isPanelRole(role: string | null | undefined): role is PanelRole {
    return !!role && (PANEL_ALLOWED_ROLES as readonly string[]).includes(role)
}
