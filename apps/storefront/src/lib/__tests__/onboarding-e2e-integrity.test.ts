/**
 * onboarding-e2e-integrity.test.ts
 *
 * Programmatic E2E verification of the SOTA onboarding pipeline.
 * Validates the full chain:
 *   1. Governance contract → buildModuleInfoList → ModuleInfo[]
 *   2. All i18n keys used by wizard steps exist in ES + EN dictionaries
 *   3. Server action signatures match what components import
 *   4. Component file existence and export structure
 *   5. Layout integration (passes correct props)
 *   6. Legacy cleanup (deleted files don't exist, no dead imports)
 *   7. Onboarding config key whitelist coverage
 *
 * Run: npx jest onboarding-e2e-integrity --no-cache
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Paths — __dirname = src/lib/__tests__/
// ---------------------------------------------------------------------------

const LIB = join(__dirname, '..') // src/lib/
const SRC = join(LIB, '..')       // src/
const STOREFRONT = join(SRC, '..') // apps/storefront/
const COMPONENTS = join(SRC, 'components', 'panel')
const ONBOARDING = join(COMPONENTS, 'onboarding')
const ACTIONS = join(SRC, 'app', '[lang]', '(panel)', 'panel', 'actions.ts')
const LAYOUT = join(SRC, 'app', '[lang]', '(panel)', 'layout.tsx')
const GOVERNANCE_LIB = join(LIB, 'governance')
const BUILD_MODULE_INFO = join(GOVERNANCE_LIB, 'build-module-info.ts')
const DICT_ES = join(LIB, 'i18n', 'dictionaries', 'es.json')
const DICT_EN = join(LIB, 'i18n', 'dictionaries', 'en.json')

// Governance contract — lives in src/lib/
const CONTRACT_PATH = join(LIB, 'governance-contract.json')

function loadJSON(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function loadContract(): Record<string, unknown> {
  if (existsSync(CONTRACT_PATH)) return loadJSON(CONTRACT_PATH)
  throw new Error(`governance-contract.json not found at ${CONTRACT_PATH}`)
}

// ---------------------------------------------------------------------------
// 1. Component file existence
// ---------------------------------------------------------------------------

describe('Onboarding component files', () => {
  const REQUIRED_FILES = [
    join(ONBOARDING, 'OnboardingWizard.tsx'),
    join(ONBOARDING, 'WelcomeStep.tsx'),
    join(ONBOARDING, 'ModuleMatrixStep.tsx'),
    join(ONBOARDING, 'LanguageStep.tsx'),
    join(ONBOARDING, 'ModuleConfigStep.tsx'),
    join(ONBOARDING, 'CompletionStep.tsx'),
    join(COMPONENTS, 'PanelOnboarding.tsx'),
    join(COMPONENTS, 'PanelTourDriver.tsx'),
    BUILD_MODULE_INFO,
  ]

  it.each(REQUIRED_FILES)('exists: %s', (file) => {
    expect(existsSync(file)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. Legacy cleanup — deleted files must NOT exist
// ---------------------------------------------------------------------------

describe('Legacy cleanup', () => {
  const DELETED_FILES = [
    join(COMPONENTS, 'WelcomeModal.tsx'),
    join(COMPONENTS, 'PanelTour.tsx'),
  ]

  it.each(DELETED_FILES)('deleted: %s', (file) => {
    expect(existsSync(file)).toBe(false)
  })

  it('no imports of WelcomeModal anywhere', () => {
    const layout = readFileSync(LAYOUT, 'utf-8')
    const sidebar = readFileSync(join(COMPONENTS, 'PanelSidebar.tsx'), 'utf-8')
    const onboarding = readFileSync(join(COMPONENTS, 'PanelOnboarding.tsx'), 'utf-8')

    expect(layout).not.toContain('WelcomeModal')
    expect(sidebar).not.toContain('WelcomeModal')
    expect(onboarding).not.toContain('WelcomeModal')
  })

  it('no imports of old PanelTour (non-Driver)', () => {
    const sidebar = readFileSync(join(COMPONENTS, 'PanelSidebar.tsx'), 'utf-8')
    // Should NOT import from './PanelTour' but CAN import PanelTourDriver
    expect(sidebar).not.toMatch(/from\s+['"]\.\/PanelTour['"]/)
  })
})

// ---------------------------------------------------------------------------
// 3. Governance contract → ModuleInfo pipeline
// ---------------------------------------------------------------------------

describe('Governance contract → ModuleInfo pipeline', () => {
  const contract = loadContract() as {
    modules: {
      catalog: Array<{
        key: string
        name: string
        icon?: string
        description?: string
        category: string
        tiers?: Array<{ key: string }>
      }>
    }
  }

  it('contract has modules.catalog array', () => {
    expect(contract.modules).toBeDefined()
    expect(Array.isArray(contract.modules.catalog)).toBe(true)
    expect(contract.modules.catalog.length).toBeGreaterThanOrEqual(10)
  })

  it('every catalog module has required fields', () => {
    for (const mod of contract.modules.catalog) {
      expect(mod.key).toBeTruthy()
      expect(mod.name).toBeTruthy()
      expect(mod.category).toBeTruthy()
      // icon and description are optional but should exist
      expect(typeof mod.key).toBe('string')
    }
  })

  it('buildModuleInfoList source imports deriveActiveModulesFromFlags', () => {
    const source = readFileSync(BUILD_MODULE_INFO, 'utf-8')
    expect(source).toContain('deriveActiveModulesFromFlags')
    expect(source).toContain('governance-contract.json')
    expect(source).toContain('export function buildModuleInfoList')
    expect(source).toContain('export interface ModuleInfo')
  })

  it('buildModuleInfoList returns correct shape with tier metadata', () => {
    const source = readFileSync(BUILD_MODULE_INFO, 'utf-8')
    // Must export ModuleInfo with all required fields
    expect(source).toContain('key: string')
    expect(source).toContain('name: string')
    expect(source).toContain('icon: string')
    expect(source).toContain('active: boolean')
    expect(source).toContain('category: string')
    // Tier resolution fields
    expect(source).toContain('tierName?: string')
    expect(source).toContain('tierFeatures?: string[]')
  })

  it('buildModuleInfoList accepts planLimits for tier resolution', () => {
    const source = readFileSync(BUILD_MODULE_INFO, 'utf-8')
    // Function signature must accept planLimits
    expect(source).toContain('planLimits: Record<string, number | string | null>')
    // Must have resolveTier logic
    expect(source).toContain('resolveTier')
    expect(source).toContain('limit_effects')
  })
})

// ---------------------------------------------------------------------------
// 4. Layout integration — passes correct props to PanelOnboarding
// ---------------------------------------------------------------------------

describe('Layout integration', () => {
  const layout = readFileSync(LAYOUT, 'utf-8')

  it('imports buildModuleInfoList', () => {
    expect(layout).toContain("from '@/lib/governance/build-module-info'")
  })

  it('passes modules prop via buildModuleInfoList(featureFlags, planLimits)', () => {
    expect(layout).toContain('modules={buildModuleInfoList(featureFlags')
    // Must pass planLimits as second argument for tier resolution
    expect(layout).toMatch(/buildModuleInfoList\(featureFlags.*planLimits/)
  })

  it('passes all required onboarding props', () => {
    const requiredProps = [
      'storeName=',
      'storeUrl=',
      'locale=',
      'domain=',
      'currency=',
      'language=',
      'modules=',
      'featureFlags=',
      'planLimits=',
      'config=',
      'hasMultiLanguage=',
      'maxLanguages=',
      'activeLanguages=',
      'translations=',
    ]

    for (const prop of requiredProps) {
      expect(layout).toContain(prop)
    }
  })

  it('conditionally renders on !config.onboarding_completed', () => {
    expect(layout).toContain('!config.onboarding_completed')
  })
})

// ---------------------------------------------------------------------------
// 5. PanelOnboarding wrapper — localStorage fail-safe
// ---------------------------------------------------------------------------

describe('PanelOnboarding wrapper', () => {
  const source = readFileSync(join(COMPONENTS, 'PanelOnboarding.tsx'), 'utf-8')

  it('checks localStorage bns-onboarding-done', () => {
    expect(source).toContain("bns-onboarding-done")
  })

  it('imports OnboardingWizard', () => {
    expect(source).toContain("from './onboarding/OnboardingWizard'")
  })

  it('is a client component', () => {
    expect(source.trimStart().startsWith("'use client'")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. Server actions — all required actions exist with correct signatures
// ---------------------------------------------------------------------------

describe('Server actions', () => {
  const actions = readFileSync(ACTIONS, 'utf-8')

  it('is a server module', () => {
    expect(actions.trimStart().startsWith("'use server'")).toBe(true)
  })

  const REQUIRED_ACTIONS = [
    'completeOnboardingAction',
    'saveLanguagePreferencesAction',
    'saveActiveLanguagesAction',
    'saveOnboardingConfigAction',
    'completeTourAction',
  ]

  it.each(REQUIRED_ACTIONS)('exports %s', (action) => {
    expect(actions).toContain(`export async function ${action}`)
  })

  it('completeOnboardingAction sets onboarding_completed: true', () => {
    expect(actions).toContain('onboarding_completed: true')
  })

  it('saveOnboardingConfigAction has whitelist defense', () => {
    expect(actions).toContain('ONBOARDING_CONFIG_KEYS')
    // Must whitelist all meaningful config keys (expanded for all 12 modules)
    const whitelistKeys = [
      // General
      'store_email', 'store_phone', 'store_address', 'whatsapp_number',
      // Social
      'social_facebook', 'social_instagram', 'social_tiktok', 'social_twitter',
      // SEO
      'meta_title', 'meta_description', 'google_analytics_id', 'facebook_pixel_id',
      // E-Commerce
      'default_currency', 'tax_display_mode', 'stock_mode',
      'free_shipping_threshold', 'min_order_amount', 'low_stock_threshold',
      // Chatbot
      'chatbot_name', 'chatbot_tone', 'chatbot_welcome_message',
      'chatbot_auto_open_delay', 'chatbot_knowledge_scope',
      // POS
      'pos_receipt_header', 'pos_receipt_footer', 'pos_default_payment_method',
      'pos_tax_display', 'pos_enable_tips', 'pos_tip_percentages', 'pos_sound_enabled',
      // Automation
      'webhook_notification_email',
      // Capacity
      'traffic_alert_email',
      'capacity_warning_threshold_pct', 'capacity_critical_threshold_pct',
      'capacity_auto_upgrade_interest',
      // CRM expansion
      'crm_auto_tag_customers', 'crm_new_customer_tag',
      'crm_notify_new_contact', 'crm_export_format',
      // Sales Channels expansion
      'sales_whatsapp_greeting', 'sales_preferred_contact',
      'sales_business_hours_display', 'sales_highlight_free_shipping',
      // Email Marketing expansion
      'email_sender_name', 'email_reply_to',
      'email_footer_text', 'email_abandoned_cart_delay',
    ]
    for (const key of whitelistKeys) {
      expect(actions).toContain(`'${key}'`)
    }
  })

  it('saveOnboardingConfigAction has input validation', () => {
    // Must validate emails, coerce numbers, and handle booleans
    expect(actions).toContain('EMAIL_KEYS')
    expect(actions).toContain('NUMBER_KEYS')
    expect(actions).toContain('BOOLEAN_KEYS')
  })

  it('all actions use withPanelGuard()', () => {
    // Every exported async function should call withPanelGuard
    const exportedFunctions = actions.match(/export async function \w+/g) || []
    expect(exportedFunctions.length).toBeGreaterThanOrEqual(5)

    // Count withPanelGuard calls — should be at least as many as exports
    const guardCalls = (actions.match(/await withPanelGuard\(\)/g) || []).length
    expect(guardCalls).toBeGreaterThanOrEqual(exportedFunctions.length)
  })

  it('actions revalidate after config writes', () => {
    expect(actions).toContain("revalidatePath('/panel')")
  })
})

// ---------------------------------------------------------------------------
// 7. i18n key completeness
// ---------------------------------------------------------------------------

describe('i18n onboarding keys', () => {
  const dictES = loadJSON(DICT_ES) as Record<string, string>
  const dictEN = loadJSON(DICT_EN) as Record<string, string>

  // All keys that the wizard components reference via t('...')
  const REQUIRED_KEYS = [
    // WelcomeStep
    'onboarding.welcome.title',
    'onboarding.welcome.subtitle',
    'onboarding.welcome.start',
    'onboarding.welcome.skipAll',
    // ModuleMatrixStep
    'onboarding.modules.title',
    'onboarding.modules.subtitle',
    // LanguageStep
    'onboarding.language.title',
    'onboarding.language.subtitle',
    'onboarding.language.panel',
    'onboarding.language.panelDesc',
    'onboarding.language.storefront',
    'onboarding.language.storefrontDesc',
    'onboarding.language.upsell',
    // ModuleConfigStep
    'onboarding.config.title',
    'onboarding.config.subtitle',
    'onboarding.config.saved',
    'onboarding.config.skip',
    // CompletionStep
    'onboarding.complete.title',
    'onboarding.complete.subtitle',
    'onboarding.complete.dashboard',
    'onboarding.complete.tour',
    // Wizard chrome
    'onboarding.stepOf',
    'onboarding.skipAll',
    'onboarding.back',
    'onboarding.continue',
    'onboarding.next',
    'onboarding.finish',
    'onboarding.completing',
  ]

  it.each(REQUIRED_KEYS)('ES has key: %s', (key) => {
    expect(dictES[key]).toBeTruthy()
  })

  it.each(REQUIRED_KEYS)('EN has key: %s', (key) => {
    expect(dictEN[key]).toBeTruthy()
  })

  it('ES and EN have same number of onboarding keys', () => {
    const esKeys = Object.keys(dictES).filter(k => k.startsWith('onboarding.'))
    const enKeys = Object.keys(dictEN).filter(k => k.startsWith('onboarding.'))
    expect(esKeys.length).toBe(enKeys.length)
  })

  it('no orphan onboarding keys (EN keys have ES match)', () => {
    const enKeys = Object.keys(dictEN).filter(k => k.startsWith('onboarding.'))
    const esKeys = new Set(Object.keys(dictES).filter(k => k.startsWith('onboarding.')))

    const missing = enKeys.filter(k => !esKeys.has(k))
    expect(missing).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 8. OnboardingWizard — step structure integrity
// ---------------------------------------------------------------------------

describe('OnboardingWizard step structure', () => {
  const wizard = readFileSync(join(ONBOARDING, 'OnboardingWizard.tsx'), 'utf-8')

  it('defines 5 steps', () => {
    expect(wizard).toContain("'welcome', 'modules', 'language', 'config', 'complete'")
  })

  it('imports all step components', () => {
    expect(wizard).toContain("from './WelcomeStep'")
    expect(wizard).toContain("from './ModuleMatrixStep'")
    expect(wizard).toContain("from './LanguageStep'")
    expect(wizard).toContain("from './ModuleConfigStep'")
    expect(wizard).toContain("from './CompletionStep'")
  })

  it('uses Framer Motion AnimatePresence', () => {
    expect(wizard).toContain('AnimatePresence')
    expect(wizard).toContain('motion.div')
  })

  it('imports completeOnboardingAction from server actions', () => {
    expect(wizard).toContain('completeOnboardingAction')
  })

  it('sets localStorage bns-onboarding-done on complete', () => {
    expect(wizard).toContain("localStorage.setItem('bns-onboarding-done', '1')")
  })

  it('exports ModuleInfo type', () => {
    expect(wizard).toContain('export interface ModuleInfo')
  })
})

// ---------------------------------------------------------------------------
// 9. PanelTourDriver — driver.js integration
// ---------------------------------------------------------------------------

describe('PanelTourDriver (driver.js)', () => {
  const tour = readFileSync(join(COMPONENTS, 'PanelTourDriver.tsx'), 'utf-8')

  it('imports driver.js', () => {
    expect(tour).toContain("from 'driver.js'")
    expect(tour).toContain("import 'driver.js/dist/driver.css'")
  })

  it('uses data-tour-id for element targeting', () => {
    expect(tour).toContain('data-tour-id')
  })

  it('injects brand-matching CSS overrides', () => {
    expect(tour).toContain('.driver-popover')
    expect(tour).toContain('var(--brand')
  })

  it('persists completion via completeTourAction', () => {
    expect(tour).toContain('completeTourAction')
  })

  it('sets localStorage bns-tour-done', () => {
    expect(tour).toContain("bns-tour-done")
  })
})

// ---------------------------------------------------------------------------
// 10. ModuleConfigStep — meaningful config for all module types
// ---------------------------------------------------------------------------

describe('ModuleConfigStep coverage', () => {
  const configStep = readFileSync(join(ONBOARDING, 'ModuleConfigStep.tsx'), 'utf-8')

  // Modules that should have either editable config or info panels
  // These must match the switch/case keys in ModuleConfigStep
  const MODULE_KEYS = [
    'ecommerce',
    'seo',
    'email_marketing',
    'rrss',
    'pos',
    'chatbot',
    'crm',
    'auth_advanced',
    'automation',
    'capacidad',
    'sales_channels',
    'i18n',
  ]

  it.each(MODULE_KEYS)('handles module: %s', (key) => {
    // Each module key should appear in the config step logic
    expect(configStep).toContain(`'${key}'`)
  })

  it('uses saveOnboardingConfigAction for persistence', () => {
    expect(configStep).toContain('saveOnboardingConfigAction')
  })

  it('is a client component', () => {
    expect(configStep.trimStart().startsWith("'use client'")).toBe(true)
  })

  it('supports all field types (text, select, toggle, info, limit_bar, feature_list)', () => {
    expect(configStep).toContain("type: 'text'")
    expect(configStep).toContain("type: 'select'")
    expect(configStep).toContain("type: 'toggle'")
    expect(configStep).toContain("type: 'info'")
    expect(configStep).toContain("type: 'limit_bar'")
    expect(configStep).toContain("type: 'feature_list'")
  })

  it('has meaningful editable fields for most modules', () => {
    // Modules that MUST have editable fields (not just info)
    const EDITABLE_MODULES = [
      'ecommerce', 'seo', 'rrss', 'email_marketing',
      'chatbot', 'crm', 'pos', 'sales_channels',
      'automation', 'capacidad',
    ]
    for (const mod of EDITABLE_MODULES) {
      // Each should have at least one field with key that doesn't start with _
      const caseBlock = configStep.split(`case '${mod}':`)[1]?.split(/case '|default:/)[0] || ''
      expect(caseBlock).toMatch(/key: '[a-z]/)
    }
  })

  it('displays limit bars for modules with plan limits', () => {
    // Modules with limit_bar should reference planLimits
    expect(configStep).toContain('planLimits.max_products')
    expect(configStep).toContain('planLimits.max_chatbot_messages_month')
    expect(configStep).toContain('planLimits.max_crm_contacts')
    expect(configStep).toContain('planLimits.max_requests_day')
    expect(configStep).toContain('planLimits.storage_limit_mb')
    expect(configStep).toContain('planLimits.max_file_upload_mb')
  })

  // --- POS operational depth ---
  it('POS has receipt footer, tax display, tips, and sound config', () => {
    expect(configStep).toContain("'pos_receipt_footer'")
    expect(configStep).toContain("'pos_tax_display'")
    expect(configStep).toContain("'pos_enable_tips'")
    expect(configStep).toContain("'pos_tip_percentages'")
    expect(configStep).toContain("'pos_sound_enabled'")
  })

  // --- Chatbot SOTA ---
  it('Chatbot has SOTA tone previews', () => {
    // Tone options should contain preview micro-copy (quotes)
    expect(configStep).toContain('Buenos días')
    expect(configStep).toContain('Hey!')
  })

  it('Chatbot has knowledge scope and auto-open delay', () => {
    expect(configStep).toContain("'chatbot_knowledge_scope'")
    expect(configStep).toContain("'chatbot_auto_open_delay'")
    expect(configStep).toContain("'products_only'")
    expect(configStep).toContain("'products_and_faq'")
    expect(configStep).toContain("'full_catalog'")
  })

  // --- Capacity dual thresholds ---
  it('Capacity has dual thresholds and auto-upgrade toggle', () => {
    expect(configStep).toContain("'capacity_warning_threshold_pct'")
    expect(configStep).toContain("'capacity_critical_threshold_pct'")
    expect(configStep).toContain("'capacity_auto_upgrade_interest'")
  })

  it('Capacity has split limit bars (requests, storage, upload)', () => {
    expect(configStep).toContain("'_limits_capacity_requests'")
    expect(configStep).toContain("'_limits_capacity_storage'")
    expect(configStep).toContain("'_limits_capacity_upload'")
  })

  // --- Phase 5: CRM operational depth ---
  it('CRM has auto-tag, customer tag, notify, and export format', () => {
    expect(configStep).toContain("'crm_auto_tag_customers'")
    expect(configStep).toContain("'crm_new_customer_tag'")
    expect(configStep).toContain("'crm_notify_new_contact'")
    expect(configStep).toContain("'crm_export_format'")
    expect(configStep).toContain("'csv'")
    expect(configStep).toContain("'excel'")
  })

  // --- Phase 5: Sales Channels operational depth ---
  it('Sales Channels has WhatsApp greeting, preferred contact, hours, and free shipping', () => {
    expect(configStep).toContain("'sales_whatsapp_greeting'")
    expect(configStep).toContain("'sales_preferred_contact'")
    expect(configStep).toContain("'sales_business_hours_display'")
    expect(configStep).toContain("'sales_highlight_free_shipping'")
    expect(configStep).toContain("'weekdays'")
    expect(configStep).toContain("'full_week'")
  })

  // --- Phase 5: Email Marketing operational depth ---
  it('Email Marketing has sender name, reply-to, footer, and cart delay', () => {
    expect(configStep).toContain("'email_sender_name'")
    expect(configStep).toContain("'email_reply_to'")
    expect(configStep).toContain("'email_footer_text'")
    expect(configStep).toContain("'email_abandoned_cart_delay'")
    expect(configStep).toContain("'1h'")
    expect(configStep).toContain("'3h'")
    expect(configStep).toContain("'24h'")
  })

  // --- Phase 5: Ecommerce split limit bars ---
  it('Ecommerce has split limit bars (products, orders) and min_order_amount', () => {
    expect(configStep).toContain("'_limits_ecommerce_products'")
    expect(configStep).toContain("'_limits_ecommerce_orders'")
    expect(configStep).toContain("'min_order_amount'")
    expect(configStep).toContain('planLimits.max_categories')
  })

  // --- Phase 5: Feature lists on more modules ---
  it('Feature lists on ecommerce, email, channels, and automation', () => {
    expect(configStep).toContain("'_features_ecommerce'")
    expect(configStep).toContain("'_features_email'")
    expect(configStep).toContain("'_features_channels'")
    expect(configStep).toContain("'_features_automation'")
  })
})

// ---------------------------------------------------------------------------
// 11. driver.js dependency in package.json
// ---------------------------------------------------------------------------

describe('Dependencies', () => {
  const pkg = loadJSON(join(STOREFRONT, 'package.json')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  it('has driver.js', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(allDeps['driver.js']).toBeTruthy()
  })

  it('has framer-motion', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(allDeps['framer-motion']).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 12. Polish pass integrity — F2, F3, F8, F9
// ---------------------------------------------------------------------------

describe('Polish pass integrity', () => {
  const configStep = readFileSync(join(ONBOARDING, 'ModuleConfigStep.tsx'), 'utf-8')
  const matrixStep = readFileSync(join(ONBOARDING, 'ModuleMatrixStep.tsx'), 'utf-8')
  const actions = readFileSync(ACTIONS, 'utf-8')
  const dictES = loadJSON(DICT_ES) as Record<string, string>
  const dictEN = loadJSON(DICT_EN) as Record<string, string>

  // F2: store_email must appear exactly once as a config key (in email_marketing only)
  it('store_email field used only in email_marketing (no duplicate in CRM)', () => {
    // Count occurrences of key: 'store_email' in the switch/case config definitions
    const matches = configStep.match(/key: 'store_email'/g) || []
    expect(matches.length).toBe(1)
    // CRM must NOT have a store_email field — uses info reference instead
    expect(configStep).toContain("'_info_crm_email'")
    expect(configStep).toContain('onboarding.config.crm.emailInfo')
  })

  // F3: ModuleMatrixStep must NOT have hardcoded Spanish category labels
  it('ModuleMatrixStep uses i18n for category labels', () => {
    // Must use t() for category labels
    expect(matrixStep).toContain('onboarding.category.')
    // Must NOT contain hardcoded Spanish labels
    expect(matrixStep).not.toContain("label: '🛍️ Vender'")
    expect(matrixStep).not.toContain("label: '💬 Engagement'")
    expect(matrixStep).not.toContain("CATEGORY_LABELS")
  })

  // F3: Category i18n keys exist in both dictionaries
  it('category i18n keys exist in ES and EN', () => {
    const categories = ['sell', 'engage', 'grow', 'automate']
    for (const cat of categories) {
      const key = `onboarding.category.${cat}`
      expect(dictES[key]).toBeTruthy()
      expect(dictEN[key]).toBeTruthy()
    }
  })

  // F8: Module description i18n keys exist for all 12 modules
  it('module description i18n keys exist for all 12 modules', () => {
    const moduleKeys = [
      'ecommerce', 'seo', 'rrss', 'email_marketing', 'chatbot', 'pos',
      'crm', 'sales_channels', 'auth_advanced', 'automation', 'capacidad', 'i18n',
    ]
    for (const mod of moduleKeys) {
      const key = `onboarding.modules.desc.${mod}`
      expect(dictES[key]).toBeTruthy()
      expect(dictEN[key]).toBeTruthy()
    }
  })

  // F8: ModuleConfigStep renders module descriptions via i18n
  it('ModuleConfigStep uses i18n for module descriptions', () => {
    expect(configStep).toContain('onboarding.modules.desc.')
    expect(configStep).toContain('mod.description')
  })

  // F9: No orphan keys — every whitelist key must be used by at least one module OR a known exception
  it('no orphan keys in ONBOARDING_CONFIG_KEYS whitelist', () => {
    // Keys in whitelist that are NOT rendered as a field key in ModuleConfigStep
    // are flagged as orphans. Known exceptions: keys used outside onboarding.
    const KNOWN_EXCEPTIONS = new Set<string>([])

    // Extract all keys from whitelist
    const whitelistMatch = actions.match(/ONBOARDING_CONFIG_KEYS = new Set\(\[([\s\S]*?)\]\)/)
    expect(whitelistMatch).toBeTruthy()
    const whitelistContent = whitelistMatch![1]
    const whitelistKeys = whitelistContent.match(/'([a-z_]+)'/g)?.map(s => s.replace(/'/g, '')) || []
    expect(whitelistKeys.length).toBe(49) // 52 original - 2 orphans (delivery_info_text, traffic_alert_threshold_pct) - 1 (announcement_bar_text was double-counted)

    // Extract all field keys from ModuleConfigStep
    const fieldKeys = configStep.match(/key: '([a-z_]+)'/g)?.map(s => s.replace(/key: '|'/g, '')) || []

    // Every whitelist key must appear as a field key or be a known exception
    for (const key of whitelistKeys) {
      if (KNOWN_EXCEPTIONS.has(key)) continue
      expect(fieldKeys).toContain(key)
    }
  })

  // F4: Numeric fields use type 'number'
  it('numeric config fields use type number', () => {
    // min_order_amount, free_shipping_threshold, low_stock_threshold should be type: 'number'
    const numericFields = ['min_order_amount', 'free_shipping_threshold', 'low_stock_threshold']
    for (const field of numericFields) {
      // Find the field definition block
      const fieldIdx = configStep.indexOf(`key: '${field}'`)
      expect(fieldIdx).toBeGreaterThan(-1)
      // The type: 'number' should follow within ~200 chars after the key
      const context = configStep.substring(fieldIdx, fieldIdx + 200)
      expect(context).toContain("type: 'number'")
    }
  })
})
