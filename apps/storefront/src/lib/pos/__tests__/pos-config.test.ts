/**
 * POS Config Tests — Cart Reducer + Cart Calculations
 *
 * Tests the core business logic of the POS cart system:
 * - cartReducer state transitions (ADD, REMOVE, UPDATE_QTY, SET_DISCOUNT, SET_CUSTOMER, SET_PAYMENT, CLEAR)
 * - calculateCartTotals with percentage/fixed discounts and tax
 * - Edge cases: duplicate items, zero/negative quantity, discount capping
 */

import { describe, it, expect } from 'vitest'
import {
    cartReducer,
    calculateCartTotals,
    INITIAL_CART,
    PAYMENT_METHODS,
    type CartState,
    type POSCartItem,
} from '../pos-config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<POSCartItem> = {}): POSCartItem => ({
    id: 'variant_001',
    product_id: 'prod_001',
    title: 'Test Product',
    variant_title: null,
    thumbnail: null,
    sku: null,
    unit_price: 1000, // 10.00
    quantity: 1,
    currency_code: 'chf',
    ...overrides,
})

// ---------------------------------------------------------------------------
// Cart Reducer
// ---------------------------------------------------------------------------

describe('cartReducer', () => {
    describe('ADD_ITEM', () => {
        it('adds a new item to empty cart', () => {
            const item = makeItem()
            const result = cartReducer(INITIAL_CART, { type: 'ADD_ITEM', item })

            expect(result.items).toHaveLength(1)
            expect(result.items[0].id).toBe('variant_001')
            expect(result.items[0].quantity).toBe(1)
        })

        it('increments quantity when adding duplicate item', () => {
            const item = makeItem()
            const state: CartState = { ...INITIAL_CART, items: [item] }
            const result = cartReducer(state, { type: 'ADD_ITEM', item })

            expect(result.items).toHaveLength(1)
            expect(result.items[0].quantity).toBe(2)
        })

        it('preserves existing items when adding a new different item', () => {
            const item1 = makeItem()
            const item2 = makeItem({ id: 'variant_002', title: 'Item 2' })
            const state: CartState = { ...INITIAL_CART, items: [item1] }
            const result = cartReducer(state, { type: 'ADD_ITEM', item: item2 })

            expect(result.items).toHaveLength(2)
        })

        it('forces quantity to 1 for new items regardless of input', () => {
            const item = makeItem({ quantity: 5 })
            const result = cartReducer(INITIAL_CART, { type: 'ADD_ITEM', item })

            expect(result.items[0].quantity).toBe(1)
        })
    })

    describe('REMOVE_ITEM', () => {
        it('removes item from cart', () => {
            const state: CartState = { ...INITIAL_CART, items: [makeItem()] }
            const result = cartReducer(state, { type: 'REMOVE_ITEM', variant_id: 'variant_001' })

            expect(result.items).toHaveLength(0)
        })

        it('does not error when removing non-existent item', () => {
            const result = cartReducer(INITIAL_CART, { type: 'REMOVE_ITEM', variant_id: 'ghost' })
            expect(result.items).toHaveLength(0)
        })
    })

    describe('UPDATE_QTY', () => {
        it('updates quantity of existing item', () => {
            const state: CartState = { ...INITIAL_CART, items: [makeItem()] }
            const result = cartReducer(state, { type: 'UPDATE_QTY', variant_id: 'variant_001', quantity: 5 })

            expect(result.items[0].quantity).toBe(5)
        })

        it('removes item when quantity is set to 0', () => {
            const state: CartState = { ...INITIAL_CART, items: [makeItem()] }
            const result = cartReducer(state, { type: 'UPDATE_QTY', variant_id: 'variant_001', quantity: 0 })

            expect(result.items).toHaveLength(0)
        })

        it('removes item when quantity is negative', () => {
            const state: CartState = { ...INITIAL_CART, items: [makeItem()] }
            const result = cartReducer(state, { type: 'UPDATE_QTY', variant_id: 'variant_001', quantity: -1 })

            expect(result.items).toHaveLength(0)
        })
    })

    describe('SET_DISCOUNT', () => {
        it('sets percentage discount', () => {
            const result = cartReducer(INITIAL_CART, {
                type: 'SET_DISCOUNT',
                discount: { type: 'percentage', value: 10 },
            })

            expect(result.discount).toEqual({ type: 'percentage', value: 10 })
        })

        it('sets fixed discount', () => {
            const result = cartReducer(INITIAL_CART, {
                type: 'SET_DISCOUNT',
                discount: { type: 'fixed', value: 500 },
            })

            expect(result.discount).toEqual({ type: 'fixed', value: 500 })
        })

        it('clears discount when null', () => {
            const state: CartState = {
                ...INITIAL_CART,
                discount: { type: 'percentage', value: 10 },
            }
            const result = cartReducer(state, { type: 'SET_DISCOUNT', discount: null })

            expect(result.discount).toBeNull()
        })
    })

    describe('SET_CUSTOMER', () => {
        it('sets customer info', () => {
            const result = cartReducer(INITIAL_CART, {
                type: 'SET_CUSTOMER',
                customer_id: 'cus_123',
                customer_name: 'John Doe',
            })

            expect(result.customer_id).toBe('cus_123')
            expect(result.customer_name).toBe('John Doe')
        })

        it('clears customer info', () => {
            const state: CartState = {
                ...INITIAL_CART,
                customer_id: 'cus_123',
                customer_name: 'John Doe',
            }
            const result = cartReducer(state, {
                type: 'SET_CUSTOMER',
                customer_id: null,
                customer_name: null,
            })

            expect(result.customer_id).toBeNull()
            expect(result.customer_name).toBeNull()
        })
    })

    describe('SET_PAYMENT', () => {
        it('changes payment method', () => {
            const result = cartReducer(INITIAL_CART, {
                type: 'SET_PAYMENT',
                method: 'card_terminal',
            })

            expect(result.payment_method).toBe('card_terminal')
        })
    })

    describe('CLEAR', () => {
        it('resets to initial state', () => {
            const state: CartState = {
                items: [makeItem()],
                discount: { type: 'percentage', value: 10 },
                customer_id: 'cus_123',
                customer_name: 'John Doe',
                payment_method: 'twint',
            }
            const result = cartReducer(state, { type: 'CLEAR' })

            expect(result).toEqual(INITIAL_CART)
        })
    })

    describe('default/unknown actions', () => {
        it('returns unchanged state for unknown actions', () => {
            const state: CartState = { ...INITIAL_CART, items: [makeItem()] }
            // @ts-expect-error testing unknown action
            const result = cartReducer(state, { type: 'UNKNOWN_ACTION' })

            expect(result).toBe(state)
        })
    })
})

