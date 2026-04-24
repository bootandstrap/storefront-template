#!/usr/bin/env tsx
/**
 * Governance Seeder — Seeds feature_flags, plan_limits, and config
 * into governance Supabase for a local demo tenant.
 *
 * **Self-sufficient**: If TENANT_ID is missing or the tenant doesn't exist,
 * this script auto-provisions it via `provision_tenant` RPC and writes the
 * new ID back to `.env`.
 *
 * Flags and limits are derived from `governance-contract.json` — the SSOT.
 * All flags are set to `true` (except `enable_maintenance_mode` → `false`),
 * and all numeric limits are set to enterprise maximums.
 *
 * This fires the v3 realtime triggers → storefront auto-refreshes.
 *
 * Usage:
 *   import { seedGovernance } from './seed-governance'
 *   const tenantId = await seedGovernance(tenantId, 'fresh-produce')
 *
 * Standalone:
 *   npx tsx scripts/seed-governance.ts [template-id]
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
let createClient: typeof import('@supabase/supabase-js').createClient
try {
    // Try direct resolution (works if installed at root or hoisted)
    createClient = require('@supabase/supabase-js').createClient
} catch {
    // Fallback: resolve from storefront package (monorepo)
    const storefrontPath = require('path').join(__dirname, '../apps/storefront/node_modules/@supabase/supabase-js')
    createClient = require(storefrontPath).createClient
}
import * as fs from 'fs'
import * as path from 'path'

// Load governance contract — SSOT for all flags and limits
const contract = require('../apps/storefront/src/lib/governance-contract.json') as {
    flags: { count: number; keys: string[] }
    limits: { count: number; keys: string[]; numeric_keys: string[]; metadata_keys: string[] }
}

// Load .env
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) process.env[key] = val
    }
}

// ── Contract-Driven Baseline Flags ──────────────────────────
// All flags OFF by default — modules turn them ON via flag_effects
const BASELINE_FLAGS: Record<string, boolean> = Object.fromEntries(
    contract.flags.keys.map(k => [k, false])
)
// These are always ON regardless of modules (core platform features)
const ALWAYS_ON_FLAGS: string[] = [
    'enable_cookie_consent',
    'enable_whatsapp_contact',   // base web always has WhatsApp contact
    'enable_whatsapp_checkout',  // base web includes WhatsApp checkout
    'enable_guest_checkout',     // always allow guest checkout
    'owner_lite_enabled',        // owner panel always accessible
    'enable_owner_panel',        // owner panel always accessible
]

// ── Contract-Driven Limits (generous maximums for local demo) ──
const GENEROUS_LIMITS: Record<string, number> = {
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
    max_pos_kiosk_devices: 50,
    max_backups: 12,
    backup_frequency_hours: 6,
    max_automations: 50,
}

/**
 * Resolve flags from module subscriptions.
 * Takes a list of {moduleKey, tierKey} and applies flag_effects from the contract.
 */
function resolveModuleFlags(modules: Array<{ module: string; tier: string }>): Record<string, boolean> {
    const flags = { ...BASELINE_FLAGS }

    // Always-on flags
    for (const flag of ALWAYS_ON_FLAGS) {
        if (flag in flags) flags[flag] = true
    }

    // Apply each purchased module's flag_effects
    for (const { module: moduleKey, tier: tierKey } of modules) {
        const mod = (contract as any).modules.catalog.find((m: any) => m.key === moduleKey)
        if (!mod) continue
        const tier = mod.tiers.find((t: any) => t.key === tierKey)
        if (!tier?.flag_effects) continue

        for (const [flag, value] of Object.entries(tier.flag_effects)) {
            if (flag in flags) flags[flag] = value as boolean
        }
    }

    // Maintenance mode always OFF for demo tenants
    flags.enable_maintenance_mode = false

    return flags
}

// ── Industry Templates — Module-Driven ──────────────────────
// Each template represents a type of business and defines:
// 1. Which modules they purchase (with tier)
// 2. Store branding/config
// 3. Limit overrides (if any — defaults are generous for demo)
//
// Flags are AUTO-DERIVED from the contract flag_effects.
// This matches the BNS model: Web Base (1500 CHF) + Module add-ons.

