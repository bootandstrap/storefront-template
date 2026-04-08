/**
 * Template Engine — Unified Types
 *
 * Single source of truth for all template-related types.
 * Used by templates, seeders, cleaners, and the CLI.
 */

// ── Template Definition Types ────────────────────────────────

export interface CategoryDef {
    name: string
    handle: string
    description: string
}

export interface VariantDef {
    title: string
    sku: string
    prices: Array<{ amount: number; currency_code: string }>
    manage_inventory?: boolean
}

export interface ProductDef {
    title: string
    handle: string
    description: string
    category: string // handle reference to CategoryDef
    variants: VariantDef[]
    weight?: number
    thumbnail?: string
    images?: string[]
    tags?: string[]
    status?: 'published' | 'draft'
}

export interface CustomerDef {
    first_name: string
    last_name: string
    email: string
    phone?: string
    metadata?: Record<string, unknown>
}

export interface OrderPattern {
    /** Total orders to generate */
    count: number
    /** Distribution: days back from now */
    daysSpread: number
    /** Status distribution: { completed: 0.7, pending: 0.2, canceled: 0.1 } */
    statusDistribution: Record<string, number>
    /** Items per order: [min, max] */
    itemsPerOrder: [number, number]
    /** Quantity per item: [min, max] */
    quantityPerItem: [number, number]
}

export interface GovernanceProfile {
    bundleName: string
    /** Flag overrides (merged on top of contract flags) */
    flagOverrides?: Record<string, boolean>
    /** Limit overrides (merged on top of contract limits) */
    limitOverrides?: Record<string, unknown>
    /** Store config for Supabase */
    storeConfig: {
        business_name: string
        description: string
        contact_phone: string
        primary_color: string
        accent_color: string
        language: string
        logo_url?: string
        store_email?: string
        default_currency?: string
        active_currencies?: string[]
        active_languages?: string[]
    }
}

export interface ModuleConfig {
    /** POS config if pos module is active */
    pos?: {
        default_payment_methods: string[]
        enable_kiosk: boolean
        enable_shifts: boolean
    }
    /** Chatbot config */
    chatbot?: {
        welcome_message: string
        auto_responses: boolean
    }
    /** CRM config */
    crm?: {
        enable_loyalty: boolean
        loyalty_stamps_target: number
    }
}

export interface IndustryTemplate {
    id: string
    name: string
    industry: string
    description: string
    emoji: string

    /** Commerce config */
    currency: string
    country: string
    regionName: string
    timezone: string
    countryPrefix: string

    /** Multi-currency support */
    additionalCurrencies?: string[]

    /** Governance profile */
    governance: GovernanceProfile

    /** Catalog data */
    categories: CategoryDef[]
    products: ProductDef[]

    /** Customer definitions */
    customers: CustomerDef[]

    /** Order generation pattern */
    orderPattern: OrderPattern

    /** Per-module config */
    moduleConfig?: ModuleConfig

    /** Shipping config */
    shipping?: {
        standardLabel: string
        standardPrice: number
        expressLabel: string
        expressPrice: number
    }
}

// ── Engine Options & Results ─────────────────────────────────

export interface ApplyOptions {
    /** Clean before applying */
    clean: boolean
    /** Skip order generation */
    skipOrders: boolean
    /** Skip governance seeding */
    skipGovernance: boolean
    /** Hard reset: also remove regions/shipping */
    hardReset: boolean
    /** Verbose logging */
    verbose: boolean
}

export const DEFAULT_APPLY_OPTIONS: ApplyOptions = {
    clean: true,
    skipOrders: false,
    skipGovernance: false,
    hardReset: false,
    verbose: false,
}

export interface ApplyResult {
    success: boolean
    templateId: string
    stats: {
        categoriesCreated: number
        productsCreated: number
        customersCreated: number
        ordersCreated: number
        regionsCreated: number
        governanceSeeded: boolean
    }
    errors: string[]
    elapsedMs: number
}

export interface InstanceStatus {
    medusaReachable: boolean
    productCount: number
    categoryCount: number
    customerCount: number
    orderCount: number
    draftOrderCount: number
    regionCount: number
    salesChannelId: string | null
    publishableApiKey: string | null
    governanceTenantId: string | null
    governanceStatus: string | null
}

// ── Logger ───────────────────────────────────────────────────

export type LogFn = (icon: string, msg: string) => void

export const defaultLog: LogFn = (icon, msg) => {
    console.log(`  ${icon} ${msg}`)
}
