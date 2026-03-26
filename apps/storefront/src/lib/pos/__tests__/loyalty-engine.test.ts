import { describe, expect, it, beforeEach, vi } from 'vitest'

// ── Stub window + localStorage (loyalty-engine guards with `typeof window`) ──
const store: Record<string, string> = {}
const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
    length: 0,
    key: vi.fn(() => null),
}

vi.stubGlobal('window', {})
vi.stubGlobal('localStorage', localStorageMock)

import {
    addStamp,
    redeemReward,
    getCustomerLoyalty,
    getAllLoyaltyCustomers,
    getStampProgress,
    getLoyaltyConfig,
    saveLoyaltyConfig,
    getRedemptionHistory,
    generateLoyaltyQRPayload,
    DEFAULT_LOYALTY_CONFIG,
    type LoyaltyCustomer,
    type LoyaltyConfig,
} from '../loyalty-engine'

describe('loyalty-engine', () => {
    beforeEach(() => {
        localStorageMock.clear()
        localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null)
        localStorageMock.setItem.mockImplementation((key: string, value: string) => { store[key] = value })
    })

    // ── Config ──

    describe('getLoyaltyConfig / saveLoyaltyConfig', () => {
        it('returns default config when nothing saved', () => {
            expect(getLoyaltyConfig()).toEqual(DEFAULT_LOYALTY_CONFIG)
        })

        it('merges partial config on top of defaults', () => {
            saveLoyaltyConfig({ businessName: 'Test Store' })
            const cfg = getLoyaltyConfig()
            expect(cfg.businessName).toBe('Test Store')
            expect(cfg.stampsRequired).toBe(DEFAULT_LOYALTY_CONFIG.stampsRequired)
        })
    })

    // ── addStamp ──

    describe('addStamp', () => {
        it('creates a new customer on first stamp', () => {
            const c = addStamp('cus_1', 'Alice')
            expect(c.customerId).toBe('cus_1')
            expect(c.customerName).toBe('Alice')
            expect(c.stamps).toBe(1)
            expect(c.totalRedeemed).toBe(0)
            expect(c.lastStampAt).toBeTruthy()
            expect(c.createdAt).toBeTruthy()
        })

        it('increments stamps on subsequent calls', () => {
            addStamp('cus_2', 'Bob')
            addStamp('cus_2', 'Bob')
            const c = addStamp('cus_2', 'Bob')
            expect(c.stamps).toBe(3)
        })

        it('caps stamps at stampsRequired', () => {
            saveLoyaltyConfig({ stampsRequired: 3 })
            addStamp('cus_3', 'Carol')
            addStamp('cus_3', 'Carol')
            addStamp('cus_3', 'Carol')
            const c = addStamp('cus_3', 'Carol')
            expect(c.stamps).toBe(3) // capped, not 4
        })

        it('persists to localStorage', () => {
            addStamp('cus_4', 'Dave')
            expect(localStorageMock.setItem).toHaveBeenCalled()
            // Data can be retrieved again
            const c = getCustomerLoyalty('cus_4')
            expect(c?.stamps).toBe(1)
        })
    })

    // ── redeemReward ──

    describe('redeemReward', () => {
        it('returns null when stamps are insufficient', () => {
            addStamp('cus_5', 'Eve')
            const result = redeemReward('cus_5')
            expect(result).toBeNull()
        })

        it('redeems when stamps reach required count', () => {
            saveLoyaltyConfig({ stampsRequired: 2, rewardDescription: 'Free coffee' })
            addStamp('cus_6', 'Frank')
            addStamp('cus_6', 'Frank')
            const redemption = redeemReward('cus_6')

            expect(redemption).not.toBeNull()
            expect(redemption!.customerId).toBe('cus_6')
            expect(redemption!.rewardDescription).toBe('Free coffee')

            // Stamps reset to 0, totalRedeemed incremented
            const c = getCustomerLoyalty('cus_6')
            expect(c!.stamps).toBe(0)
            expect(c!.totalRedeemed).toBe(1)
        })

        it('adds redemption to history', () => {
            saveLoyaltyConfig({ stampsRequired: 1 })
            addStamp('cus_7', 'Grace')
            redeemReward('cus_7')

            const history = getRedemptionHistory()
            expect(history.length).toBe(1)
            expect(history[0].customerId).toBe('cus_7')
        })

        it('returns null for unknown customer', () => {
            expect(redeemReward('nonexistent')).toBeNull()
        })
    })

    // ── getStampProgress ──

    describe('getStampProgress', () => {
        it('calculates progress correctly', () => {
            const customer: LoyaltyCustomer = {
                customerId: 'c1', customerName: 'Test',
                stamps: 3, totalRedeemed: 0,
                lastStampAt: null, createdAt: '',
            }
            const config: LoyaltyConfig = { ...DEFAULT_LOYALTY_CONFIG, stampsRequired: 10 }
            const p = getStampProgress(customer, config)

            expect(p.current).toBe(3)
            expect(p.required).toBe(10)
            expect(p.percentage).toBe(30)
            expect(p.isComplete).toBe(false)
        })

        it('marks isComplete when stamps >= required', () => {
            const customer: LoyaltyCustomer = {
                customerId: 'c2', customerName: 'Test',
                stamps: 10, totalRedeemed: 0,
                lastStampAt: null, createdAt: '',
            }
            const config: LoyaltyConfig = { ...DEFAULT_LOYALTY_CONFIG, stampsRequired: 10 }
            const p = getStampProgress(customer, config)

            expect(p.isComplete).toBe(true)
            expect(p.percentage).toBe(100)
        })

        it('handles 0 stamps', () => {
            const customer: LoyaltyCustomer = {
                customerId: 'c3', customerName: 'Test',
                stamps: 0, totalRedeemed: 0,
                lastStampAt: null, createdAt: '',
            }
            const config: LoyaltyConfig = { ...DEFAULT_LOYALTY_CONFIG, stampsRequired: 10 }
            const p = getStampProgress(customer, config)

            expect(p.current).toBe(0)
            expect(p.percentage).toBe(0)
            expect(p.isComplete).toBe(false)
        })
    })

    // ── getAllLoyaltyCustomers ──

    describe('getAllLoyaltyCustomers', () => {
        it('returns customers sorted by stamps descending', () => {
            addStamp('a', 'Alice')
            addStamp('b', 'Bob')
            addStamp('b', 'Bob')
            addStamp('c', 'Carol')
            addStamp('c', 'Carol')
            addStamp('c', 'Carol')

            const all = getAllLoyaltyCustomers()
            expect(all[0].customerName).toBe('Carol')
            expect(all[0].stamps).toBe(3)
            expect(all[2].customerName).toBe('Alice')
            expect(all[2].stamps).toBe(1)
        })
    })

    // ── QR ──

    describe('generateLoyaltyQRPayload', () => {
        it('generates correct URL', () => {
            const url = generateLoyaltyQRPayload('cus_1', 'https://store.com', 'es')
            expect(url).toBe('https://store.com/es/cuenta/fidelidad?id=cus_1')
        })

        it('encodes special characters in customer ID', () => {
            const url = generateLoyaltyQRPayload('cus/special&id', 'https://x.com', 'en')
            expect(url).toContain(encodeURIComponent('cus/special&id'))
        })
    })
})