interface IndustryTemplate {
    /** Human-readable name of the industry */
    industryName: string
    /** Modules this business would purchase, with their tier */
    modules: Array<{ module: string; tier: string }>
    /** Limit overrides for this industry (on top of GENEROUS_LIMITS) */
    limitOverrides?: Record<string, unknown>
    /** Store branding */
    storeConfig: {
        business_name: string
        description: string
        contact_phone: string
        primary_color: string
        accent_color: string
        language: string
    }
}

const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {

    // ── Frutería / Tienda de alimentos ──────────────────
    'fresh-produce': {
        industryName: 'Frutería / Alimentos frescos',
        modules: [
            { module: 'ecommerce', tier: 'pro' },        // Full ecommerce with reviews + wishlist
            { module: 'pos', tier: 'pro' },               // POS with kiosk + shortcuts for counter sales
            { module: 'sales_channels', tier: 'pro' },    // WhatsApp + online payments + COD
            { module: 'email_marketing', tier: 'basic' }, // Transactional emails
            { module: 'i18n', tier: 'basic' },            // Multi-language (tourism areas)
            { module: 'seo', tier: 'medio' },             // Basic SEO tools
        ],
        storeConfig: {
            business_name: 'Frutas Frescas del Campo',
            description: 'Frutas y verduras frescas directas del campo a tu mesa.',
            contact_phone: '+34 612 345 678',
            primary_color: '#2D5016',
            accent_color: '#95d5b2',
            language: 'es',
        },
    },

    // ── Campifruit (real client — Colombia) ─────────────
    'campifruit': {
        industryName: 'Frutería colombiana',
        modules: [
            { module: 'ecommerce', tier: 'pro' },
            { module: 'pos', tier: 'enterprise' },        // Full POS (shifts, reports, multi-device)
            { module: 'pos_kiosk', tier: 'basic' },        // Basic kiosk
            { module: 'sales_channels', tier: 'pro' },
            { module: 'email_marketing', tier: 'basic' },
            { module: 'crm', tier: 'basic' },              // Basic CRM for customer tracking
            { module: 'seo', tier: 'medio' },
        ],
        storeConfig: {
            business_name: 'Campifruit',
            description: 'Frutas frescas seleccionadas directamente del campo colombiano.',
            contact_phone: '+57 310 456 7890',
            primary_color: '#2E7D32',
            accent_color: '#66BB6A',
            language: 'es',
        },
    },

    // ── Tienda de moda online ───────────────────────────
    'fashion': {
        industryName: 'Tienda de moda online',
        modules: [
            { module: 'ecommerce', tier: 'enterprise' },  // Full ecommerce (comparisons, returns)
            { module: 'sales_channels', tier: 'enterprise' }, // All payment methods
            { module: 'email_marketing', tier: 'pro' },    // Abandoned cart, review requests
            { module: 'crm', tier: 'pro' },                // Segments + export
            { module: 'rrss', tier: 'instagram' },         // Instagram + social sharing
            { module: 'seo', tier: 'avanzado' },           // Full SEO suite
            { module: 'i18n', tier: 'pro' },               // Multi-language + multi-currency
        ],
        limitOverrides: {
            max_pos_payment_methods: 0,                    // No POS needed
            max_pos_kiosk_devices: 0,
        },
        storeConfig: {
            business_name: 'Urban Style Boutique',
            description: 'Moda urbana sostenible. Ropa, calzado y accesorios.',
            contact_phone: '+34 623 456 789',
            primary_color: '#1a1a2e',
            accent_color: '#e94560',
            language: 'es',
        },
    },

    // ── Restaurante / Hostelería ────────────────────────
    'restaurant': {
        industryName: 'Restaurante / Bar',
        modules: [
            { module: 'ecommerce', tier: 'basic' },       // Basic online ordering
            { module: 'pos', tier: 'enterprise' },         // Full POS with shifts, thermal printer
            { module: 'pos_kiosk', tier: 'enterprise' },   // Self-service kiosks
            { module: 'sales_channels', tier: 'pro' },     // WhatsApp + cash + card
            { module: 'chatbot', tier: 'pro' },            // AI chatbot for menu questions
            { module: 'automation', tier: 'basic' },       // Basic automations
            { module: 'email_marketing', tier: 'basic' },
            { module: 'rrss', tier: 'google_maps' },       // Google Maps listing
        ],
        storeConfig: {
            business_name: 'La Cocina del Chef',
            description: 'Cocina tradicional española con toques de autor.',
            contact_phone: '+34 645 678 901',
            primary_color: '#8b0000',
            accent_color: '#ffd700',
            language: 'es',
        },
    },

    // ── Peluquería / Salón de belleza ───────────────────
    'beauty': {
        industryName: 'Peluquería / Salón de belleza',
        modules: [
            { module: 'ecommerce', tier: 'basic' },       // Product catalog (sell products)
            { module: 'pos', tier: 'basic' },              // Basic POS for in-store
            { module: 'sales_channels', tier: 'basic' },   // WhatsApp bookings
            { module: 'crm', tier: 'basic' },              // Track client preferences
            { module: 'email_marketing', tier: 'basic' },
            { module: 'rrss', tier: 'instagram' },
        ],
        storeConfig: {
            business_name: 'Estilo & Belleza',
            description: 'Tu salón de belleza de confianza.',
            contact_phone: '+34 634 567 890',
            primary_color: '#e91e63',
            accent_color: '#f8bbd0',
            language: 'es',
        },
    },

    // ── Demo completo (todas las funciones al máximo) ───
    'demo-full': {
        industryName: 'Demo completo (todos los módulos)',
        modules: [
            { module: 'ecommerce', tier: 'enterprise' },
            { module: 'pos', tier: 'enterprise' },
            { module: 'pos_kiosk', tier: 'enterprise' },
            { module: 'sales_channels', tier: 'enterprise' },
            { module: 'email_marketing', tier: 'enterprise' },
            { module: 'crm', tier: 'pro' },
            { module: 'chatbot', tier: 'pro' },
            { module: 'automation', tier: 'pro' },
            { module: 'i18n', tier: 'pro' },
            { module: 'seo', tier: 'avanzado' },
            { module: 'rrss', tier: 'google_maps_instagram' },
            { module: 'auth_advanced', tier: 'enterprise' },
            { module: 'capacidad', tier: 'enterprise' },
        ],
        storeConfig: {
            business_name: 'BNS Demo Store',
            description: 'Demostración completa de todas las funcionalidades.',
            contact_phone: '+34 600 000 000',
            primary_color: '#1a237e',
            accent_color: '#7c4dff',
            language: 'es',
        },
    },
}


