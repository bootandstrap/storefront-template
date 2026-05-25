export const OWNER_EXPERIENCE_MODES = ['full_dashboard', 'starter_collaborative'] as const

export type OwnerExperienceMode = (typeof OWNER_EXPERIENCE_MODES)[number]

export const PANEL_ALLOWED_ROLES = ['owner', 'super_admin'] as const

export type PanelRole = (typeof PANEL_ALLOWED_ROLES)[number]

const OWNER_EXPERIENCE_MODE_SET = new Set<string>(OWNER_EXPERIENCE_MODES)

export function normalizeOwnerExperienceMode(value: unknown): OwnerExperienceMode {
    return typeof value === 'string' && OWNER_EXPERIENCE_MODE_SET.has(value)
        ? value as OwnerExperienceMode
        : 'full_dashboard'
}

export function isPanelRole(role: unknown): role is PanelRole {
    return typeof role === 'string' && (PANEL_ALLOWED_ROLES as readonly string[]).includes(role)
}
