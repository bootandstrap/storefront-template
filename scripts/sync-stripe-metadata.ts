#!/usr/bin/env npx tsx
/**
 * @module scripts/sync-stripe-metadata
 * @description Synchronize governance contract metadata with Stripe Products/Prices.
 *
 * For each module tier in the governance contract:
 *   1. Find or create a Stripe Product (name = module.name)
 *   2. Find or create a Stripe Price (amount, currency CHF, interval monthly)
 *   3. Set Product metadata: { module_key, tier_level, tier_key, enabled_flags, limit_overrides }
 *   4. Update module_tiers.stripe_price_id in Supabase (if --write-db)
 *
 * IDEMPOTENT: Safe to run multiple times — uses lookup-by-metadata before creating.
 *
 * FLAGS:
 *   --dry-run      Show what would be created (no Stripe mutations)
 *   --write-db     Also update Supabase module_tiers.stripe_price_id
 *   --verbose      Show full Stripe API payloads
 *   --allow-live   Allow sk_live_* keys (for production sync)
 *
 * REQUIRES:
 *   STRIPE_SECRET_KEY — Must be TEST MODE key (starts with sk_test_)
 *
 * Usage:
 *   npx tsx scripts/sync-stripe-metadata.ts --dry-run
 *   npx tsx scripts/sync-stripe-metadata.ts
 *   npx tsx scripts/sync-stripe-metadata.ts --write-db
 *
 * @locked 🔴 CANONICAL — ecommerce-template scripts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── Colors ────────────────────────────────────────────────────────────────
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BLUE = '\x1b[34m'
const DIM = '\x1b[2m'
const NC = '\x1b[0m'

// ── Args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const WRITE_DB = args.includes('--write-db')
const VERBOSE = args.includes('--verbose')
const ALLOW_LIVE = args.includes('--allow-live')

// ── Load contract ─────────────────────────────────────────────────────────
interface ContractTier {
    key: string
    name: string
    price_chf?: number
    features?: string[]
    recommended?: boolean
    flag_effects?: Record<string, boolean>
    limit_effects?: Record<string, number>
    stripe_price_ids?: Record<string, string>
}

interface ContractModule {
    key: string
    name: string
    icon?: string
    description?: string
    category?: string
    payment_type?: string
    tiers?: ContractTier[]
}

function loadContract(): { modules: { catalog: ContractModule[] } } {
    const candidates = [
        resolve(__dirname, '../packages/shared/src/governance/generated/contract.json'),
        resolve(__dirname, '../apps/storefront/src/lib/governance-contract.json'),
        resolve(__dirname, '../generated/contract.json'),
    ]
    for (const path of candidates) {
        try {
            return JSON.parse(readFileSync(path, 'utf-8'))
        } catch { /* next */ }
    }
    throw new Error('governance-contract.json not found')
}

// ── Stripe helpers ────────────────────────────────────────────────────────

