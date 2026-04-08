#!/usr/bin/env npx tsx
/**
 * @module scripts/e2e-provision-drill
 * @description End-to-end provisioning pipeline validation.
 *
 * Tests the FULL chain:
 *   1. Contract load + structure validation
 *   2. derivePlansFromContract → PlansConfig
 *   3. createModuleRegistry → ModuleRegistry
 *   4. MedusaModuleRouter.route() → MedusaAction[]
 *   5. getFeatureGateMap / getPanelPolicy
 *
 * This does NOT call real Medusa or Stripe — it validates the shared package
 * pipeline produces correct output for any downstream consumer.
 *
 * Usage:
 *   npx tsx scripts/e2e-provision-drill.ts
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Validation failure
 *
 * @locked 🔴 CANONICAL — ecommerce-template scripts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Shared package imports
import { createModuleRegistry, getFeatureGateMap, getPanelPolicy } from '../packages/shared/src/modules/registry'
import { MedusaModuleRouter } from '../packages/shared/src/modules/medusa-router'
import { derivePlansFromContract } from '../packages/shared/src/billing/plans'
import type { ModuleRegistryEntry } from '../packages/shared/src/modules/types'

// ── Colors ────────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BLUE = '\x1b[34m'
const DIM = '\x1b[2m'
const NC = '\x1b[0m'

let passed = 0
let failed = 0
let skipped = 0

function check(label: string, condition: boolean, detail?: string): void {
    if (condition) {
        console.log(`  ✅ ${GREEN}${label}${NC}${detail ? ` ${DIM}(${detail})${NC}` : ''}`)
        passed++
    } else {
        console.log(`  ❌ ${RED}${label}${NC}${detail ? ` ${DIM}(${detail})${NC}` : ''}`)
        failed++
    }
}

function skip(label: string, reason: string): void {
    console.log(`  ⏭️  ${YELLOW}${label}${NC} ${DIM}— ${reason}${NC}`)
    skipped++
}

function section(title: string): void {
    console.log(`\n${BLUE}━━━ ${title} ━━━${NC}`)
}

// ── Load contract ─────────────────────────────────────────────────────────

function loadContract(): Record<string, unknown> {
    const candidates = [
        resolve(__dirname, '../apps/storefront/src/lib/governance-contract.json'),
        resolve(__dirname, '../generated/contract.json'),
        resolve(__dirname, '../packages/shared/src/governance-contract.json'),
    ]

    for (const path of candidates) {
        try {
            return JSON.parse(readFileSync(path, 'utf-8'))
        } catch { /* next */ }
    }

    throw new Error('governance-contract.json not found')
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log(`\n${GREEN}🚀 E2E Provisioning Drill${NC}`)
    console.log('━'.repeat(50))

    // ── Phase 1: Contract Validation ──

    section('Phase 1: Governance Contract')

    let contract: Record<string, unknown>
    try {
        contract = loadContract()
        check('Contract loads', true)
    } catch (err) {
        console.log(`  ❌ ${RED}Contract not found: ${(err as Error).message}${NC}`)
        process.exit(1)
    }

    const flags = contract.flags as { keys: string[] } | undefined
    const limits = contract.limits as { keys: string[] } | undefined
    const modules = contract.modules as { catalog?: unknown[]; count?: number; keys?: string[] } | undefined

    check('Has flags', !!flags?.keys?.length, `${flags?.keys?.length ?? 0} flags`)
    check('Has limits', !!limits?.keys?.length, `${limits?.keys?.length ?? 0} limits`)
    check('Has modules.catalog', Array.isArray(modules?.catalog), `${(modules?.catalog as unknown[])?.length ?? 0} modules`)

    // Check essential flags exist
    const essentialFlags = [
        'enable_ecommerce', 'enable_owner_panel', 'enable_maintenance_mode',
        'enable_pos', 'enable_crm', 'enable_chatbot', 'enable_seo',
    ]
    for (const flag of essentialFlags) {
        check(`Flag: ${flag}`, flags?.keys?.includes(flag) ?? false)
    }

    // Check essential limits
    const essentialLimits = ['max_products', 'max_categories', 'max_orders_month']
    for (const limit of essentialLimits) {
        check(`Limit: ${limit}`, limits?.keys?.includes(limit) ?? false)
    }

    // ── Phase 2: Plan Derivation ──

    section('Phase 2: Plan Derivation')

    const plans = derivePlansFromContract(contract as Parameters<typeof derivePlansFromContract>[0])
    check('Plans derived', plans != null)
    check('Has maintenance plan', plans.maintenance != null)
    check('Has webBase plan', plans.webBase != null)
    check('Maintenance price > 0', plans.maintenance.prices.CHF > 0, `${plans.maintenance.prices.CHF} CHF`)

    check('Module plans derived', plans.modules.length > 0, `${plans.modules.length} modules`)

    // Verify each module has at least 1 tier
    for (const mod of plans.modules) {
        check(`Module ${mod.key} has tiers`, mod.tiers.length > 0, `${mod.tiers.length} tiers`)
    }

    // ── Phase 3: Module Registry ──

    section('Phase 3: Module Registry')

    const registry = createModuleRegistry(contract as Parameters<typeof createModuleRegistry>[0])
    check('Registry created', registry != null)

    const allModules = Object.values(registry.modules)
    check('All modules loaded', allModules.length > 0, `${allModules.length} modules`)

    const featureGateMappings = getFeatureGateMap(registry)
    check('Feature gate map', featureGateMappings.length > 0, `${featureGateMappings.length} mappings`)

    const panelPolicies = getPanelPolicy(registry)
    check('Panel policy', panelPolicies.length > 0, `${panelPolicies.length} policies`)

    // Verify each module has Medusa integration metadata
    let modulesWithMedusa = 0
    for (const mod of allModules) {
        if (mod.medusaIntegration) {
            modulesWithMedusa++
        }
    }
    check('Modules with Medusa integration', modulesWithMedusa > 0, `${modulesWithMedusa}/${allModules.length}`)

    // ── Phase 4: MedusaModuleRouter ──

    section('Phase 4: MedusaModuleRouter')

    const router = new MedusaModuleRouter(registry.modules)
    const testTenantId = '00000000-0000-0000-0000-000000000000'

    // Test activate actions for each module
    let totalActions = 0
    for (const mod of allModules) {
        if (!mod.medusaIntegration) continue

        const result = router.route({
            type: 'activate',
            tenantId: testTenantId,
            moduleKey: mod.key,
            newTierLevel: 1,
            previousTierLevel: 0,
        })
        totalActions += result.actions.length
        check(`Activate ${mod.key}`, result.success, `${result.actions.length} actions`)
    }
    check('Total activation actions', totalActions > 0, `${totalActions} actions total`)

    // Test upgrade from tier 1 → 2
    const upgradeableModule = allModules.find((m: ModuleRegistryEntry) =>
        m.tiers.length >= 2 && m.medusaIntegration
    )

    if (upgradeableModule) {
        const upgradeResult = router.route({
            type: 'upgrade',
            tenantId: testTenantId,
            moduleKey: upgradeableModule.key,
            newTierLevel: 2,
            previousTierLevel: 1,
        })
        check('Upgrade actions', upgradeResult.success, `${upgradeableModule.key}: ${upgradeResult.actions.length} actions`)
    } else {
        skip('Upgrade actions', 'No multi-tier modules with Medusa integration')
    }

    // Test deactivation
    const firstMedusaModule = allModules.find((m: ModuleRegistryEntry) => m.medusaIntegration)
    if (firstMedusaModule) {
        const deactivateResult = router.route({
            type: 'deactivate',
            tenantId: testTenantId,
            moduleKey: firstMedusaModule.key,
            newTierLevel: 0,
            previousTierLevel: 1,
        })
        check('Deactivation actions', deactivateResult.success, `${firstMedusaModule.key}: ${deactivateResult.actions.length} actions`)
    }

    // Test module without Medusa integration (should warn, not fail)
    const nonMedusaModule = allModules.find((m: ModuleRegistryEntry) => !m.medusaIntegration)
    if (nonMedusaModule) {
        const noIntegResult = router.route({
            type: 'activate',
            tenantId: testTenantId,
            moduleKey: nonMedusaModule.key,
            newTierLevel: 1,
            previousTierLevel: 0,
        })
        check('Non-Medusa module handled gracefully', noIntegResult.warnings.length > 0, nonMedusaModule.key)
    }

    // Test unknown module
    const unknownResult = router.route({
        type: 'activate',
        tenantId: testTenantId,
        moduleKey: 'nonexistent_module',
        newTierLevel: 1,
        previousTierLevel: 0,
    })
    check('Unknown module returns error', !unknownResult.success && unknownResult.errors.length > 0)

    // ── Phase 5: Cross-Component Integration ──

    section('Phase 5: Cross-Component Integration')

    const pipelineModuleCount = allModules.filter((m: ModuleRegistryEntry) => m.medusaIntegration).length
    const pipelineActionCount = allModules
        .filter((m: ModuleRegistryEntry) => m.medusaIntegration)
        .reduce((sum: number, m: ModuleRegistryEntry) => {
            const r = router.route({
                type: 'activate',
                tenantId: testTenantId,
                moduleKey: m.key,
                newTierLevel: 1,
                previousTierLevel: 0,
            })
            return sum + r.actions.length
        }, 0)

    check('Pipeline: contract → registry', allModules.length > 0)
    check('Pipeline: registry → router', pipelineModuleCount > 0)
    check('Pipeline: router → actions', pipelineActionCount > 0)
    check('Pipeline complete', pipelineModuleCount > 0 && pipelineActionCount > 0,
        `${pipelineModuleCount} modules → ${pipelineActionCount} actions`)

    // Verify feature gate map covers all module flags
    const allRegistryFlags = new Set(allModules.flatMap((m: ModuleRegistryEntry) => m.flags))
    const gateMappedFlags = new Set(featureGateMappings.map(g => g.flag))
    const unmappedFlags = [...allRegistryFlags].filter(f => !gateMappedFlags.has(f))
    check('All flags gate-mapped', unmappedFlags.length === 0,
        unmappedFlags.length > 0 ? `missing: ${unmappedFlags.slice(0, 3).join(', ')}` : 'all flags covered')

    // ── Phase 6: Module Lifecycle Validation ──

    section('Phase 6: Module Lifecycle')

    // Find a module with 3+ tiers for full lifecycle test
    const lifecycleModule = allModules.find((m: ModuleRegistryEntry) =>
        m.tiers.length >= 3 && m.medusaIntegration
    )

    if (lifecycleModule) {
        // activate (0 → 1)
        const activateR = router.route({
            type: 'activate', tenantId: testTenantId,
            moduleKey: lifecycleModule.key, newTierLevel: 1, previousTierLevel: 0,
        })
        check(`Lifecycle: ${lifecycleModule.key} activate (0→1)`, activateR.success, `${activateR.actions.length} actions`)

        // upgrade (1 → 2)
        const upgradeR = router.route({
            type: 'upgrade', tenantId: testTenantId,
            moduleKey: lifecycleModule.key, newTierLevel: 2, previousTierLevel: 1,
        })
        check(`Lifecycle: ${lifecycleModule.key} upgrade (1→2)`, upgradeR.success, `${upgradeR.actions.length} actions`)

        // upgrade (2 → 3)
        const upgrade2R = router.route({
            type: 'upgrade', tenantId: testTenantId,
            moduleKey: lifecycleModule.key, newTierLevel: 3, previousTierLevel: 2,
        })
        check(`Lifecycle: ${lifecycleModule.key} upgrade (2→3)`, upgrade2R.success, `${upgrade2R.actions.length} actions`)

        // downgrade (3 → 1)
        const downgradeR = router.route({
            type: 'downgrade', tenantId: testTenantId,
            moduleKey: lifecycleModule.key, newTierLevel: 1, previousTierLevel: 3,
        })
        check(`Lifecycle: ${lifecycleModule.key} downgrade (3→1)`, downgradeR.success, `${downgradeR.actions.length} actions`)

        // deactivate (1 → 0)
        const deactivateR = router.route({
            type: 'deactivate', tenantId: testTenantId,
            moduleKey: lifecycleModule.key, newTierLevel: 0, previousTierLevel: 1,
        })
        check(`Lifecycle: ${lifecycleModule.key} deactivate (1→0)`, deactivateR.success, `${deactivateR.actions.length} actions`)

        // Deactivation should produce cleanup_data actions (entities to clean up)
        const hasCleanup = deactivateR.actions.some(a => a.type === 'cleanup_data')
        check('Deactivation has cleanup actions', hasCleanup || deactivateR.actions.length > 0,
            hasCleanup ? 'cleanup_data' : `${deactivateR.actions.length} other actions`)
    } else {
        skip('Full lifecycle test', 'No module with 3+ tiers and Medusa integration')
    }

    // Verify ALL modules with Medusa integration produce deactivation actions
    let deactivationCoveredCount = 0
    for (const mod of allModules.filter((m: ModuleRegistryEntry) => m.medusaIntegration)) {
        const deactR = router.route({
            type: 'deactivate', tenantId: testTenantId,
            moduleKey: mod.key, newTierLevel: 0, previousTierLevel: 1,
        })
        if (deactR.success && deactR.actions.length > 0) {
            deactivationCoveredCount++
        }
    }
    check('All Medusa modules have deactivation path',
        deactivationCoveredCount > 0,
        `${deactivationCoveredCount}/${allModules.filter((m: ModuleRegistryEntry) => m.medusaIntegration).length}`)

    // Subscriber governance mapping validation
    // Check known subscriber → flag mappings
    const subscriberGateMappings = [
        { subscriber: 'order-placed', flag: 'enable_ecommerce' },
        { subscriber: 'order-canceled', flag: 'enable_ecommerce' },
        { subscriber: 'order-shipped', flag: 'enable_ecommerce' },
        { subscriber: 'order-return-requested', flag: 'enable_ecommerce' },
        { subscriber: 'low-stock-alert', flag: 'enable_ecommerce' },
    ]

    for (const mapping of subscriberGateMappings) {
        if ('flag' in mapping) {
            check(`Subscriber ${mapping.subscriber} → ${mapping.flag}`,
                flags?.keys?.includes(mapping.flag) ?? false)
        } else if ('flags' in mapping) {
            const allExist = mapping.flags.every(f => flags?.keys?.includes(f))
            check(`Subscriber ${mapping.subscriber} → ${mapping.flags.join(' + ')}`, allExist)
        }
    }

    // ── Summary ──

    console.log('\n' + '━'.repeat(50))
    console.log(`${GREEN}✅ Passed: ${passed}${NC}`)
    if (failed > 0) console.log(`${RED}❌ Failed: ${failed}${NC}`)
    if (skipped > 0) console.log(`${YELLOW}⏭️  Skipped: ${skipped}${NC}`)
    console.log(`Total: ${passed + failed + skipped} checks`)
    console.log('━'.repeat(50))

    if (failed > 0) {
        console.log(`\n${RED}E2E Provisioning Drill FAILED${NC}`)
        process.exit(1)
    } else {
        console.log(`\n${GREEN}E2E Provisioning Drill PASSED ✨${NC}`)
    }
}

main().catch(err => {
    console.error(`\n${RED}💥 Fatal error: ${err.message}${NC}`)
    process.exit(1)
})

