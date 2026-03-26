/**
 * loyalty-engine.ts — Digital Loyalty Card Engine
 *
 * Client-side loyalty stamp system. Persists to localStorage.
 * Future: sync to Supabase for cross-device persistence.
 *
 * Supports:
 * - Configurable stamp target (e.g., 10 stamps → reward)
 * - Multiple reward types (discount %, free product, custom)
 * - QR code generation per customer for in-store scanning
 * - History of redeemed rewards
 */

// ── Types ──

export interface LoyaltyConfig {
    /** How many stamps needed for a reward */
    stampsRequired: number
    /** Reward description shown to customer */
    rewardDescription: string
    /** Reward type */
    rewardType: 'percentage_discount' | 'fixed_discount' | 'free_product' | 'custom'
    /** Reward value (e.g., 10 for 10% off, or amount in cents) */
    rewardValue: number
    /** Business name for card branding */
    businessName: string
    /** Currency code for fixed discounts */
    currencyCode: string
}

export interface LoyaltyCustomer {
    customerId: string
    customerName: string
    stamps: number
    totalRedeemed: number
    lastStampAt: string | null
    createdAt: string
}

export interface LoyaltyRedemption {
    id: string
    customerId: string
    redeemedAt: string
    rewardDescription: string
}

// ── Storage Keys ──

const LOYALTY_CONFIG_KEY = 'pos-loyalty-config'
const LOYALTY_CUSTOMERS_KEY = 'pos-loyalty-customers'
const LOYALTY_HISTORY_KEY = 'pos-loyalty-history'

// ── Default Config ──

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
    stampsRequired: 10,
    rewardDescription: 'Free product',
    rewardType: 'free_product',
    rewardValue: 0,
    businessName: '',
    currencyCode: 'EUR',
}

// ── Config ──

export function getLoyaltyConfig(): LoyaltyConfig {
    if (typeof window === 'undefined') return DEFAULT_LOYALTY_CONFIG
    try {
        const raw = localStorage.getItem(LOYALTY_CONFIG_KEY)
        return raw ? { ...DEFAULT_LOYALTY_CONFIG, ...JSON.parse(raw) } : DEFAULT_LOYALTY_CONFIG
    } catch {
        return DEFAULT_LOYALTY_CONFIG
    }
}

export function saveLoyaltyConfig(config: Partial<LoyaltyConfig>): void {
    const current = getLoyaltyConfig()
    localStorage.setItem(LOYALTY_CONFIG_KEY, JSON.stringify({ ...current, ...config }))
}

// ── Customer Operations ──

