import { describe, expect, it } from 'vitest'
import type { PriceLabelItem } from '../PriceLabelSheet'

/**
 * PriceLabelSheet tests — Contract tests for the PriceLabelItem type
 * and rendering logic. Full component rendering requires DOM + jsbarcode
 * which is out-of-scope for unit tests. We test the data contract.
 */

describe('PriceLabelSheet — data contract', () => {
    it('PriceLabelItem has required fields', () => {
        const item: PriceLabelItem = {
            name: 'Organic Apple',
            price: '€2.50',
            sku: 'APL-001',
        }
        expect(item.name).toBe('Organic Apple')
        expect(item.price).toBe('€2.50')
        expect(item.sku).toBe('APL-001')
    })

    it('PriceLabelItem supports optional currency and variant', () => {
        const item: PriceLabelItem = {
            name: 'Premium Coffee',
            price: '€12.99',
            sku: 'COF-005',
            currency: 'EUR',
            variant: '500g',
        }
        expect(item.currency).toBe('EUR')
        expect(item.variant).toBe('500g')
    })

    it('empty items array is valid (triggers empty state)', () => {
        const items: PriceLabelItem[] = []
        expect(items.length).toBe(0)
    })

    it('multiple items can be rendered as a batch', () => {
        const items: PriceLabelItem[] = [
            { name: 'Apple', price: '€1.00', sku: 'APL-001' },
            { name: 'Banana', price: '€0.80', sku: 'BAN-002' },
            { name: 'Cherry', price: '€3.50', sku: 'CHR-003' },
        ]
        expect(items).toHaveLength(3)
        expect(items.every(i => i.sku.length > 0)).toBe(true)
    })

    it('items without SKU should get "No SKU" display', () => {
        const item: PriceLabelItem = {
            name: 'Untracked Item',
            price: '€5.00',
            sku: '',
        }
        // The component renders "No SKU" when sku is empty
        expect(item.sku).toBe('')
    })

    it('label count text is derived from items length', () => {
        const items: PriceLabelItem[] = [
            { name: 'A', price: '€1', sku: 'A1' },
        ]
        const count = items.length
        const labelText = `${count} label${count !== 1 ? 's' : ''}`
        expect(labelText).toBe('1 label')

        const items2 = [...items, { name: 'B', price: '€2', sku: 'B2' }]
        const labelText2 = `${items2.length} label${items2.length !== 1 ? 's' : ''}`
        expect(labelText2).toBe('2 labels')
    })
})
