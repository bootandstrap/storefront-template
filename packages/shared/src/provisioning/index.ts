/**
 * @module provisioning
 * @description Barrel export for the UnifiedProvisioner system.
 *
 * Usage:
 *   import { UnifiedProvisioner, type ProvisionerMode } from '@bootandstrap/shared/provisioning'
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */

export { UnifiedProvisioner } from './unified-provisioner'

export type {
    ProvisionerMode,
    ProvisionTenantInput,
    ProvisionResult,
    ProvisionStepResult,
    ProvisionStep,
    ProvisionerDependencies,
    SupabaseProvisionClient,
    GovernanceContractSource,
    StoreConfigTemplate,
} from './types'

export { ENTERPRISE_MAX_LIMITS } from './types'
