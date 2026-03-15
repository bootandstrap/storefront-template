/**
 * @module config
 * @description Storefront governance configuration — powered by @bootandstrap/shared.
 *
 * This module fetches tenant configuration from Supabase (via RPC or direct queries)
 * with circuit breaker protection, TTL caching, and fail-closed fallback.
 *
 * All types, defaults, circuit breaker, cache, and tenant resolution are imported
 * from `@bootandstrap/shared` — the single source of truth.
 */

import { revalidatePath } from 'next/cache'
import { createGovernanceClient, getGovernanceMode } from '@/lib/supabase/governance'
import {
    // Types
    type StoreConfig,
    type FeatureFlags,
    type PlanLimits,
    type AppConfig,
    type GovernanceRpcResult,
    // Defaults
    FALLBACK_CONFIG,
    // Circuit breaker
    shouldCircuitSkipFetch,
    circuitRecordSuccess,
    circuitRecordFailure,
    resetCircuitBreaker,
    // Cache
    getCachedConfig,
    setCachedConfig,
    clearCachedConfig,
    // Tenant
    getRequiredTenantId,
    isBuildPhase,
    // Reporting
    reportDegradedMode,
} from '@/lib/governance'

// Re-export types for consumers
export type { StoreConfig, FeatureFlags, PlanLimits, AppConfig, GovernanceRpcResult }

// Re-export utilities for direct use
export { clearCachedConfig, resetCircuitBreaker, getRequiredTenantId, FALLBACK_CONFIG }

// ---------------------------------------------------------------------------
// Shared governance data fetcher (eliminates getConfig/getConfigForTenant duplication)
// ---------------------------------------------------------------------------

async function _fetchGovernanceData(tenantId: string): Promise<{
    configData: StoreConfig | null
    flagsData: Record<string, boolean> | null
    limitsData: PlanLimits | null
    tenantStatusRaw: string | null
}> {
    const supabase = createGovernanceClient()
    const mode = getGovernanceMode()

    let configData: StoreConfig | null = null
    let flagsData: Record<string, boolean> | null = null
    let limitsData: PlanLimits | null = null
    let tenantStatusRaw: string | null = null

    if (mode === 'rpc') {
        // Single RPC call via anon key (no service_role needed)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('get_tenant_governance', {
            p_tenant_id: tenantId,
        }) as { data: GovernanceRpcResult | null; error: { message: string } | null }

        if (error) {
            console.warn('[config] get_tenant_governance RPC error:', error.message)
        } else if (data) {
            configData = data.config ?? null
            flagsData = data.feature_flags ?? null
            limitsData = data.plan_limits ?? null
            tenantStatusRaw = data.tenant_status ?? null
        }
    } else {
        // Legacy: direct table queries via service_role key
        const [configRes, flagsRes, limitsRes] = await Promise.all([
            supabase.from('config').select('*').eq('tenant_id', tenantId).single(),
            supabase.from('feature_flags').select('*').eq('tenant_id', tenantId).single(),
            supabase.from('plan_limits').select('*').eq('tenant_id', tenantId).single(),
        ])

        const { data: tenantData } = await supabase
            .from('tenants')
            .select('status')
            .eq('id', tenantId)
            .single() as { data: { status: string } | null }

        if (configRes.error) console.warn('[config] config query error:', configRes.error.message)
        if (flagsRes.error) console.warn('[config] feature_flags query error:', flagsRes.error.message)
        if (limitsRes.error) console.warn('[config] plan_limits query error:', limitsRes.error.message)

        configData = configRes.data ?? null
        flagsData = flagsRes.data ?? null
        limitsData = limitsRes.data ?? null
        tenantStatusRaw = tenantData?.status ?? null
    }

    return { configData, flagsData, limitsData, tenantStatusRaw }
}

// ---------------------------------------------------------------------------
// Build AppConfig from raw governance data
// ---------------------------------------------------------------------------

function _buildAppConfig(
    configData: StoreConfig | null,
    flagsData: Record<string, boolean> | null,
    limitsData: PlanLimits | null,
    tenantStatusRaw: string | null,
    options?: { skipMaintenanceCalc?: boolean },
): AppConfig {
    const limits = (limitsData as PlanLimits) ?? FALLBACK_CONFIG.planLimits
    const planExpired = limits.plan_expires_at
        ? new Date(limits.plan_expires_at) < new Date()
        : false

    const tenantStatus = (tenantStatusRaw as AppConfig['tenantStatus']) ?? 'active'

    // Compute free maintenance days remaining
    let maintenanceDaysRemaining: number | undefined
    if (!options?.skipMaintenanceCalc && tenantStatus === 'maintenance_free' && limits.plan_expires_at) {
        const msLeft = new Date(limits.plan_expires_at).getTime() - Date.now()
        maintenanceDaysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
    }

    // Auto-enforce: if plan expired AND status is maintenance_free → treat as paused
    const effectiveStatus = (planExpired && tenantStatus === 'maintenance_free') ? 'paused' : tenantStatus

    return {
        config: (configData as StoreConfig) ?? FALLBACK_CONFIG.config,
        featureFlags: {
            ...FALLBACK_CONFIG.featureFlags,
            ...(flagsData ?? {}),
        },
        planLimits: limits,
        planExpired,
        tenantStatus: effectiveStatus,
        _degraded: false,
        maintenanceDaysRemaining,
    }
}

// ---------------------------------------------------------------------------
// getConfig() — env-scoped (reads TENANT_ID from env)
// ---------------------------------------------------------------------------

export async function getConfig(): Promise<AppConfig> {
    const cached = getCachedConfig()
    if (cached) return cached

    const tenantId = getRequiredTenantId()

    if (isBuildPhase()) {
        console.info('[config] Build-phase prerender detected — using fallback config')
        return FALLBACK_CONFIG
    }

    if (shouldCircuitSkipFetch()) {
        return FALLBACK_CONFIG
    }

    try {
        const data = await _fetchGovernanceData(tenantId)
        const result = _buildAppConfig(data.configData, data.flagsData, data.limitsData, data.tenantStatusRaw)
        setCachedConfig(result)
        circuitRecordSuccess()
        return result
    } catch (err) {
        circuitRecordFailure()
        const errorMessage = err instanceof Error ? err.message : String(err)
        reportDegradedMode(tenantId, `Config fetch failed — degraded mode activated: ${errorMessage}`)
        return FALLBACK_CONFIG
    }
}

// ---------------------------------------------------------------------------
// getConfigForTenant() — auth-scoped (explicit tenant ID from requirePanelAuth)
// ---------------------------------------------------------------------------

export async function getConfigForTenant(tenantId: string): Promise<AppConfig> {
    if (!tenantId) {
        throw new Error('[config] getConfigForTenant requires a valid tenantId')
    }

    if (shouldCircuitSkipFetch()) {
        return FALLBACK_CONFIG
    }

    try {
        const data = await _fetchGovernanceData(tenantId)
        const result = _buildAppConfig(
            data.configData, data.flagsData, data.limitsData, data.tenantStatusRaw,
            { skipMaintenanceCalc: true },
        )
        circuitRecordSuccess()
        return result
    } catch (err) {
        circuitRecordFailure()
        const errorMessage = err instanceof Error ? err.message : String(err)
        reportDegradedMode(tenantId, `getConfigForTenant failed: ${errorMessage}`)
        return FALLBACK_CONFIG
    }
}

// ---------------------------------------------------------------------------
// On-demand revalidation (Server Action)
// ---------------------------------------------------------------------------

export async function revalidateConfig() {
    'use server'
    clearCachedConfig()
    revalidatePath('/', 'layout')
}
