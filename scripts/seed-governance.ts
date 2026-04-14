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

// ── Contract-Driven Flags ───────────────────────────────────
// ALL flags → true, except enable_maintenance_mode → false
const CONTRACT_FLAGS: Record<string, boolean> = Object.fromEntries(
    contract.flags.keys.map(k => [k, k !== 'enable_maintenance_mode'])
)

// ── Contract-Driven Limits (Enterprise Max) ─────────────────
// Explicit enterprise maximums for known keys
const ENTERPRISE_MAXIMUMS: Record<string, number> = {
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
}

// Derive from contract: any numeric key not in ENTERPRISE_MAXIMUMS → 9999
const CONTRACT_LIMITS: Record<string, unknown> = Object.fromEntries(
    contract.limits.keys.map(k => {
        if (k === 'plan_name') return [k, 'enterprise']
        if (k === 'plan_tier') return [k, 'enterprise']
        if (k === 'plan_expires_at') return [k, null]
        return [k, ENTERPRISE_MAXIMUMS[k] ?? 9999]
    })
)

// ── Template → Governance Mapping ───────────────────────────

interface GovernanceProfile {
    bundleName: string
    /** Flag overrides (merged on top of CONTRACT_FLAGS) */
    flagOverrides?: Record<string, boolean>
    /** Limit overrides (merged on top of CONTRACT_LIMITS) */
    limitOverrides?: Record<string, unknown>
    /** Store config */
    storeConfig: {
        business_name: string
        description: string
        contact_phone: string
        primary_color: string
        accent_color: string
        language: string
    }
}

const TEMPLATE_GOVERNANCE: Record<string, GovernanceProfile> = {
    'fresh-produce': {
        bundleName: 'full-commerce',
        storeConfig: {
            business_name: 'Frutas Frescas del Campo',
            description: 'Frutas y verduras frescas directas del campo a tu mesa.',
            contact_phone: '+34 612 345 678',
            primary_color: '#2D5016',
            accent_color: '#95d5b2',
            language: 'es',
        },
    },
    'fashion': {
        bundleName: 'web-ecommerce',
        flagOverrides: {
            enable_pos: false,
            enable_pos_offline_cart: false,
            enable_pos_multi_device: false,
            enable_pos_kiosk: false,
            enable_pos_keyboard_shortcuts: false,
            enable_pos_quick_sale: false,
            enable_pos_thermal_printer: false,
            enable_pos_line_discounts: false,
            enable_pos_customer_search: false,
            enable_pos_shifts: false,
            enable_chatbot: false,
        },
        limitOverrides: { max_chatbot_messages_month: 0, max_pos_payment_methods: 0 },
        storeConfig: {
            business_name: 'Urban Style Boutique',
            description: 'Moda urbana sostenible. Ropa, calzado y accesorios.',
            contact_phone: '+34 623 456 789',
            primary_color: '#1a1a2e',
            accent_color: '#e94560',
            language: 'es',
        },
    },
    'restaurant': {
        bundleName: 'demo-all-max',
        storeConfig: {
            business_name: 'La Cocina del Chef',
            description: 'Cocina tradicional española con toques de autor.',
            contact_phone: '+34 645 678 901',
            primary_color: '#8b0000',
            accent_color: '#ffd700',
            language: 'es',
        },
    },
    'campifruit': {
        bundleName: 'full-commerce',
        storeConfig: {
            business_name: 'Campifruit',
            description: 'Frutas frescas seleccionadas directamente del campo colombiano.',
            contact_phone: '+57 310 456 7890',
            primary_color: '#2E7D32',
            accent_color: '#66BB6A',
            language: 'es',
        },
        limitOverrides: {},
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
    const profile = TEMPLATE_GOVERNANCE[templateId]
    if (!profile) {
        log('⚠️', `No governance profile for template "${templateId}", using fresh-produce`)
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
                    p_name: profile.storeConfig.business_name,
                    p_slug: 'dev-local',
                    p_domain: 'localhost:3000',
                    p_plan: 'enterprise',
                    p_language: profile.storeConfig.language || 'es',
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

    log('🏛️', `Seeding governance for template: ${templateId} (bundle: ${profile.bundleName})`)
    log('📋', `Contract: ${contract.flags.count} flags, ${contract.limits.count} limits`)

    // ── Phase 1: Seed feature_flags (contract-driven, schema-drift resilient) ──
    const flags = {
        ...CONTRACT_FLAGS,
        ...(profile.flagOverrides || {}),
    }

    let flagsSeeded = false
    let flagsToInsert = { tenant_id: effectiveTenantId, ...flags }

    // Retry loop: if column doesn't exist in DB, remove it and retry
    for (let attempt = 0; attempt < 5; attempt++) {
        const { error: flagErr } = await supabase
            .from('feature_flags')
            .upsert(flagsToInsert, { onConflict: 'tenant_id' })

        if (!flagErr) {
            const insertedCount = Object.keys(flagsToInsert).length - 1 // minus tenant_id
            log('✅', `Feature flags seeded (${insertedCount}/${contract.flags.count} from contract)`)
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

    // ── Phase 2: Seed plan_limits (contract-driven) ──
    const limits = {
        ...CONTRACT_LIMITS,
        ...(profile.limitOverrides || {}),
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
            business_name: profile.storeConfig.business_name,
            whatsapp_number: profile.storeConfig.contact_phone,
            primary_color: profile.storeConfig.primary_color,
            accent_color: profile.storeConfig.accent_color,
            language: profile.storeConfig.language || 'es',
            footer_description: profile.storeConfig.description,
            color_preset: 'custom',
            theme_mode: 'light',
            active_languages: ['es'],
            active_currencies: templateId === 'campifruit' ? ['cop', 'usd'] : ['eur', 'usd'],
            default_currency: templateId === 'campifruit' ? 'COP' : 'EUR',
        }, { onConflict: 'tenant_id' })

    if (cfgErr) {
        log('❌', `Config error: ${cfgErr.message}`)
    } else {
        log('✅', `Config seeded (${profile.storeConfig.business_name})`)
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
