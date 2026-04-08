#!/usr/bin/env tsx
/**
 * Template Manager CLI
 *
 * Unified command-line interface for managing demo templates.
 * Admin-only tool — not exposed to tenant owners.
 *
 * Usage:
 *   npx tsx scripts/template-manager.ts list
 *   npx tsx scripts/template-manager.ts status
 *   npx tsx scripts/template-manager.ts apply <template-id> [--clean] [--skip-orders] [--skip-governance] [--verbose]
 *   npx tsx scripts/template-manager.ts reset [--hard]
 *
 * Examples:
 *   npx tsx scripts/template-manager.ts apply fresh-produce --clean --verbose
 *   npx tsx scripts/template-manager.ts apply fashion
 *   npx tsx scripts/template-manager.ts reset --hard
 */

import * as fs from 'fs'
import * as path from 'path'

// Zero-dependency env loader
function loadEnv(filePath: string) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        for (const line of content.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) continue
            const eqIdx = trimmed.indexOf('=')
            if (eqIdx === -1) continue
            const key = trimmed.slice(0, eqIdx).trim()
            let value = trimmed.slice(eqIdx + 1).trim()
            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1)
            }
            if (!process.env[key]) process.env[key] = value
        }
    } catch { /* file may not exist */ }
}

// Load env from storefront
loadEnv(path.resolve(__dirname, '../apps/storefront/.env.local'))
loadEnv(path.resolve(__dirname, '../apps/storefront/.env'))

import { applyTemplate, resetInstance, getStatus, listTemplates } from './template-engine'

const HELP = `
╔═══════════════════════════════════════════════════════════════╗
║              🛠️  TEMPLATE MANAGER — BootandStrap              ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  COMMANDS:                                                    ║
║                                                               ║
║  list                     List all available templates        ║
║  status                   Show current instance state          ║
║  apply <id> [flags]       Apply a template                     ║
║  reset [--hard]           Clean all demo data                  ║
║                                                               ║
║  FLAGS (for apply):                                            ║
║                                                               ║
║  --clean                  Deep clean before applying           ║
║  --skip-orders            Skip order generation                ║
║  --skip-governance        Skip Supabase governance seeding     ║
║  --hard                   Hard reset (also remove regions)     ║
║  --verbose                Verbose logging                      ║
║                                                               ║
║  EXAMPLES:                                                     ║
║                                                               ║
║  npx tsx scripts/template-manager.ts list                     ║
║  npx tsx scripts/template-manager.ts apply fresh-produce      ║
║  npx tsx scripts/template-manager.ts apply fashion --clean    ║
║  npx tsx scripts/template-manager.ts reset --hard             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`

async function main() {
    const args = process.argv.slice(2)
    const command = args[0]

    if (!command || command === '--help' || command === '-h') {
        console.log(HELP)
        process.exit(0)
    }

    const flags = new Set(args.slice(1).filter(a => a.startsWith('--')))
    const positional = args.slice(1).filter(a => !a.startsWith('--'))

    switch (command) {
        case 'list': {
            const templates = listTemplates()
            console.log('\n📋 Available Templates:\n')
            console.log('  ID                  Industry              Name')
            console.log('  ' + '─'.repeat(60))
            for (const t of templates) {
                console.log(`  ${t.emoji} ${t.id.padEnd(18)} ${t.industry.padEnd(20)} ${t.name}`)
            }
            console.log(`\n  Total: ${templates.length} templates\n`)
            break
        }

        case 'status': {
            console.log('\n🔍 Checking instance status...\n')
            const status = await getStatus()

            console.log('  Medusa:')
            console.log(`    Reachable:         ${status.medusaReachable ? '✅ Yes' : '❌ No'}`)
            if (status.medusaReachable) {
                console.log(`    Products:          ${status.productCount}`)
                console.log(`    Categories:        ${status.categoryCount}`)
                console.log(`    Customers:         ${status.customerCount}`)
                console.log(`    Orders:            ${status.orderCount}`)
                console.log(`    Draft Orders:      ${status.draftOrderCount}`)
                console.log(`    Regions:           ${status.regionCount}`)
                console.log(`    Sales Channel:     ${status.salesChannelId ?? '—'}`)
                console.log(`    Publishable Key:   ${status.publishableApiKey ? status.publishableApiKey.slice(0, 16) + '...' : '—'}`)
            }

            console.log('\n  Governance (Supabase):')
            console.log(`    Tenant ID:         ${status.governanceTenantId ?? '—'}`)
            console.log(`    Status:            ${status.governanceStatus ?? '—'}`)
            console.log()
            break
        }

        case 'apply': {
            const templateId = positional[0]
            if (!templateId) {
                console.error('❌ Missing template ID. Use: npx tsx scripts/template-manager.ts apply <template-id>')
                console.error('   Run "list" to see available templates.')
                process.exit(1)
            }

            const result = await applyTemplate(templateId, {
                clean: flags.has('--clean'),
                skipOrders: flags.has('--skip-orders'),
                skipGovernance: flags.has('--skip-governance'),
                hardReset: flags.has('--hard'),
                verbose: flags.has('--verbose'),
            })

            process.exit(result.success ? 0 : 1)
            break
        }

        case 'reset': {
            await resetInstance({
                hardReset: flags.has('--hard'),
                verbose: flags.has('--verbose'),
            })
            break
        }

        default:
            console.error(`❌ Unknown command: ${command}`)
            console.log(HELP)
            process.exit(1)
    }
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err)
    process.exit(1)
})