function getCustomers(): Record<string, LoyaltyCustomer> {
    if (typeof window === 'undefined') return {}
    try {
        const raw = localStorage.getItem(LOYALTY_CUSTOMERS_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function saveCustomers(customers: Record<string, LoyaltyCustomer>): void {
    localStorage.setItem(LOYALTY_CUSTOMERS_KEY, JSON.stringify(customers))
}

export function getCustomerLoyalty(customerId: string): LoyaltyCustomer | null {
    const customers = getCustomers()
    return customers[customerId] || null
}

export function getAllLoyaltyCustomers(): LoyaltyCustomer[] {
    return Object.values(getCustomers()).sort(
        (a, b) => b.stamps - a.stamps
    )
}

export function addStamp(customerId: string, customerName: string): LoyaltyCustomer {
    const customers = getCustomers()
    const existing = customers[customerId]
    const config = getLoyaltyConfig()

    const updated: LoyaltyCustomer = existing
        ? {
            ...existing,
            customerName,
            stamps: Math.min(existing.stamps + 1, config.stampsRequired),
            lastStampAt: new Date().toISOString(),
        }
        : {
            customerId,
            customerName,
            stamps: 1,
            totalRedeemed: 0,
            lastStampAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        }

    customers[customerId] = updated
    saveCustomers(customers)
    return updated
}

export function redeemReward(customerId: string): LoyaltyRedemption | null {
    const config = getLoyaltyConfig()
    const customers = getCustomers()
    const customer = customers[customerId]

    if (!customer || customer.stamps < config.stampsRequired) return null

    // Reset stamps and increment total
    customer.stamps = 0
    customer.totalRedeemed += 1
    customers[customerId] = customer
    saveCustomers(customers)

    // Record redemption
    const redemption: LoyaltyRedemption = {
        id: `red_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        customerId,
        redeemedAt: new Date().toISOString(),
        rewardDescription: config.rewardDescription,
    }

    const history = getRedemptionHistory()
    history.unshift(redemption)
    localStorage.setItem(LOYALTY_HISTORY_KEY, JSON.stringify(history.slice(0, 100)))

    return redemption
}

export function getRedemptionHistory(): LoyaltyRedemption[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(LOYALTY_HISTORY_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

/**
 * Generate the QR payload for a customer loyalty card.
 * When scanned, this URL opens the customer's loyalty page.
 */
export function generateLoyaltyQRPayload(customerId: string, storeUrl: string, lang: string): string {
    return `${storeUrl}/${lang}/cuenta/fidelidad?id=${encodeURIComponent(customerId)}`
}

export function getStampProgress(customer: LoyaltyCustomer, config: LoyaltyConfig): {
    current: number
    required: number
    percentage: number
    isComplete: boolean
} {
    return {
        current: customer.stamps,
        required: config.stampsRequired,
        percentage: Math.round((customer.stamps / config.stampsRequired) * 100),
        isComplete: customer.stamps >= config.stampsRequired,
    }
}

// ---------------------------------------------------------------------------
// Medusa Metadata Sync Helpers
// ---------------------------------------------------------------------------

/** Shape persisted in Medusa customer.metadata.loyalty */
export interface LoyaltyMedusaData {
    stamps: number
    totalRedeemed: number
    lastStampAt: string | null
    createdAt: string
}

/** Convert a local LoyaltyCustomer → Medusa metadata shape */
export function toLoyaltyMedusaData(customer: LoyaltyCustomer): LoyaltyMedusaData {
    return {
        stamps: customer.stamps,
        totalRedeemed: customer.totalRedeemed,
        lastStampAt: customer.lastStampAt,
        createdAt: customer.createdAt,
    }
}

/** Convert Medusa metadata → local LoyaltyCustomer */
export function fromLoyaltyMedusaData(
    data: LoyaltyMedusaData,
    customerId: string,
    customerName: string
): LoyaltyCustomer {
    return {
        customerId,
        customerName,
        stamps: data.stamps,
        totalRedeemed: data.totalRedeemed,
        lastStampAt: data.lastStampAt,
        createdAt: data.createdAt,
    }
}

/**
 * Merge local + remote loyalty data — remote (Medusa) wins if more recent.
 * Returns the merged customer and whether local should be updated.
 */
export function mergeLoyalty(
    local: LoyaltyCustomer | null,
    remote: LoyaltyMedusaData | null,
    customerId: string,
    customerName: string
): { merged: LoyaltyCustomer; localNeedsUpdate: boolean } {
    if (!local && !remote) {
        const fresh: LoyaltyCustomer = {
            customerId, customerName,
            stamps: 0, totalRedeemed: 0,
            lastStampAt: null, createdAt: new Date().toISOString(),
        }
        return { merged: fresh, localNeedsUpdate: false }
    }

    if (!local && remote) {
        return {
            merged: fromLoyaltyMedusaData(remote, customerId, customerName),
            localNeedsUpdate: true,
        }
    }

    if (local && !remote) {
        return { merged: local, localNeedsUpdate: false }
    }

    // Both exist — compare lastStampAt, Medusa wins if more recent
    const localTime = local!.lastStampAt ? new Date(local!.lastStampAt).getTime() : 0
    const remoteTime = remote!.lastStampAt ? new Date(remote!.lastStampAt).getTime() : 0

    if (remoteTime > localTime) {
        return {
            merged: fromLoyaltyMedusaData(remote!, customerId, customerName),
            localNeedsUpdate: true,
        }
    }

    return { merged: local!, localNeedsUpdate: false }
}