// ---------------------------------------------------------------------------
// Cart Calculations
// ---------------------------------------------------------------------------

describe('calculateCartTotals', () => {
    it('calculates subtotal correctly for multiple items', () => {
        const state: CartState = {
            ...INITIAL_CART,
            items: [
                makeItem({ unit_price: 1000, quantity: 2 }), // 20.00
                makeItem({ id: 'v2', unit_price: 500, quantity: 3 }), // 15.00
            ],
        }
        const { subtotal } = calculateCartTotals(state)
        expect(subtotal).toBe(3500) // 35.00
    })

    it('returns zero for empty cart', () => {
        const { subtotal, discountAmount, taxAmount, total } = calculateCartTotals(INITIAL_CART)
        expect(subtotal).toBe(0)
        expect(discountAmount).toBe(0)
        expect(taxAmount).toBe(0)
        expect(total).toBe(0)
    })

    it('applies percentage discount correctly', () => {
        const state: CartState = {
            ...INITIAL_CART,
            items: [makeItem({ unit_price: 1000, quantity: 1 })], // 10.00
            discount: { type: 'percentage', value: 20 },   // 20%
        }
        const { subtotal, discountAmount, total } = calculateCartTotals(state)

        expect(subtotal).toBe(1000)
        expect(discountAmount).toBe(200)  // 2.00
        expect(total).toBe(800)           // 8.00
    })

    it('applies fixed discount correctly', () => {
        const state: CartState = {
            ...INITIAL_CART,
            items: [makeItem({ unit_price: 2000, quantity: 1 })], // 20.00
            discount: { type: 'fixed', value: 500 },              // 5.00
        }
        const { subtotal, discountAmount, total } = calculateCartTotals(state)

        expect(subtotal).toBe(2000)
        expect(discountAmount).toBe(500)
        expect(total).toBe(1500)
    })

    it('caps fixed discount at subtotal (no negative totals)', () => {
        const state: CartState = {
            ...INITIAL_CART,
            items: [makeItem({ unit_price: 500, quantity: 1 })],
            discount: { type: 'fixed', value: 9999 },  // way more than subtotal
        }
        const { discountAmount, total } = calculateCartTotals(state)

        expect(discountAmount).toBe(500)  // capped
        expect(total).toBe(0)
    })

    it('calculates tax on post-discount amount', () => {
        const state: CartState = {
            ...INITIAL_CART,
            items: [makeItem({ unit_price: 10000, quantity: 1 })],
            discount: { type: 'percentage', value: 10 }, // 10% off
        }
        const taxRate = 8 // 8% Swiss VAT
        const { subtotal, discountAmount, taxAmount, total } = calculateCartTotals(state, taxRate)

        expect(subtotal).toBe(10000)
        expect(discountAmount).toBe(1000)      // 10.00
        const taxable = 10000 - 1000            // 90.00
        expect(taxAmount).toBe(Math.round(taxable * 8 / 100)) // 7.20 → 720
        expect(total).toBe(taxable + taxAmount) // 90.00 + 7.20 = 97.20
    })

    it('handles zero tax rate', () => {
        const state: CartState = {
            ...INITIAL_CART,
            items: [makeItem({ unit_price: 1000, quantity: 2 })],
        }
        const { taxAmount, total, subtotal } = calculateCartTotals(state, 0)

        expect(taxAmount).toBe(0)
        expect(total).toBe(subtotal)
    })

    it('handles default tax rate (no arg)', () => {
        const state: CartState = {
            ...INITIAL_CART,
            items: [makeItem({ unit_price: 1000, quantity: 1 })],
        }
        const { taxAmount } = calculateCartTotals(state)

        expect(taxAmount).toBe(0) // default taxRate = 0
    })
})

// ---------------------------------------------------------------------------
// PAYMENT_METHODS registry
// ---------------------------------------------------------------------------

describe('PAYMENT_METHODS', () => {
    it('defines exactly 4 methods', () => {
        expect(PAYMENT_METHODS).toHaveLength(4)
    })

    it('all methods have required fields', () => {
        PAYMENT_METHODS.forEach(m => {
            expect(m.key).toBeTruthy()
            expect(m.label_key).toMatch(/^panel\.pos\./)
            expect(['basic', 'pro', 'enterprise']).toContain(m.minTier)
        })
    })

    it('cash is first (highest priority)', () => {
        expect(PAYMENT_METHODS[0].key).toBe('cash')
    })
})

// ---------------------------------------------------------------------------
// INITIAL_CART
// ---------------------------------------------------------------------------

describe('INITIAL_CART', () => {
    it('starts with empty items and cash payment', () => {
        expect(INITIAL_CART.items).toEqual([])
        expect(INITIAL_CART.discount).toBeNull()
        expect(INITIAL_CART.customer_id).toBeNull()
        expect(INITIAL_CART.customer_name).toBeNull()
        expect(INITIAL_CART.payment_method).toBe('cash')
    })
})
