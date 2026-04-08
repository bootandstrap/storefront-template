/**
 * Template Engine — Orchestrator
 *
 * Central entry point. Composes cleaners and seeders
 * into a single idempotent workflow.
 *
 * Usage:
 *   import { applyTemplate, resetInstance, getStatus } from './template-engine'
 */

import { MedusaClient } from './medusa-client'
import { deepClean } from './cleaners'
import { seedInfra } from './seeders/seed-infra'
import { seedCatalog } from './seeders/seed-catalog'
import { seedCustomers } from './seeders/seed-customers'
import { seedOrders } from './seeders/seed-orders'
import { seedGovernance } from './seeders/seed-governance'
import { getTemplateRegistry } from './templates'
import type {
    ApplyOptions,
    ApplyResult,
    InstanceStatus,
    LogFn,
    DEFAULT_APPLY_OPTIONS,
} from './types'

const MEDUSA_URL = process.env.MEDUSA_BACKEND_URL || process.env.MEDUSA_ADMIN_URL || 'http://localhost:9000'
const MEDUSA_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusajs.com'
const MEDUSA_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || 'supersecret'

function createLog(verbose: boolean): LogFn {
    return (icon: string, msg: string) => {
        if (verbose || !msg.includes('⏭️')) {
            console.log(`  ${icon} ${msg}`)
        }
    }
}

// ── Apply Template ───────────────────────────────────────────

export async function applyTemplate(
    templateId: string,
    options: Partial<ApplyOptions> = {}
): Promise<ApplyResult> {
    const startTime = Date.now()
    const errors: string[] = []

    const opts: ApplyOptions = {
        clean: options.clean ?? true,
        skipOrders: options.skipOrders ?? false,
        skipGovernance: options.skipGovernance ?? false,
        hardReset: options.hardReset ?? false,
        verbose: options.verbose ?? false,
    }

    const log = createLog(opts.verbose)

    // Resolve template
    const registry = getTemplateRegistry()
    const template = registry.get(templateId)
    if (!template) {
        const available = Array.from(registry.keys()).join(', ')
        throw new Error(`Template "${templateId}" not found. Available: ${available}`)
    }

    console.log(`\n🚀 Applying template: ${template.emoji} ${template.name} (${template.industry})\n`)

    // ── 1) Connect to Medusa ──
    const client = new MedusaClient(MEDUSA_URL, log)
    try {
        await client.login(MEDUSA_EMAIL, MEDUSA_PASSWORD)
        log('✅', 'Medusa authenticated')
    } catch (err) {
        errors.push(`Medusa login failed: ${err instanceof Error ? err.message : err}`)
        console.error(`\n❌ Cannot connect to Medusa at ${MEDUSA_URL}`)
        return {
            success: false,
            templateId,
            stats: { categoriesCreated: 0, productsCreated: 0, customersCreated: 0, ordersCreated: 0, regionsCreated: 0, governanceSeeded: false },
            errors,
            elapsedMs: Date.now() - startTime,
        }
    }

    // ── 2) Clean ──
    if (opts.clean) {
        try {
            await deepClean(client, log, { hardReset: opts.hardReset })
        } catch (err) {
            errors.push(`Clean failed: ${err instanceof Error ? err.message : err}`)
            log('⚠️', `Clean had issues but continuing...`)
        }
    }

    // ── 3) Infra ──
    let regionId = ''
    let salesChannelId = ''
    let regionsCreated = 0

    try {
        const infra = await seedInfra(client, template, log)
        regionId = infra.regionId
        salesChannelId = infra.salesChannelId
        regionsCreated = 1
    } catch (err) {
        errors.push(`Infra seed failed: ${err instanceof Error ? err.message : err}`)
        log('❌', `Infra seed failed: ${err instanceof Error ? err.message : err}`)
    }

    // ── 4) Governance ──
    let governanceSeeded = false
    if (!opts.skipGovernance) {
        try {
            const govResult = await seedGovernance(template, log)
            governanceSeeded = govResult.success
        } catch (err) {
            errors.push(`Governance seed failed: ${err instanceof Error ? err.message : err}`)
            log('⚠️', `Governance seed failed: ${err instanceof Error ? err.message : err}`)
        }
    }

    // ── 5) Catalog ──
    let categoriesCreated = 0
    let productsCreated = 0
    let variantIds: string[] = []

    try {
        const catalog = await seedCatalog(client, template, salesChannelId, log)
        categoriesCreated = catalog.categoriesCreated
        productsCreated = catalog.productsCreated
        variantIds = catalog.variantIds
    } catch (err) {
        errors.push(`Catalog seed failed: ${err instanceof Error ? err.message : err}`)
        log('❌', `Catalog seed failed: ${err instanceof Error ? err.message : err}`)
    }

    // ── 6) Customers ──
    let customersCreated = 0
    let customerIds: string[] = []

    try {
        const customers = await seedCustomers(client, template, log)
        customersCreated = customers.customersCreated
        customerIds = customers.customerIds
    } catch (err) {
        errors.push(`Customers seed failed: ${err instanceof Error ? err.message : err}`)
        log('⚠️', `Customers seed failed: ${err instanceof Error ? err.message : err}`)
    }

    // ── 7) Orders ──
    let ordersCreated = 0

    if (!opts.skipOrders && regionId && customerIds.length && variantIds.length) {
        try {
            const orders = await seedOrders(client, template, regionId, customerIds, variantIds, log)
            ordersCreated = orders.ordersCreated
        } catch (err) {
            errors.push(`Orders seed failed: ${err instanceof Error ? err.message : err}`)
            log('⚠️', `Orders seed failed: ${err instanceof Error ? err.message : err}`)
        }
    } else if (!opts.skipOrders) {
        log('⚠️', 'Skipping orders: missing region, customers, or variants')
    }

    // ── 8) Summary ──
    const elapsed = Date.now() - startTime
    const success = errors.length === 0

    console.log('\n' + '═'.repeat(50))
    console.log(`${success ? '✅' : '⚠️'} Template "${template.name}" applied in ${(elapsed / 1000).toFixed(1)}s`)
    console.log(`   📦 ${categoriesCreated} categories, ${productsCreated} products`)
    console.log(`   👥 ${customersCreated} customers`)
    console.log(`   📋 ${ordersCreated} orders`)
    console.log(`   🏛️ Governance: ${governanceSeeded ? 'OK' : 'skipped/failed'}`)
    if (errors.length) {
        console.log(`   ⚠️  ${errors.length} errors:`)
        errors.forEach(e => console.log(`      - ${e}`))
    }
    console.log('═'.repeat(50) + '\n')

    return {
        success,
        templateId,
        stats: {
            categoriesCreated,
            productsCreated,
            customersCreated,
            ordersCreated,
            regionsCreated,
            governanceSeeded,
        },
        errors,
        elapsedMs: elapsed,
    }
}

