export declare const OWNER_EXPERIENCE_MODES: readonly ["full_dashboard", "starter_collaborative"];
export type OwnerExperienceMode = (typeof OWNER_EXPERIENCE_MODES)[number];
export declare const PANEL_ALLOWED_ROLES: readonly ["owner", "super_admin"];
export type PanelRole = (typeof PANEL_ALLOWED_ROLES)[number];
export declare function normalizeOwnerExperienceMode(value: unknown): OwnerExperienceMode;
export declare function isPanelRole(role: unknown): role is PanelRole;
//# sourceMappingURL=tenant-mode.d.ts.map