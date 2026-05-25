import { type OwnerExperienceMode } from '@bootandstrap/platform-contract';
export interface ResolveTenantContextInput {
    profileRole?: string | null;
    metadataRole?: string | null;
    profileTenantId?: string | null;
    envTenantId?: string | null;
    ownerExperienceMode?: unknown;
}
export interface TenantContext {
    role: string | null;
    isPanelRole: boolean;
    tenantId: string | null;
    ownerExperienceMode: OwnerExperienceMode;
    defaultPostLoginPath: '/panel' | '/cuenta';
}
export declare function resolveTenantContext(input: ResolveTenantContextInput): TenantContext;
//# sourceMappingURL=resolve-tenant-context.d.ts.map