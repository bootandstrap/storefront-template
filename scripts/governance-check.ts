#!/usr/bin/env npx tsx
/**
 * @module governance-check
 * @description Pre-flight governance check for local development.
 *
 * Called by dev.sh before the storefront starts. Ensures:
 *   1. Governance contract is reachable
 *   2. Tenant row exists in Supabase
 *   3. Feature flags and plan limits are seeded
 *   4. Config row exists
 *   5. Maintenance mode is OFF
 *
 * If any check fails, it auto-provisions using UnifiedProvisioner (local mode).
 * This replaces the "maintenance mode loop" that devs kept hitting.
 *
 * Usage:
 *   npx tsx scripts/governance-check.ts                 # auto-detect
 *   npx tsx scripts/governance-check.ts --force-seed    # force re-seed
 *   npx tsx scripts/governance-check.ts --dry-run       # check only
 *
 * Exit codes:
 *   0 = OK (tenant is provisioned and governance is healthy)
 *   1 = Fatal error (cannot proceed)
 *
 * @locked 🔴 CANONICAL — ecommerce-template scripts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// ── Shared package imports (relative for script context) ──────────────────
import { UnifiedProvisioner } from '../packages/shared/src/provisioning/unified-provisioner'
import { MockBillingGateway } from '../packages/shared/src/billing/providers/mock'
import type {
    GovernanceContractSource,
    SupabaseProvisionClient,
} from '../packages/shared/src/provisioning/types'

// ── Colors ────────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BLUE = '\x1b[34m'
const DIM = '\x1b[2m'
const NC = '\x1b[0m'

function log(icon: string, msg: string) {
    console.log(`  ${icon} ${msg}`)
}

function banner(msg: string) {
    console.log(`\n${GREEN}🏛️  ${msg}${NC}`)
    console.log('━'.repeat(50))
}

// ── Load env ──────────────────────────────────────────────────────────────

function loadEnv(): void {
    const envPath = resolve(__dirname, '../.env')
    if (!existsSync(envPath)) {
        log('⚠️', `${YELLOW}.env not found at ${envPath} — using process env${NC}`)
        return
    }

    const lines = readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx < 0) continue
        const key = trimmed.substring(0, eqIdx).trim()
        let value = trimmed.substring(eqIdx + 1).trim()
        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        if (!process.env[key]) {
            process.env[key] = value
        }
    }
}

// ── Load contract ─────────────────────────────────────────────────────────

function loadContract(): GovernanceContractSource {
    const candidates = [
        resolve(__dirname, '../apps/storefront/src/lib/governance-contract.json'),
        resolve(__dirname, '../generated/contract.json'),
        resolve(__dirname, '../packages/shared/src/governance-contract.json'),
        resolve(__dirname, '../../governance-contract.json'),
    ]

    for (const path of candidates) {
        try {
            return JSON.parse(readFileSync(path, 'utf-8'))
        } catch { /* next */ }
    }

    throw new Error(
        `${RED}governance-contract.json not found!${NC}\n` +
        `Searched:\n${candidates.map(c => `  - ${c}`).join('\n')}\n` +
        `Run: npx tsx scripts/generate-contract.ts (in BOOTANDSTRAP_WEB)`
    )
}

// ── Supabase client ───────────────────────────────────────────────────────

function getSupabase() {
    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error(
            `${RED}Missing Supabase credentials.${NC}\n` +
            '  Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env\n' +
            '  Or GOVERNANCE_SUPABASE_URL + GOVERNANCE_SUPABASE_SERVICE_KEY'
        )
    }

    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

// ── Health check: verify governance state ─────────────────────────────────

interface HealthResult {
    tenantExists: boolean
    configExists: boolean
    flagsExist: boolean
    limitsExist: boolean
    maintenanceModeOff: boolean
    status: 'healthy' | 'needs_provision' | 'needs_fix'
    issues: string[]
}

async function checkGovernanceHealth(tenantId: string): Promise<HealthResult> {
    const supabase = getSupabase()
    const issues: string[] = []

    // Check tenant
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('id', tenantId)
        .maybeSingle()

    const tenantExists = !!tenant

    // Check config
    const { data: config } = await supabase
        .from('config')
        .select('tenant_id, business_name, language')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    const configExists = !!config

    // Check feature flags
    const { data: flags } = await supabase
        .from('feature_flags')
        .select('tenant_id, enable_maintenance_mode, enable_ecommerce')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    const flagsExist = !!flags
    const maintenanceModeOff = flags ? (flags as Record<string, unknown>).enable_maintenance_mode === false : false

    // Check plan limits
    const { data: limits } = await supabase
        .from('plan_limits')
        .select('tenant_id, plan_name')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    const limitsExist = !!limits

    // Determine status
    if (!tenantExists) {
        issues.push('Tenant not found in DB')
    }
    if (!configExists) {
        issues.push('Config row missing')
    }
    if (!flagsExist) {
        issues.push('Feature flags not seeded')
    } else if (!maintenanceModeOff) {
        issues.push('⚠️  Maintenance mode is ON — storefront will be blocked')
    }
    if (!limitsExist) {
        issues.push('Plan limits not seeded')
    }

    let status: HealthResult['status'] = 'healthy'
    if (!tenantExists || !flagsExist || !limitsExist || !configExists) {
        status = 'needs_provision'
    } else if (!maintenanceModeOff) {
        status = 'needs_fix'
    }

    return {
        tenantExists,
        configExists,
        flagsExist,
        limitsExist,
        maintenanceModeOff,
        status,
        issues,
    }
}