// ── Reset Instance ───────────────────────────────────────────

export async function resetInstance(options: { hardReset?: boolean; verbose?: boolean } = {}): Promise<void> {
    const log = createLog(options.verbose ?? false)

    console.log('\n🔄 Resetting instance...\n')

    const client = new MedusaClient(MEDUSA_URL, log)
    await client.login(MEDUSA_EMAIL, MEDUSA_PASSWORD)
    log('✅', 'Medusa authenticated')

    await deepClean(client, log, { hardReset: options.hardReset })

    console.log('\n✅ Instance reset complete\n')
}

// ── Get Status ───────────────────────────────────────────────

export async function getStatus(): Promise<InstanceStatus> {
    const log: LogFn = () => {} // silent

    const status: InstanceStatus = {
        medusaReachable: false,
        productCount: 0,
        categoryCount: 0,
        customerCount: 0,
        orderCount: 0,
        draftOrderCount: 0,
        regionCount: 0,
        salesChannelId: null,
        publishableApiKey: null,
        governanceTenantId: null,
        governanceStatus: null,
    }

    try {
        const client = new MedusaClient(MEDUSA_URL, log)
        await client.login(MEDUSA_EMAIL, MEDUSA_PASSWORD)
        status.medusaReachable = true

        const [products, categories, customers, orders, draftOrders, regions, channels] = await Promise.all([
            client.getProducts(1),
            client.getCategories(1),
            client.getCustomers(1),
            client.getOrders(1),
            client.getDraftOrders(1),
            client.getRegions(),
            client.getSalesChannels(),
        ])

        // Get counts via limit=0
        const [prodCount, catCount, custCount, ordCount] = await Promise.all([
            client.request<{ count: number }>('/admin/products?limit=0&fields=id'),
            client.request<{ count: number }>('/admin/product-categories?limit=0&fields=id'),
            client.request<{ count: number }>('/admin/customers?limit=0&fields=id'),
            client.request<{ count: number }>('/admin/orders?limit=0&fields=id'),
        ])

        status.productCount = prodCount.count ?? 0
        status.categoryCount = catCount.count ?? 0
        status.customerCount = custCount.count ?? 0
        status.orderCount = ordCount.count ?? 0
        status.draftOrderCount = draftOrders.length
        status.regionCount = regions.length
        status.salesChannelId = channels[0]?.id ?? null

        // API keys
        try {
            const apiRes = await client.request<{ api_keys: { token: string; type: string }[] }>('/admin/api-keys?type=publishable')
            status.publishableApiKey = apiRes.api_keys?.find(k => k.type === 'publishable')?.token ?? null
        } catch { /* ignore */ }
    } catch {
        // Medusa not reachable
    }

    // Governance status
    try {
        const { createClient } = await import('@supabase/supabase-js')
        const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
        const tenantId = process.env.LOCAL_TENANT_ID || process.env.TENANT_ID

        if (url && key && tenantId) {
            const sb = createClient(url, key, {
                auth: { autoRefreshToken: false, persistSession: false },
            })
            status.governanceTenantId = tenantId

            const { data: config } = await sb.from('config').select('business_name').eq('tenant_id', tenantId).maybeSingle()
            const { data: flags } = await sb.from('feature_flags').select('flag_name, is_enabled').eq('tenant_id', tenantId)
            const { data: limits } = await sb.from('plan_limits').select('plan_name').eq('tenant_id', tenantId).maybeSingle()

            const enabledFlags = flags?.filter(f => f.is_enabled)?.length ?? 0
            status.governanceStatus = config
                ? `${config.business_name} | ${enabledFlags} flags | ${limits?.plan_name ?? 'no plan'}`
                : 'No config found'
        }
    } catch { /* ignore */ }

    return status
}

// ── List Templates ───────────────────────────────────────────

export function listTemplates(): Array<{ id: string; name: string; industry: string; emoji: string; description: string }> {
    const registry = getTemplateRegistry()
    return Array.from(registry.values()).map(t => ({
        id: t.id,
        name: t.name,
        industry: t.industry,
        emoji: t.emoji,
        description: t.description,
    }))
}
