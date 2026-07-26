import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '../..')

const criticalScriptPaths = [
    'scripts/e2e-storefront-drill.ts',
    'scripts/governance-check.ts',
    'scripts/patch-product-images.ts',
    'scripts/seed-campifruit-images.ts',
    'scripts/seed-demo.ts',
    'scripts/seed-governance.ts',
    'scripts/setup-local-dev.ts',
    'scripts/switch-tier.ts',
    'scripts/template-engine/seeders/seed-governance.ts',
    'scripts/template-engine/seeders/seed-orders.ts',
    'scripts/template-drift-check.ts',
    'scripts/seed-content.ts',
    'scripts/template-manager.ts',
    'scripts/upload-product-images.mjs',
    'scripts/e2e-provision-drill.ts',
    'scripts/template-engine/seeders/seed-infra.ts',
] as const

const forbiddenLiveMutationPatterns = [
    /sentrux\s+gate\s+--save\s+\./i,
    /tax\.registrations\.create\s*\(/i,
    /paymentIntents\.create\s*\(/i,
    /refunds\.create\s*\(/i,
    /charges\.create\s*\(/i,
]

const secretValuePrintPatterns = [
    /console\.(log|info|warn|error)\([^)]*process\.env\.[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|SERVICE_ROLE|PRIVATE|WEBHOOK)[A-Z0-9_]*/i,
    /console\.(log|info|warn|error)\([^)]*\$\{[^}]*process\.env\.[^}]*(SECRET|TOKEN|PASSWORD|SERVICE_ROLE|PRIVATE|WEBHOOK)[^}]*}/i,
]

function readScript(relativePath: string) {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('critical script safety contract', () => {
    it.each(criticalScriptPaths)('%s exists and is covered by the critical script inventory', (relativePath) => {
        expect(readScript(relativePath).trim().length).toBeGreaterThan(0)
    })

    it.each(criticalScriptPaths)('%s does not perform prohibited live/commercial mutations', (relativePath) => {
        const source = readScript(relativePath)

        for (const pattern of forbiddenLiveMutationPatterns) {
            expect(source).not.toMatch(pattern)
        }
    })

    it.each(criticalScriptPaths)('%s does not print secret environment values', (relativePath) => {
        const source = readScript(relativePath)

        for (const pattern of secretValuePrintPatterns) {
            expect(source.split('\n').some(line => pattern.test(line))).toBe(false)
        }
    })

    it('redacts publishable key diagnostics when scripts expose operator status', () => {
        const scriptsWithPublishableKeyStatus = [
            'scripts/e2e-storefront-drill.ts',
            'scripts/template-manager.ts',
        ]

        for (const relativePath of scriptsWithPublishableKeyStatus) {
            const source = readScript(relativePath)
            const publishableKeyLines = source
                .split('\n')
                .filter(line => /publishable[_ ]?key|PUBLISHABLE_KEY/i.test(line))
                .filter(line => /console\.(log|info|warn|error)/.test(line))

            expect(publishableKeyLines.length).toBeGreaterThan(0)
            expect(publishableKeyLines.every(line => /slice\(|\.\.\.|redact|mask/i.test(line))).toBe(true)
        }
    })
})