// ── .env Writer ─────────────────────────────────────────────

function writeToEnv(key: string, value: string): void {
    const envFilePath = path.resolve(__dirname, '../.env')

    if (!fs.existsSync(envFilePath)) {
        fs.writeFileSync(envFilePath, `${key}=${value}\n`, 'utf-8')
        return
    }

    const content = fs.readFileSync(envFilePath, 'utf-8')
    const lines = content.split('\n')
    let found = false

    const updated = lines.map(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith(`${key}=`) || trimmed.startsWith(`${key} =`)) {
            found = true
            return `${key}=${value}`
        }
        return line
    })

    if (!found) {
        updated.push(`${key}=${value}`)
    }

    fs.writeFileSync(envFilePath, updated.join('\n'), 'utf-8')
    // Also set in current process
    process.env[key] = value
}

// ── Main Seeder ─────────────────────────────────────────────

export async function seedGovernance(
    tenantId: string | undefined | null,
    templateId: string = 'fresh-produce',
    log: (icon: string, msg: string) => void = (i, m) => console.log(`  ${i} ${m}`)
): Promise<string | null> {
    const template = INDUSTRY_TEMPLATES[templateId]
    if (!template) {
        const available = Object.keys(INDUSTRY_TEMPLATES).join(', ')
        log('⚠️', `Unknown template "${templateId}". Available: ${available}`)
        log('ℹ️', 'Falling back to fresh-produce')
        return seedGovernance(tenantId, 'fresh-produce', log)
    }

    const supabaseUrl = process.env.GOVERNANCE_SUPABASE_URL
        || process.env.NEXT_PUBLIC_SUPABASE_URL
        || ''
    const supabaseKey = process.env.GOVERNANCE_SUPABASE_SERVICE_ROLE_KEY
        || process.env.GOVERNANCE_SUPABASE_SERVICE_KEY
        || process.env.SUPABASE_SERVICE_ROLE_KEY
        || ''

    if (!supabaseUrl || !supabaseKey) {
        log('⚠️', 'Missing Supabase credentials — skipping governance seeding')
        log('💡', 'Set GOVERNANCE_SUPABASE_URL + GOVERNANCE_SUPABASE_SERVICE_ROLE_KEY in .env')
        return null
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    let effectiveTenantId = tenantId || ''

    // ── Phase 0: Auto-provision tenant if needed ──
    if (effectiveTenantId) {
        // Check if tenant exists
        const { data: existing } = await supabase
            .from('tenants')
            .select('id, status')
            .eq('id', effectiveTenantId)
            .single()

        if (!existing) {
            log('🔍', `Tenant ${effectiveTenantId} not found in governance — will provision`)
            effectiveTenantId = '' // trigger provisioning below
        } else {
            log('✅', `Tenant ${effectiveTenantId} exists (status: ${existing.status})`)
        }
    }

    if (!effectiveTenantId) {
        log('🏗️', 'Auto-provisioning dev tenant via provision_tenant RPC...')
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: newTenantId, error: provisionErr } = await (supabase.rpc as any)(
                'provision_tenant',
                {
                    p_name: template.storeConfig.business_name,
                    p_slug: 'dev-local',
                    p_domain: 'localhost:3000',
                    p_plan: 'modular',
                    p_language: template.storeConfig.language || 'es',
                    p_country_prefix: '+34',
                    p_currency: templateId === 'campifruit' ? 'cop' : 'eur',
                    p_timezone: templateId === 'campifruit' ? 'America/Bogota' : 'Europe/Madrid',
                }
            ) as { data: string | null; error: { message: string } | null }

            if (provisionErr) {
                // If slug already exists, try to find the existing tenant
                if (provisionErr.message.includes('duplicate') || provisionErr.message.includes('unique')) {
                    log('ℹ️', 'dev-local tenant already exists — looking it up...')
                    const { data: existingTenant } = await supabase
                        .from('tenants')
                        .select('id')
                        .eq('slug', 'dev-local')
                        .single()

                    if (existingTenant?.id) {
                        effectiveTenantId = existingTenant.id
                        log('✅', `Found existing dev-local tenant: ${effectiveTenantId}`)
                    } else {
                        log('❌', `provision_tenant failed: ${provisionErr.message}`)
                        return null
                    }
                } else {
                    log('❌', `provision_tenant failed: ${provisionErr.message}`)
                    return null
                }
            } else if (newTenantId) {
                effectiveTenantId = newTenantId as string
                log('✅', `Tenant provisioned: ${effectiveTenantId}`)
            } else {
                log('❌', 'provision_tenant returned null')
                return null
            }

            // Write TENANT_ID to .env
            writeToEnv('TENANT_ID', effectiveTenantId)
            log('📝', `TENANT_ID=${effectiveTenantId} written to .env`)
        } catch (err) {
            log('❌', `Auto-provision failed: ${err instanceof Error ? err.message : err}`)
            return null
        }
    }

    // ── Phase 0b: Ensure tenant is active ──
    await supabase
        .from('tenants')
        .update({ status: 'active', deployment_status: 'active' })
        .eq('id', effectiveTenantId)

    // ── Log module configuration ──
    log('🏛️', `Industry template: ${template.industryName} (${templateId})`)
    log('📦', `Modules (${template.modules.length}):`)
    for (const m of template.modules) {
        log('  📌', `${m.module} → ${m.tier}`)
    }
    log('📋', `Contract: ${contract.flags.count} flags, ${contract.limits.count} limits`)

    // ── Phase 1: Resolve flags from modules (contract-driven) ──
    const flags = resolveModuleFlags(template.modules)
    const activeFlags = Object.entries(flags).filter(([, v]) => v === true).length

    let flagsSeeded = false
    let flagsToInsert = { tenant_id: effectiveTenantId, ...flags }

    // Retry loop: if column doesn't exist in DB, remove it and retry
    for (let attempt = 0; attempt < 5; attempt++) {
        const { error: flagErr } = await supabase
            .from('feature_flags')
            .upsert(flagsToInsert, { onConflict: 'tenant_id' })

        if (!flagErr) {
            const insertedCount = Object.keys(flagsToInsert).length - 1 // minus tenant_id
            log('✅', `Feature flags seeded (${insertedCount}/${contract.flags.count} — ${activeFlags} active)`)
            flagsSeeded = true
            break
        }

        // Schema drift: column doesn't exist in DB
        const missingCol = flagErr.message.match(/Could not find the '([^']+)' column/)?.[1]
        if (missingCol) {
            log('⚠️', `Schema drift: '${missingCol}' not in DB — removing from seed`)
            delete (flagsToInsert as Record<string, unknown>)[missingCol]
            continue
        }

        log('❌', `Feature flags error: ${flagErr.message}`)
        break
    }

    if (!flagsSeeded) {
        log('⚠️', 'Feature flags partially seeded (schema drift)')
    }

    // ── Phase 2: Seed plan_limits (generous + template overrides) ──
    const limits: Record<string, unknown> = Object.fromEntries(
        contract.limits.keys.map(k => {
            if (k === 'plan_name') return [k, 'modular']
            if (k === 'plan_tier') return [k, null]
            if (k === 'plan_expires_at') return [k, null]
            return [k, GENEROUS_LIMITS[k] ?? 9999]
        })
    )

    // Apply template overrides (e.g., fashion has max_pos_payment_methods: 0)
    if (template.limitOverrides) {
        Object.assign(limits, template.limitOverrides)
    }

    const { error: limitErr } = await supabase
        .from('plan_limits')
        .upsert({
            tenant_id: effectiveTenantId,
            ...limits,
        }, { onConflict: 'tenant_id' })

    if (limitErr) {
        log('❌', `Plan limits error: ${limitErr.message}`)
    } else {
        log('✅', `Plan limits seeded (${Object.keys(limits).length}/${contract.limits.count} from contract)`)
    }

    // ── Phase 3: Seed config ──
    const { error: cfgErr } = await supabase
        .from('config')
        .upsert({
            tenant_id: effectiveTenantId,
            business_name: template.storeConfig.business_name,
            whatsapp_number: template.storeConfig.contact_phone,
            primary_color: template.storeConfig.primary_color,
            accent_color: template.storeConfig.accent_color,
            language: template.storeConfig.language || 'es',
            footer_description: template.storeConfig.description,
            color_preset: 'custom',
            theme_mode: 'light',
            active_languages: ['es'],
            active_currencies: templateId === 'campifruit' ? ['cop', 'usd'] : ['eur', 'usd'],
            default_currency: templateId === 'campifruit' ? 'COP' : 'EUR',
        }, { onConflict: 'tenant_id' })

    if (cfgErr) {
        log('❌', `Config error: ${cfgErr.message}`)
    } else {
        log('✅', `Config seeded (${template.storeConfig.business_name})`)
    }

    // ── Phase 4: Post-verification ──
    const { data: verifyFlags } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .single()

    if (verifyFlags) {
        const flagCount = Object.keys(verifyFlags).filter(k => k !== 'id' && k !== 'tenant_id' && k !== 'created_at' && k !== 'updated_at').length
        if (flagCount < contract.flags.count) {
            log('⚠️', `DB has ${flagCount} flag columns but contract expects ${contract.flags.count} — some flags may be missing from the DB schema`)
        }
    }

    log('🔄', 'Governance writes fired → v3 realtime triggers will propagate to storefront')
    return effectiveTenantId
}

// Allow standalone execution
if (require.main === module) {
    const tenantId = process.env.TENANT_ID || ''
    const templateId = process.argv[2] || 'fresh-produce'

    console.log('')
    console.log('════════════════════════════════════════════════')
    console.log('  🏛️  GOVERNANCE SEEDER — Module-Driven')
    console.log('════════════════════════════════════════════════')
    console.log(`  Available templates:`)
    for (const [key, tmpl] of Object.entries(INDUSTRY_TEMPLATES)) {
        const modCount = tmpl.modules.length
        const modNames = tmpl.modules.map(m => `${m.module}:${m.tier}`).join(', ')
        console.log(`    ${key === templateId ? '→' : ' '} ${key}: ${tmpl.industryName} (${modCount} modules: ${modNames})`)
    }
    console.log('')

    seedGovernance(tenantId || null, templateId).then((id) => {
        if (id) {
            console.log(`\n✅ Governance seeding complete (tenant: ${id})`)
        } else {
            console.log('\n❌ Governance seeding failed')
            process.exit(1)
        }
    }).catch(err => {
        console.error('❌ Failed:', err)
        process.exit(1)
    })
}