// ── Fix: disable maintenance mode ─────────────────────────────────────────

async function fixMaintenanceMode(tenantId: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('feature_flags')
        .update({ enable_maintenance_mode: false })
        .eq('tenant_id', tenantId)

    if (error) throw new Error(`Failed to disable maintenance mode: ${error.message}`)
}

// ── Auto-provision ────────────────────────────────────────────────────────

async function autoProvision(tenantId: string, contract: GovernanceContractSource): Promise<void> {
    const supabase = getSupabase() as unknown as SupabaseProvisionClient

    const provisioner = new UnifiedProvisioner('local', {
        supabase,
        billing: new MockBillingGateway(),
        log,
        contract,
    })

    const result = await provisioner.provision({
        tenantId,
        tenantName: process.env.STORE_NAME || 'Local Dev Store',
        slug: process.env.STORE_SLUG || 'local-dev',
        ownerEmail: process.env.MEDUSA_ADMIN_EMAIL || 'admin@bootandstrap.demo',
        currency: (process.env.DEFAULT_CURRENCY?.toUpperCase() as 'CHF' | 'EUR') || 'EUR',
        moduleBundle: 'all_max',
        skipBilling: true,
        skipRepoCreation: true,
        skipDeploy: true,
    })

    if (!result.success) {
        const failedSteps = result.steps.filter(s => s.status === 'failed')
        throw new Error(
            `Auto-provision failed:\n` +
            failedSteps.map(s => `  - ${s.step}: ${s.error}`).join('\n')
        )
    }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const args = process.argv.slice(2)
    const forceSeed = args.includes('--force-seed')
    const dryRun = args.includes('--dry-run')

    banner('Governance Pre-flight Check')

    // Load env
    loadEnv()

    // Resolve tenant ID
    const tenantId = process.env.LOCAL_TENANT_ID || process.env.TENANT_ID
    if (!tenantId) {
        log('❌', `${RED}TENANT_ID or LOCAL_TENANT_ID not set in .env${NC}`)
        log('💡', `${DIM}Add LOCAL_TENANT_ID=<uuid> to your .env file${NC}`)
        process.exit(1)
    }
    log('🔑', `Tenant ID: ${DIM}${tenantId}${NC}`)

    // Load contract
    let contract: GovernanceContractSource
    try {
        contract = loadContract()
        log('📜', `Contract: ${contract.flags.keys.length} flags, ${contract.limits.keys.length} limits`)
    } catch (error) {
        log('❌', `${RED}${(error as Error).message}${NC}`)
        process.exit(1)
    }

    // Health check
    log('🔍', 'Checking governance state...')
    const health = await checkGovernanceHealth(tenantId)

    if (health.status === 'healthy' && !forceSeed) {
        log('✅', `${GREEN}Governance is healthy!${NC}`)
        log('  ', `${DIM}Tenant exists, flags seeded, limits set, maintenance OFF${NC}`)
        process.exit(0)
    }

    // Report issues
    for (const issue of health.issues) {
        log('⚠️', `${YELLOW}${issue}${NC}`)
    }

    if (dryRun) {
        log('🔍', `${BLUE}Dry run — no changes made${NC}`)
        process.exit(health.status === 'healthy' ? 0 : 1)
    }

    // Auto-fix or auto-provision
    if (health.status === 'needs_fix' && !forceSeed) {
        log('🔧', 'Fixing: disabling maintenance mode...')
        await fixMaintenanceMode(tenantId)
        log('✅', `${GREEN}Maintenance mode disabled${NC}`)
        process.exit(0)
    }

    // Full provision needed (or --force-seed)
    const reason = forceSeed ? '--force-seed flag' : 'governance not yet provisioned'
    log('🚀', `Auto-provisioning (${reason})...`)

    try {
        await autoProvision(tenantId, contract)
        log('✅', `${GREEN}Governance provisioned successfully!${NC}`)
    } catch (err) {
        log('❌', `${RED}${(err as Error).message}${NC}`)
        process.exit(1)
    }

    // Verify
    const recheck = await checkGovernanceHealth(tenantId)
    if (recheck.status === 'healthy') {
        log('✅', `${GREEN}Post-provision verification passed${NC}`)
    } else {
        log('⚠️', `${YELLOW}Post-provision issues:${NC}`)
        for (const issue of recheck.issues) {
            log('  ', issue)
        }
    }
}

main().catch(err => {
    log('💥', `${RED}Unexpected error: ${err.message}${NC}`)
    process.exit(1)
})
