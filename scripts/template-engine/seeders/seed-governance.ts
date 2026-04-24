/**
 * Seeder: Governance (UnifiedProvisioner-backed)
 *
 * Thin adapter that delegates to UnifiedProvisioner from @bootandstrap/shared.
 * This ensures local dev, demo web, and real tenants all go through the
 * SAME provisioning pipeline with the SAME code paths.
 *
 * What this adapter does:
 *   1. Loads the governance contract JSON (SSOT)
 *   2. Determines mode (local/demo) from env vars
 *   3. Maps IndustryTemplate → ProvisionTenantInput
 *   4. Delegates to UnifiedProvisioner
 *
 * This replaces the 290-line hardcoded seeder with ~100 lines of delegation.
 *
 * @module template-engine/seeders/seed-governance
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { IndustryTemplate, LogFn } from '../types'

// Shared package imports
import { UnifiedProvisioner } from '../../../packages/shared/src/provisioning/unified-provisioner'
import { MockBillingGateway } from '../../../packages/shared/src/billing/providers/mock'
import type {
    ProvisionerMode,
    GovernanceContractSource,
    ProvisionerDependencies,
    SupabaseProvisionClient,
} from '../../../packages/shared/src/provisioning/types'

interface GovernanceResult {
    tenantId: string
    success: boolean
}

// ── Load governance contract (SSOT) ────────────────────────────────────────

function loadContract(): GovernanceContractSource {
    const candidates = [
        resolve(__dirname, '../../../apps/storefront/src/lib/governance-contract.json'),
        resolve(__dirname, '../../../generated/contract.json'),
        resolve(__dirname, '../../../packages/shared/src/governance-contract.json'),
        resolve(__dirname, '../../../../governance-contract.json'), // workspace root
    ]

    for (const path of candidates) {
        try {
            const raw = readFileSync(path, 'utf-8')
            return JSON.parse(raw) as GovernanceContractSource
        } catch {
            // Try next
        }
    }

    throw new Error(
        `governance-contract.json not found. Searched:\n${candidates.map(c => `  - ${c}`).join('\n')}`
    )
}

// ── Supabase client ────────────────────────────────────────────────────────

function getSupabaseAdmin(): SupabaseProvisionClient {
    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error(
            'Missing Supabase credentials. Set GOVERNANCE_SUPABASE_URL + GOVERNANCE_SUPABASE_SERVICE_KEY'
        )
    }

    // Supabase client satisfies SupabaseProvisionClient via duck typing
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as SupabaseProvisionClient
}

// ── Determine mode ─────────────────────────────────────────────────────────

function detectMode(template: IndustryTemplate): ProvisionerMode {
    if (process.env.PROVISIONER_MODE) {
        return process.env.PROVISIONER_MODE as ProvisionerMode
    }
    // Template engine is always local or demo
    if (process.env.DEMO_MODE === 'true') {
        return 'demo'
    }
    return 'local'
}

// ── Main export ────────────────────────────────────────────────────────────

export async function seedGovernance(
    template: IndustryTemplate,
    log: LogFn
): Promise<GovernanceResult> {
    log('🏛️', '═══ GOVERNANCE SEED (UnifiedProvisioner) ═══')

    // 1. Load contract
    const contract = loadContract()
    log('📜', `Contract: ${contract.flags.keys.length} flags, ${contract.limits.keys.length} limits`)

    // 2. Resolve tenant ID
    const tenantId = process.env.LOCAL_TENANT_ID || process.env.TENANT_ID
    if (!tenantId) {
        throw new Error('TENANT_ID or LOCAL_TENANT_ID env var is required')
    }

    // 3. Detect mode
    const mode = detectMode(template)
    log('🔧', `Mode: ${mode}`)

    // 4. Build dependencies
    const deps: ProvisionerDependencies = {
        supabase: getSupabaseAdmin(),
        billing: new MockBillingGateway(), // Template engine never does real billing
        log: (icon: string, msg: string) => log(icon, msg),
        contract,
    }

    // 5. Create provisioner and run
    const provisioner = new UnifiedProvisioner(mode, deps)

    const storeConfig = template.governance.storeConfig
    const result = await provisioner.provision({
        tenantId,
        tenantName: storeConfig.business_name || 'Local Dev Store',
        slug: template.id.replace(/[^a-z0-9]/g, '-'),
        ownerEmail: storeConfig.store_email || 'admin@bootandstrap.demo',
        currency: (template.currency?.toUpperCase() as 'CHF' | 'EUR') || 'EUR',
        moduleBundle: mode === 'demo' || mode === 'local' ? 'all_max' : undefined,
        skipBilling: true,         // Template engine never bills
        skipRepoCreation: true,    // Template engine never creates repos
        skipDeploy: true,          // Template engine never deploys
        metadata: {
            storeConfig: {
                business_name: storeConfig.business_name,
                primary_color: storeConfig.primary_color,
                accent_color: storeConfig.accent_color,
                language: storeConfig.language,
                default_currency: storeConfig.default_currency ?? template.currency,
                active_currencies: storeConfig.active_currencies ?? [template.currency],
                active_languages: storeConfig.active_languages ?? [storeConfig.language],
                timezone: template.timezone ?? 'Europe/Madrid',
                contact_phone: storeConfig.contact_phone,
                logo_url: storeConfig.logo_url,
                description: storeConfig.description,
                store_email: storeConfig.store_email,
            },
            templateId: template.id,
            flagOverrides: template.governance.flagOverrides,
            limitOverrides: template.governance.limitOverrides,
        },
    })

    // 6. Report
    if (result.warnings.length > 0) {
        for (const warn of result.warnings) {
            log('⚠️', warn)
        }
    }

    const failedSteps = result.steps.filter(s => s.status === 'failed')
    if (failedSteps.length > 0) {
        for (const step of failedSteps) {
            log('❌', `Step '${step.step}' failed: ${step.error}`)
        }
    }

    log('🏛️', `═══ GOVERNANCE SEED COMPLETE [${mode}] — ${result.modules.flagsEnabled}/${result.modules.flagsTotal} flags, ${result.durationMs}ms ═══`)

    return { tenantId, success: result.success }
}
