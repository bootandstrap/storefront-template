#!/usr/bin/env npx tsx
/**
 * @module scripts/template-drift-check
 * @description Local drift detection tool — Mercur-inspired template sync checker.
 *
 * Compares a tenant repo against the storefront-template to detect:
 *   - Governance contract version mismatches
 *   - Shared package version drift
 *   - Missing platform files (🔴 LOCKED zone)
 *   - Stale CI/CD workflows
 *   - New modules without Medusa integration
 *
 * USAGE:
 *   npx tsx scripts/template-drift-check.ts                    # Check local setup
 *   npx tsx scripts/template-drift-check.ts --repo store-campifruit  # Check remote repo (future)
 *
 * EXIT CODES:
 *   0 — No drift detected
 *   1 — Drift detected (details logged)
 *   2 — Fatal error (network, auth, etc.)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

// ── Config ────────────────────────────────────────────────────────────────

const ROOT = join(import.meta.dirname ?? __dirname, '..')
const SHARED_PKG_PATH = join(ROOT, 'packages/shared/package.json')
const CONTRACT_PATH = join(ROOT, 'generated/contract.json')

// Platform files that MUST exist in every tenant repo (🔴 LOCKED zone)
const REQUIRED_PLATFORM_FILES = [
    // Governance
    'packages/shared/package.json',
    'packages/shared/src/index.ts',
    'packages/shared/src/billing/index.ts',
    'packages/shared/src/governance/index.ts',
    'packages/shared/src/modules/index.ts',
    'packages/shared/src/provisioning/index.ts',

    // CI/CD
    '.github/workflows/deploy.yml',
    '.github/workflows/build-medusa.yml',

    // Medusa
    'apps/medusa/medusa-config.ts',
    'apps/medusa/src/api/admin/governance/route.ts',

    // Storefront governance
    'scripts/governance-check.ts',

    // Root config
    'turbo.json',
    'pnpm-workspace.yaml',
]

// Files that should be in .templatesyncignore (🟢 CUSTOMIZE zone)
const CUSTOMIZE_ZONE_FILES = [
    'apps/storefront/src/app/globals.css',
    'apps/storefront/src/components/home/',
    'apps/storefront/src/components/layout/Header.tsx',
    'apps/storefront/src/components/layout/Footer.tsx',
    'apps/storefront/src/lib/i18n/dictionaries/',
    'apps/storefront/public/',
    'apps/storefront/src/app/[lang]/(shop)/page.tsx',
]

// ── Types ─────────────────────────────────────────────────────────────────

interface DriftIssue {
    severity: 'error' | 'warning' | 'info'
    category: string
    message: string
    file?: string
    fix?: string
}

// ── Checkers ──────────────────────────────────────────────────────────────

function checkPlatformFiles(): DriftIssue[] {
    const issues: DriftIssue[] = []

    for (const file of REQUIRED_PLATFORM_FILES) {
        const fullPath = join(ROOT, file)
        if (!existsSync(fullPath)) {
            issues.push({
                severity: 'error',
                category: 'platform-files',
                message: `Missing required platform file: ${file}`,
                file,
                fix: `Copy from storefront-template or run template sync`,
            })
        }
    }

    return issues
}

function checkContractVersion(): DriftIssue[] {
    const issues: DriftIssue[] = []

    if (!existsSync(CONTRACT_PATH)) {
        // Contract may not exist yet — check for the fallback
        const fallbackPath = join(ROOT, 'apps/storefront/governance-contract.json')
        if (!existsSync(fallbackPath)) {
            issues.push({
                severity: 'warning',
                category: 'governance-contract',
                message: 'No governance contract found — run generate-contract.ts',
                fix: 'cd BOOTANDSTRAP_WEB && npx tsx scripts/generate-contract.ts',
            })
        } else {
            issues.push({
                severity: 'info',
                category: 'governance-contract',
                message: 'Using legacy contract path (governance-contract.json) — consider migrating to generated/contract.json',
                file: 'apps/storefront/governance-contract.json',
            })
        }
        return issues
    }

    try {
        const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf-8'))
        const moduleCount = contract.modules?.length ?? 0
        const flagCount = contract.flags?.keys?.length ?? 0
        const limitCount = contract.limits?.keys?.length ?? 0

        issues.push({
            severity: 'info',
            category: 'governance-contract',
            message: `Contract loaded: ${moduleCount} modules, ${flagCount} flags, ${limitCount} limits`,
        })

        // Validate expected counts
        if (moduleCount < 10) {
            issues.push({
                severity: 'warning',
                category: 'governance-contract',
                message: `Low module count (${moduleCount}). Expected ≥13. Contract may be stale.`,
                fix: 'Regenerate: npx tsx scripts/generate-contract.ts',
            })
        }
    } catch {
        issues.push({
            severity: 'error',
            category: 'governance-contract',
            message: `Failed to parse governance contract`,
            file: 'generated/contract.json',
        })
    }

    return issues
}

function checkSharedPackageVersion(): DriftIssue[] {
    const issues: DriftIssue[] = []

    if (!existsSync(SHARED_PKG_PATH)) {
        issues.push({
            severity: 'error',
            category: 'shared-package',
            message: 'Missing @bootandstrap/shared package.json',
            file: 'packages/shared/package.json',
        })
        return issues
    }

    try {
        const pkg = JSON.parse(readFileSync(SHARED_PKG_PATH, 'utf-8'))

        issues.push({
            severity: 'info',
            category: 'shared-package',
            message: `@bootandstrap/shared v${pkg.version}`,
        })

        // Check build output exists
        const distPath = join(ROOT, 'packages/shared/dist')
        if (!existsSync(distPath)) {
            issues.push({
                severity: 'warning',
                category: 'shared-package',
                message: 'Shared package not built — run build first',
                fix: 'cd packages/shared && pnpm build',
            })
        }

        // Check key exports exist
        const requiredExports = ['.', './billing', './governance', './provisioning', './modules']
        const configuredExports = Object.keys(pkg.exports || {})
        for (const exp of requiredExports) {
            if (!configuredExports.includes(exp)) {
                issues.push({
                    severity: 'error',
                    category: 'shared-package',
                    message: `Missing export "${exp}" in package.json exports map`,
                    file: 'packages/shared/package.json',
                })
            }
        }
    } catch {
        issues.push({
            severity: 'error',
            category: 'shared-package',
            message: 'Failed to parse shared package.json',
        })
    }

    return issues
}

function checkWorkflows(): DriftIssue[] {
    const issues: DriftIssue[] = []
    const workflowDir = join(ROOT, '.github/workflows')

    if (!existsSync(workflowDir)) {
        issues.push({
            severity: 'error',
            category: 'ci-cd',
            message: 'Missing .github/workflows directory',
        })
        return issues
    }

    const requiredWorkflows = ['deploy.yml', 'build-medusa.yml', 'publish-shared.yml']
    const existingWorkflows = readdirSync(workflowDir)

    for (const wf of requiredWorkflows) {
        if (!existingWorkflows.includes(wf)) {
            issues.push({
                severity: 'warning',
                category: 'ci-cd',
                message: `Missing workflow: ${wf}`,
                file: `.github/workflows/${wf}`,
                fix: 'Copy from storefront-template',
            })
        }
    }

    return issues
}

function checkMedusaGovernanceAPI(): DriftIssue[] {
    const issues: DriftIssue[] = []
    const routePath = join(ROOT, 'apps/medusa/src/api/admin/governance/route.ts')

    if (!existsSync(routePath)) {
        issues.push({
            severity: 'warning',
            category: 'medusa-governance',
            message: 'Missing Medusa Governance Executor API',
            file: 'apps/medusa/src/api/admin/governance/route.ts',
            fix: 'Copy from storefront-template',
        })
        return issues
    }

    // Check executor implements all expected action types
    try {
        const content = readFileSync(routePath, 'utf-8')
        const expectedExecutors = [
            'configure_module',
            'enable_workflow',
            'disable_workflow',
            'register_subscriber',
            'unregister_subscriber',
            'create_link',
            'remove_link',
            'seed_data',
            'cleanup_data',
        ]

        for (const exec of expectedExecutors) {
            if (!content.includes(exec)) {
                issues.push({
                    severity: 'warning',
                    category: 'medusa-governance',
                    message: `Governance API missing executor for: ${exec}`,
                    file: 'apps/medusa/src/api/admin/governance/route.ts',
                })
            }
        }
    } catch {
        issues.push({
            severity: 'error',
            category: 'medusa-governance',
            message: 'Failed to read governance API route',
        })
    }

    return issues
}

function checkTemplateSyncIgnore(): DriftIssue[] {
    const issues: DriftIssue[] = []
    const ignorePath = join(ROOT, '.templatesyncignore')

    if (!existsSync(ignorePath)) {
        issues.push({
            severity: 'warning',
            category: 'template-sync',
            message: 'Missing .templatesyncignore — customize zone not protected',
            fix: 'Copy from storefront-template',
        })
        return issues
    }

    const content = readFileSync(ignorePath, 'utf-8')

    for (const file of CUSTOMIZE_ZONE_FILES) {
        if (!content.includes(file)) {
            issues.push({
                severity: 'warning',
                category: 'template-sync',
                message: `Customize zone file not in .templatesyncignore: ${file}`,
                fix: `Add "${file}" to .templatesyncignore`,
            })
        }
    }

    return issues
}

function checkModuleMedusaIntegration(): DriftIssue[] {
    const issues: DriftIssue[] = []

    // Load registry from source
    const registryPath = join(ROOT, 'packages/shared/src/modules/registry.ts')
    if (!existsSync(registryPath)) return issues

    try {
        const content = readFileSync(registryPath, 'utf-8')

        // Count modules in MEDUSA_INTEGRATIONS
        const integrationMatch = content.match(/MEDUSA_INTEGRATIONS.*?=\s*\{([\s\S]*?)\n\}/m)
        if (!integrationMatch) {
            issues.push({
                severity: 'warning',
                category: 'medusa-integration',
                message: 'MEDUSA_INTEGRATIONS map not found in registry.ts',
                file: 'packages/shared/src/modules/registry.ts',
            })
            return issues
        }

        // Check for modules with modulePath (deep integration)
        const modulePathCount = (content.match(/modulePath:/g) || []).length
        issues.push({
            severity: 'info',
            category: 'medusa-integration',
            message: `${modulePathCount} modules have deep Medusa integration (modulePath defined)`,
        })

        // Count total module entries
        const moduleMetadata = content.match(/MODULE_METADATA.*?=\s*\{([\s\S]*?)\n\}/m)
        if (moduleMetadata) {
            const metadataKeys = (moduleMetadata[1].match(/^\s+\w+:\s*\{/gm) || []).length
            issues.push({
                severity: 'info',
                category: 'medusa-integration',
                message: `${metadataKeys} modules registered in MODULE_METADATA`,
            })
        }
    } catch {
        issues.push({
            severity: 'error',
            category: 'medusa-integration',
            message: 'Failed to parse registry.ts for integration check',
        })
    }

    return issues
}

// ── Runner ────────────────────────────────────────────────────────────────

function run(): void {
    console.log('\n🔍 BootandStrap Template Drift Check')
    console.log('━'.repeat(50))

    const allIssues: DriftIssue[] = [
        ...checkPlatformFiles(),
        ...checkContractVersion(),
        ...checkSharedPackageVersion(),
        ...checkWorkflows(),
        ...checkMedusaGovernanceAPI(),
        ...checkTemplateSyncIgnore(),
        ...checkModuleMedusaIntegration(),
    ]

    // Group by severity
    const errors = allIssues.filter(i => i.severity === 'error')
    const warnings = allIssues.filter(i => i.severity === 'warning')
    const infos = allIssues.filter(i => i.severity === 'info')

    // Print info items
    if (infos.length > 0) {
        console.log(`\n📋 Info (${infos.length}):`)
        for (const i of infos) {
            console.log(`   ℹ️  [${i.category}] ${i.message}`)
        }
    }

    // Print warnings
    if (warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${warnings.length}):`)
        for (const w of warnings) {
            console.log(`   ⚠️  [${w.category}] ${w.message}`)
            if (w.fix) console.log(`       Fix: ${w.fix}`)
        }
    }

    // Print errors
    if (errors.length > 0) {
        console.log(`\n❌ Errors (${errors.length}):`)
        for (const e of errors) {
            console.log(`   ❌ [${e.category}] ${e.message}`)
            if (e.file) console.log(`       File: ${e.file}`)
            if (e.fix) console.log(`       Fix: ${e.fix}`)
        }
    }

    // Summary
    console.log('\n' + '━'.repeat(50))
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ No drift detected — template in sync\n')
        process.exit(0)
    } else if (errors.length === 0) {
        console.log(`⚠️  ${warnings.length} warning(s) — review recommended\n`)
        process.exit(0) // Warnings don't block
    } else {
        console.log(`❌ ${errors.length} error(s), ${warnings.length} warning(s) — action required\n`)
        process.exit(1)
    }
}

run()
