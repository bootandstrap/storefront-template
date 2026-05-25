import { isPanelRole, normalizeOwnerExperienceMode, } from '@bootandstrap/platform-contract';
export function resolveTenantContext(input) {
    const role = input.profileRole ?? input.metadataRole ?? null;
    const panelRole = isPanelRole(role);
    const tenantId = input.profileTenantId ?? (role === 'super_admin' ? input.envTenantId ?? null : null);
    return {
        role,
        isPanelRole: panelRole,
        tenantId,
        ownerExperienceMode: normalizeOwnerExperienceMode(input.ownerExperienceMode),
        defaultPostLoginPath: panelRole && tenantId ? '/panel' : '/cuenta',
    };
}
//# sourceMappingURL=resolve-tenant-context.js.map