export const OWNER_EXPERIENCE_MODES = ['full_dashboard', 'starter_collaborative'];
export const PANEL_ALLOWED_ROLES = ['owner', 'super_admin'];
const OWNER_EXPERIENCE_MODE_SET = new Set(OWNER_EXPERIENCE_MODES);
export function normalizeOwnerExperienceMode(value) {
    return typeof value === 'string' && OWNER_EXPERIENCE_MODE_SET.has(value)
        ? value
        : 'full_dashboard';
}
export function isPanelRole(role) {
    return typeof role === 'string' && PANEL_ALLOWED_ROLES.includes(role);
}
//# sourceMappingURL=tenant-mode.js.map