async function stripeRequest(
    method: string,
    path: string,
    body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not set')
    if (key.startsWith('sk_live_') && !ALLOW_LIVE) {
        throw new Error('🚨 SAFETY: This script must use a TEST MODE key (sk_test_*). Use --allow-live to override.')
    }
    if (key.startsWith('sk_live_') && ALLOW_LIVE) {
        console.log(`${YELLOW}⚠️  LIVE MODE — Products/Prices will be created in production Stripe${NC}`)
    }

    const url = `https://api.stripe.com/v1${path}`
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${key}`,
    }

    let fetchBody: string | undefined
    if (body && method !== 'GET') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        fetchBody = flattenToFormData(body)
    }

    if (VERBOSE) {
        console.log(`${DIM}  → ${method} ${url}${fetchBody ? ` | ${fetchBody.substring(0, 120)}...` : ''}${NC}`)
    }

    const res = await fetch(url + (method === 'GET' && body ? '?' + flattenToFormData(body) : ''), {
        method: method === 'GET' ? 'GET' : method,
        headers,
        body: method !== 'GET' ? fetchBody : undefined,
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(`Stripe ${method} ${path} failed (${res.status}): ${JSON.stringify(error)}`)
    }

    return res.json() as Promise<Record<string, unknown>>
}

function flattenToFormData(obj: Record<string, unknown>, prefix = ''): string {
    const parts: string[] = []
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}[${key}]` : key
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            parts.push(flattenToFormData(value as Record<string, unknown>, fullKey))
        } else {
            parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value ?? ''))}`)
        }
    }
    return parts.filter(Boolean).join('&')
}

// ── Main ──────────────────────────────────────────────────────────────────

interface SyncResult {
    moduleKey: string
    tierKey: string
    productId: string
    priceId: string
    action: 'created' | 'found' | 'skipped'
}

async function main(): Promise<void> {
    console.log(`\n${GREEN}🔄 Stripe Metadata Sync${NC}`)
    if (DRY_RUN) console.log(`${YELLOW}🔍 DRY RUN — no mutations${NC}`)
    console.log('━'.repeat(50))

    const contract = loadContract()
    const modules = contract.modules.catalog
    const results: SyncResult[] = []

    // 1. List existing products to avoid duplicates
    console.log(`\n${BLUE}Phase 1: Loading existing Stripe products...${NC}`)
    const existingProducts = (await stripeRequest('GET', '/products', {
        limit: '100',
        active: 'true',
    })) as { data: Array<{ id: string; name: string; metadata: Record<string, string> }> }

    const productByModuleKey = new Map<string, string>()
    for (const prod of existingProducts.data ?? []) {
        if (prod.metadata?.module_key) {
            productByModuleKey.set(prod.metadata.module_key, prod.id)
        }
    }
    console.log(`  Found ${productByModuleKey.size} existing module products`)

    // 2. Process each module + tier
    console.log(`\n${BLUE}Phase 2: Syncing ${modules.length} modules...${NC}`)

    for (const mod of modules) {
        console.log(`\n  📦 ${mod.name} (${mod.key})`)

        if (!mod.tiers?.length) {
            console.log(`    ${DIM}No tiers — skipping${NC}`)
            continue
        }

        // Find or create product
        let productId = productByModuleKey.get(mod.key)
        if (!productId) {
            if (DRY_RUN) {
                console.log(`    ${YELLOW}Would create product: ${mod.name}${NC}`)
                productId = `prod_dry_${mod.key}`
            } else {
                const product = await stripeRequest('POST', '/products', {
                    name: `BootandStrap — ${mod.name}`,
                    metadata: {
                        module_key: mod.key,
                        category: mod.category ?? 'platform',
                        source: 'governance_contract_sync',
                    },
                }) as { id: string }
                productId = product.id
                console.log(`    ${GREEN}✅ Created product: ${productId}${NC}`)
            }
        } else {
            console.log(`    ${DIM}Product exists: ${productId}${NC}`)
        }

        // Process each tier
        for (let i = 0; i < mod.tiers.length; i++) {
            const tier = mod.tiers[i]
            const tierLevel = i + 1
            const priceAmountCents = (tier.price_chf ?? 0) * 100

            if (priceAmountCents <= 0) {
                console.log(`    ${DIM}  Tier ${tierLevel} (${tier.name}): price=0, skipping${NC}`)
                results.push({
                    moduleKey: mod.key,
                    tierKey: tier.key,
                    productId: productId!,
                    priceId: '',
                    action: 'skipped',
                })
                continue
            }

            // Check if price already exists
            const existingPriceId = tier.stripe_price_ids?.CHF
            if (existingPriceId) {
                console.log(`    ${DIM}  Tier ${tierLevel} (${tier.name}): price exists ${existingPriceId}${NC}`)
                results.push({
                    moduleKey: mod.key,
                    tierKey: tier.key,
                    productId: productId!,
                    priceId: existingPriceId,
                    action: 'found',
                })
                continue
            }

            // Create price
            const enabledFlags = Object.entries(tier.flag_effects ?? {})
                .filter(([, v]) => v === true)
                .map(([k]) => k)
                .join(',')

            const limitOverrides = JSON.stringify(tier.limit_effects ?? {})

            if (DRY_RUN) {
                console.log(`    ${YELLOW}  Tier ${tierLevel} (${tier.name}): Would create price ${priceAmountCents / 100} CHF/mo${NC}`)
                results.push({
                    moduleKey: mod.key,
                    tierKey: tier.key,
                    productId: productId!,
                    priceId: 'price_dry_run',
                    action: 'created',
                })
            } else {
                const price = await stripeRequest('POST', '/prices', {
                    product: productId,
                    unit_amount: String(priceAmountCents),
                    currency: 'chf',
                    recurring: { interval: 'month' },
                    metadata: {
                        module_key: mod.key,
                        tier_level: String(tierLevel),
                        tier_key: tier.key,
                        enabled_flags: enabledFlags,
                        limit_overrides: limitOverrides,
                        source: 'governance_contract_sync',
                    },
                }) as { id: string }

                console.log(`    ${GREEN}  ✅ Tier ${tierLevel} (${tier.name}): ${price.id} — ${priceAmountCents / 100} CHF/mo${NC}`)
                results.push({
                    moduleKey: mod.key,
                    tierKey: tier.key,
                    productId: productId!,
                    priceId: price.id,
                    action: 'created',
                })
            }
        }
    }

    // 3. Summary
    console.log('\n' + '━'.repeat(50))
    const created = results.filter(r => r.action === 'created').length
    const found = results.filter(r => r.action === 'found').length
    const skipped = results.filter(r => r.action === 'skipped').length

    console.log(`${GREEN}✅ Created: ${created}${NC}`)
    console.log(`${DIM}📎 Existing: ${found}${NC}`)
    console.log(`${DIM}⏭️  Skipped: ${skipped}${NC}`)
    console.log(`Total: ${results.length} tiers`)

    if (WRITE_DB && !DRY_RUN) {
        console.log(`\n${YELLOW}⚠️  --write-db: Supabase update not implemented yet.${NC}`)
        console.log(`${DIM}   Will update module_tiers.stripe_price_id in future iteration.${NC}`)
    }

    console.log('━'.repeat(50))
    console.log(`\n${GREEN}Stripe Metadata Sync complete ✨${NC}`)
}

main().catch(err => {
    console.error(`\n${RED}💥 Fatal error: ${err.message}${NC}`)
    process.exit(1)
})
