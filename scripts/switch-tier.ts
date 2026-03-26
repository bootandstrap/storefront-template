#!/usr/bin/env tsx
/**
 * switch-tier — Dev-only tier switcher for governance debugging
 *
 * Instantly swaps feature flags & plan limits to simulate different tiers.
 * Uses the same governance seeding infrastructure as seed-governance.ts.
 *
 * Usage:
 *   npx tsx scripts/switch-tier.ts starter       # Minimal — 25 products, no POS
 *   npx tsx scripts/switch-tier.ts growth         # Mid — 500 products, basic POS
 *   npx tsx scripts/switch-tier.ts enterprise     # Max — all flags ON
 *   npx tsx scripts/switch-tier.ts pos-debug      # Enterprise + all POS flags ON
 *   npx tsx scripts/switch-tier.ts --list         # Show all presets
 *   npx tsx scripts/switch-tier.ts --current      # Show current tier from DB
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) process.env[key] = val
    }
}

// Load governance contract
const contract = require('../apps/storefront/src/lib/governance-contract.json') as {
    flags: { count: number; keys: string[] }
    limits: { count: number; keys: string[]; numeric_keys: string[]; metadata_keys: string[] }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
let createClient: typeof import('@supabase/supabase-js').createClient
try {
    createClient = require('@supabase/supabase-js').createClient
} catch {
    const storefrontPath = path.join(__dirname, '../apps/storefront/node_modules/@supabase/supabase-js')
    createClient = require(storefrontPath).createClient
}

// ── All flags ON baseline ──────────────────────────────────────
const ALL_FLAGS_ON: Record<string, boolean> = Object.fromEntries(
    contract.flags.keys.map(k => [k, k !== 'enable_maintenance_mode'])
)

// ── POS flag keys ──────────────────────────────────────────────
const POS_FLAGS = contract.flags.keys.filter(k => k.startsWith('enable_pos'))

// ── Tier Presets ───────────────────────────────────────────────

interface TierPreset {
    name: string
    description: string
    planName: string
    planTier: string
    flagOverrides: Record<string, boolean>
    limitOverrides: Record<string, unknown>
}

const TIER_PRESETS: Record<string, TierPreset> = {
    starter: {
        name: 'Starter',
        description: 'Minimal plan — basic ecommerce, no POS, no analytics, no chatbot',
        planName: 'starter',
        planTier: 'starter',
        flagOverrides: {
            // OFF: POS, analytics, chatbot, multi-lang/currency, CRM, promotions
            ...Object.fromEntries(POS_FLAGS.map(k => [k, false])),
            enable_analytics: false,
            enable_chatbot: false,
            enable_multi_language: false,
            enable_multi_currency: false,
            enable_crm: false,
            enable_crm_segmentation: false,
            enable_crm_export: false,
            enable_promotions: false,
            enable_product_badges: false,
            enable_product_comparisons: false,
            enable_related_products: false,
            enable_newsletter: false,
            enable_email_campaigns: false,
            enable_email_templates: false,
            enable_abandoned_cart_emails: false,
            enable_self_service_returns: false,
            enable_cms_pages: false,
            enable_wishlist: false,
            owner_advanced_modules_enabled: false,
            enable_traffic_expansion: false,
            enable_traffic_analytics: false,
            enable_traffic_autoscale: false,
        },
        limitOverrides: {
            max_products: 25,
            max_customers: 100,
            max_orders_month: 50,
            max_categories: 5,
            max_images_per_product: 3,
            max_cms_pages: 0,
            max_carousel_slides: 3,
            max_admin_users: 1,
            max_languages: 1,
            max_currencies: 1,
            max_badges: 0,
            max_newsletter_subscribers: 0,
            max_promotions_active: 0,
            max_payment_methods: 2,
            max_pos_payment_methods: 0,
            max_crm_contacts: 0,
            storage_limit_mb: 500,
            max_whatsapp_templates: 3,
            max_file_upload_mb: 5,
            max_email_sends_month: 100,
            max_custom_domains: 0,
            max_requests_day: 5000,
            max_reviews_per_product: 5,
            max_wishlist_items: 0,
            max_chatbot_messages_month: 0,
            plan_name: 'starter',
            plan_tier: 'starter',
        },
    },

    growth: {
        name: 'Growth',
        description: 'Mid-tier — POS basic, analytics, CMS, no thermal printer',
        planName: 'growth',
        planTier: 'growth',
        flagOverrides: {
            // POS basic only (no thermal, no kiosk, no shifts, no multi-device)
            enable_pos: true,
            enable_pos_keyboard_shortcuts: true,
            enable_pos_quick_sale: true,
            enable_pos_offline_cart: true,
            enable_pos_customer_search: true,
            enable_pos_line_discounts: true,
            // POS advanced OFF
            enable_pos_thermal_printer: false,
            enable_pos_kiosk: false,
            enable_pos_multi_device: false,
            enable_pos_shifts: false,
            // Other features
            enable_analytics: true,
            enable_chatbot: false,
            enable_multi_language: true,
            enable_multi_currency: false,
            enable_crm: true,
            enable_crm_segmentation: false,
            enable_crm_export: false,
            enable_traffic_expansion: false,
            enable_traffic_analytics: true,
            enable_traffic_autoscale: false,
        },
        limitOverrides: {
            max_products: 500,
            max_customers: 5000,
            max_orders_month: 2000,
            max_categories: 30,
            max_images_per_product: 8,
            max_cms_pages: 20,
            max_carousel_slides: 10,
            max_admin_users: 3,
            max_languages: 2,
            max_currencies: 1,
            max_badges: 20,
            max_newsletter_subscribers: 5000,
            max_promotions_active: 5,
            max_payment_methods: 3,
            max_pos_payment_methods: 2,
            max_crm_contacts: 5000,
            storage_limit_mb: 5000,
            max_whatsapp_templates: 10,
            max_file_upload_mb: 20,
            max_email_sends_month: 2000,
            max_custom_domains: 1,
            max_requests_day: 25000,
            max_reviews_per_product: 20,
            max_wishlist_items: 50,
            max_chatbot_messages_month: 0,
            plan_name: 'growth',
            plan_tier: 'growth',
        },
    },

    enterprise: {
        name: 'Enterprise',
        description: 'Full — all flags ON, max limits',
        planName: 'enterprise',
        planTier: 'enterprise',
        flagOverrides: {}, // All flags ON by default
        limitOverrides: {
            max_products: 10000,
            max_customers: 100000,
            max_orders_month: 50000,
            max_categories: 200,
            max_images_per_product: 20,
            max_cms_pages: 100,
            max_carousel_slides: 20,
            max_admin_users: 20,
            max_languages: 5,
            max_currencies: 5,
            max_badges: 100,
            max_newsletter_subscribers: 100000,
            max_promotions_active: 50,
            max_payment_methods: 5,
            max_pos_payment_methods: 5,
            max_crm_contacts: 100000,
            storage_limit_mb: 50000,
            max_whatsapp_templates: 50,
            max_file_upload_mb: 50,
            max_email_sends_month: 10000,
            max_custom_domains: 5,
            max_requests_day: 100000,
            max_reviews_per_product: 50,
            max_wishlist_items: 200,
            max_chatbot_messages_month: 10000,
            plan_name: 'enterprise',
            plan_tier: 'enterprise',
        },
    },

    'pos-debug': {
        name: 'POS Debug',
        description: 'Enterprise + all POS flags ON — for thermal printer & POS dev',
        planName: 'enterprise',
        planTier: 'enterprise',
        flagOverrides: {
            // Explicitly ensure ALL POS flags are on
            ...Object.fromEntries(POS_FLAGS.map(k => [k, true])),
        },
        limitOverrides: {
            max_products: 10000,
            max_customers: 100000,
            max_orders_month: 50000,
            max_categories: 200,
            max_pos_payment_methods: 5,
            plan_name: 'enterprise',
            plan_tier: 'enterprise',
        },
    },
}

// ── CLI ────────────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bg: '\x1b[48;5;234m',
}

function printBanner() {
    console.log()
    console.log(`${C.cyan}${C.bold}  ⚡ BootandStrap Tier Switcher${C.reset}`)
    console.log(`${C.dim}  ────────────────────────────────${C.reset}`)
    console.log()
}

function printPresets() {
    printBanner()
    console.log(`${C.bold}  Available presets:${C.reset}\n`)
    for (const [key, preset] of Object.entries(TIER_PRESETS)) {
        const flagsOff = Object.values({ ...ALL_FLAGS_ON, ...preset.flagOverrides })
            .filter(v => !v).length
        const flagsOn = contract.flags.count - flagsOff
        console.log(`  ${C.cyan}${C.bold}${key.padEnd(14)}${C.reset} ${preset.description}`)
        console.log(`  ${' '.repeat(14)} ${C.dim}Flags: ${flagsOn}/${contract.flags.count} ON${C.reset}`)
        console.log()
    }
}

async function showCurrent() {
    printBanner()
    const tenantId = process.env.TENANT_ID
    if (!tenantId) {
        console.log(`  ${C.red}✗ TENANT_ID not set in .env${C.reset}`)
        return
    }

    const supabaseUrl = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.GOVERNANCE_SUPABASE_SERVICE_ROLE_KEY || process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
        console.log(`  ${C.red}✗ Missing Supabase credentials${C.reset}`)
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: limits } = await supabase
        .from('plan_limits')
        .select('plan_name, plan_tier, max_products, max_orders_month, max_pos_payment_methods')
        .eq('tenant_id', tenantId)
        .single()

    const { data: flags } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

    if (!limits || !flags) {
        console.log(`  ${C.red}✗ No governance data found for tenant ${tenantId}${C.reset}`)
        return
    }

    const flagsOn = Object.entries(flags)
        .filter(([k, v]) => k.startsWith('enable_') && v === true).length
    const posFlags = Object.entries(flags)
        .filter(([k, v]) => k.startsWith('enable_pos') && v === true).length

    console.log(`  ${C.bold}Current Tier:${C.reset}  ${C.magenta}${limits.plan_name || 'unknown'}${C.reset} (${limits.plan_tier || '?'})`)
    console.log(`  ${C.bold}Products:${C.reset}      ${limits.max_products}`)
    console.log(`  ${C.bold}Orders/mo:${C.reset}     ${limits.max_orders_month}`)
    console.log(`  ${C.bold}Flags ON:${C.reset}      ${flagsOn}/${contract.flags.count}`)
    console.log(`  ${C.bold}POS Flags ON:${C.reset}  ${posFlags}/${POS_FLAGS.length}`)
    console.log(`  ${C.bold}POS Methods:${C.reset}   ${limits.max_pos_payment_methods}`)
    console.log()
}

async function switchTier(tierKey: string) {
    printBanner()
    const preset = TIER_PRESETS[tierKey]
    if (!preset) {
        console.log(`  ${C.red}✗ Unknown preset: "${tierKey}"${C.reset}`)
        console.log(`  ${C.dim}Run with --list to see available presets${C.reset}\n`)
        process.exit(1)
    }

    const tenantId = process.env.TENANT_ID
    if (!tenantId) {
        console.log(`  ${C.red}✗ TENANT_ID not set in .env${C.reset}`)
        console.log(`  ${C.dim}Run: npx tsx scripts/seed-governance.ts first${C.reset}\n`)
        process.exit(1)
    }

    const supabaseUrl = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.GOVERNANCE_SUPABASE_SERVICE_ROLE_KEY || process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
        console.log(`  ${C.red}✗ Missing Supabase credentials${C.reset}`)
        process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`  ${C.cyan}→${C.reset} Switching to ${C.bold}${preset.name}${C.reset} tier...`)
    console.log()

    // Merge flags: ALL_FLAGS_ON + preset overrides
    const flags = { ...ALL_FLAGS_ON, ...preset.flagOverrides }

    // Phase 1: Update feature_flags
    const { error: flagErr } = await supabase
        .from('feature_flags')
        .upsert({ tenant_id: tenantId, ...flags }, { onConflict: 'tenant_id' })

    if (flagErr) {
        console.log(`  ${C.red}✗ Feature flags error: ${flagErr.message}${C.reset}`)
        process.exit(1)
    }

    const flagsOn = Object.values(flags).filter(v => v === true).length
    const flagsOff = Object.values(flags).filter(v => v === false).length
    console.log(`  ${C.green}✓${C.reset} Feature flags: ${C.green}${flagsOn} ON${C.reset} / ${C.red}${flagsOff} OFF${C.reset}`)

    // Phase 2: Update plan_limits
    // Build full limits from contract defaults + preset overrides
    const fullLimits: Record<string, unknown> = {}
    for (const k of contract.limits.keys) {
        if (k === 'plan_name') {
            fullLimits[k] = preset.planName
        } else if (k === 'plan_tier') {
            fullLimits[k] = preset.planTier
        } else if (k === 'plan_expires_at') {
            fullLimits[k] = null
        } else {
            fullLimits[k] = (preset.limitOverrides as Record<string, unknown>)[k] ?? 9999
        }
    }

    const { error: limitErr } = await supabase
        .from('plan_limits')
        .upsert({ tenant_id: tenantId, ...fullLimits }, { onConflict: 'tenant_id' })

    if (limitErr) {
        console.log(`  ${C.red}✗ Plan limits error: ${limitErr.message}${C.reset}`)
        process.exit(1)
    }

    console.log(`  ${C.green}✓${C.reset} Plan limits: ${C.magenta}${preset.planName}${C.reset}`)

    // Show key diff
    console.log()
    console.log(`  ${C.bold}Key limits:${C.reset}`)
    const keyLimits = ['max_products', 'max_orders_month', 'max_customers', 'max_pos_payment_methods'] as const
    for (const k of keyLimits) {
        const val = fullLimits[k] ?? '—'
        console.log(`    ${k.padEnd(28)} ${C.cyan}${val}${C.reset}`)
    }

    // POS flags summary
    const posOn = POS_FLAGS.filter(k => flags[k] === true).length
    console.log()
    console.log(`  ${C.bold}POS:${C.reset} ${posOn}/${POS_FLAGS.length} flags ON`)

    // Realtime trigger hint
    console.log()
    console.log(`  ${C.green}${C.bold}✓ Done!${C.reset} Governance realtime triggers will auto-refresh storefront.`)
    console.log(`  ${C.dim}If cache is stale, restart the dev server.${C.reset}`)
    console.log()
}

// ── Main ───────────────────────────────────────────────────────

const arg = process.argv[2]

if (!arg || arg === '--help' || arg === '-h') {
    printBanner()
    console.log(`  ${C.bold}Usage:${C.reset}  npx tsx scripts/switch-tier.ts <preset>\n`)
    console.log(`  ${C.bold}Presets:${C.reset}  starter | growth | enterprise | pos-debug`)
    console.log(`  ${C.bold}Options:${C.reset}  --list     Show all presets`)
    console.log(`           --current  Show current tier from DB\n`)
} else if (arg === '--list') {
    printPresets()
} else if (arg === '--current') {
    showCurrent().catch(err => {
        console.error(`  ${C.red}✗ Error: ${err.message}${C.reset}`)
        process.exit(1)
    })
} else {
    switchTier(arg).catch(err => {
        console.error(`  ${C.red}✗ Error: ${err.message}${C.reset}`)
        process.exit(1)
    })
}
