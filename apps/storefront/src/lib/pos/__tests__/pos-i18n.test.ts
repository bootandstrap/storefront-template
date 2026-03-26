/**
 * POS i18n Tests — Labels, posLabel resolver, upsell tooltips
 *
 * Tests that:
 * - POS_DEFAULT_LABELS covers all required keys
 * - posLabel() resolves correctly with/without dictionary
 * - getUpsellTooltip() returns proper upsell strings
 * - POS_PAYMENT_CONFIG has correct structure
 * - REFUND_REASONS covers all RefundReason values
 */

import { describe, it, expect } from 'vitest'
import {
    POS_DEFAULT_LABELS,
    POS_PAYMENT_CONFIG,
    REFUND_REASONS,
    posLabel,
    getUpsellTooltip,
    getRequiredTier,
} from '../pos-i18n'

// ---------------------------------------------------------------------------
// POS_DEFAULT_LABELS completeness
// ---------------------------------------------------------------------------

describe('POS_DEFAULT_LABELS', () => {
    it('has at least 100 label entries', () => {
        const count = Object.keys(POS_DEFAULT_LABELS).length
        expect(count).toBeGreaterThanOrEqual(100)
    })

    it('all keys start with panel.pos.', () => {
        Object.keys(POS_DEFAULT_LABELS).forEach(key => {
            expect(key).toMatch(/^panel\.pos\./)
        })
    })

    it('no values are empty strings', () => {
        Object.entries(POS_DEFAULT_LABELS).forEach(([key, value]) => {
            expect(value, `Empty label for key: ${key}`).toBeTruthy()
        })
    })

    it('contains essential core labels', () => {
        const essentialKeys = [
            'panel.pos.title',
            'panel.pos.search',
            'panel.pos.cart',
            'panel.pos.emptyCart',
            'panel.pos.total',
            'panel.pos.charge',
            'panel.pos.cash',
            'panel.pos.cardTerminal',
            'panel.pos.processing',
            'panel.pos.paymentSuccess',
            'panel.pos.paymentFailed',
            'panel.pos.newSale',
            'panel.pos.printReceipt',
            'panel.pos.saleComplete',
            'panel.pos.history',
            'panel.pos.dashboard',
            'panel.pos.shift',
        ]
        essentialKeys.forEach(key => {
            expect(POS_DEFAULT_LABELS[key], `Missing essential label: ${key}`).toBeTruthy()
        })
    })

    it('contains all refund labels', () => {
        const refundKeys = [
            'panel.pos.refundTitle',
            'panel.pos.selectItems',
            'panel.pos.refundReason',
            'panel.pos.refundComplete',
            'panel.pos.refundDamaged',
            'panel.pos.refundWrongItem',
            'panel.pos.refundDissatisfied',
            'panel.pos.refundOther',
            'panel.pos.fullRefund',
            'panel.pos.partialRefund',
            'panel.pos.processRefund',
            'panel.pos.confirmRefundTitle',
        ]
        refundKeys.forEach(key => {
            expect(POS_DEFAULT_LABELS[key], `Missing refund label: ${key}`).toBeTruthy()
        })
    })

    it('contains all customer modal labels', () => {
        const customerKeys = [
            'panel.pos.addCustomer',
            'panel.pos.walkIn',
            'panel.pos.nameEmailRequired',
            'panel.pos.noCustomersFound',
            'panel.pos.createNew',
            'panel.pos.newCustomer',
            'panel.pos.firstName',
            'panel.pos.lastName',
            'panel.pos.createAndSelect',
        ]
        customerKeys.forEach(key => {
            expect(POS_DEFAULT_LABELS[key], `Missing customer label: ${key}`).toBeTruthy()
        })
    })

    it('contains all shift panel labels', () => {
        const shiftKeys = [
            'panel.pos.openShift',
            'panel.pos.closeShift',
            'panel.pos.currentShift',
            'panel.pos.openingCash',
            'panel.pos.closingCash',
            'panel.pos.expectedCash',
            'panel.pos.shiftActive',
            'panel.pos.noActiveShift',
            'panel.pos.openShiftHint',
        ]
        shiftKeys.forEach(key => {
            expect(POS_DEFAULT_LABELS[key], `Missing shift label: ${key}`).toBeTruthy()
        })
    })

    it('contains all payment overlay labels', () => {
        const paymentKeys = [
            'panel.pos.creatingPayment',
            'panel.pos.presentCard',
            'panel.pos.scanTwint',
            'panel.pos.paymentSuccess',
            'panel.pos.paymentFailed',
            'panel.pos.cancel',
            'panel.pos.retry',
            'panel.pos.terminalPayment',
            'panel.pos.twintPayment',
        ]
        paymentKeys.forEach(key => {
            expect(POS_DEFAULT_LABELS[key], `Missing payment label: ${key}`).toBeTruthy()
        })
    })

    it('contains all dashboard labels', () => {
        const dashboardKeys = [
            'panel.pos.dashboard',
            'panel.pos.todaySales',
            'panel.pos.todayRevenue',
            'panel.pos.avgTicket',
            'panel.pos.byMethod',
            'panel.pos.topProducts',
            'panel.pos.daySummary',
            'panel.pos.totalSales',
            'panel.pos.salesByHour',
        ]
        dashboardKeys.forEach(key => {
            expect(POS_DEFAULT_LABELS[key], `Missing dashboard label: ${key}`).toBeTruthy()
        })
    })
})

// ---------------------------------------------------------------------------
// posLabel() resolver
// ---------------------------------------------------------------------------

describe('posLabel()', () => {
    it('returns label from dictionary when available', () => {
        const labels = { 'panel.pos.title': 'Point of Sale' }
        expect(posLabel('panel.pos.title', labels)).toBe('Point of Sale')
    })

    it('falls back to POS_DEFAULT_LABELS when key not in dictionary', () => {
        expect(posLabel('panel.pos.title', {})).toBe(POS_DEFAULT_LABELS['panel.pos.title'])
    })

    it('falls back to POS_DEFAULT_LABELS when labels is undefined', () => {
        expect(posLabel('panel.pos.title')).toBe(POS_DEFAULT_LABELS['panel.pos.title'])
    })

    it('returns the key itself when not found anywhere', () => {
        expect(posLabel('panel.pos.nonExistent')).toBe('panel.pos.nonExistent')
    })

    it('dictionary takes priority over defaults', () => {
        const labels = { 'panel.pos.title': 'Custom POS' }
        expect(posLabel('panel.pos.title', labels)).toBe('Custom POS')
        expect(posLabel('panel.pos.title', labels)).not.toBe(POS_DEFAULT_LABELS['panel.pos.title'])
    })
})

// ---------------------------------------------------------------------------
// POS_PAYMENT_CONFIG
// ---------------------------------------------------------------------------

describe('POS_PAYMENT_CONFIG', () => {
    it('defines exactly 4 payment methods', () => {
        expect(POS_PAYMENT_CONFIG).toHaveLength(4)
    })

    it('each config has required fields', () => {
        POS_PAYMENT_CONFIG.forEach(config => {
            expect(config.key).toBeTruthy()
            expect(config.icon).toBeTruthy()
            expect(config.labelKey).toMatch(/^panel\.pos\./)
            expect(config.label).toBeTruthy()
            expect(config.activeClass).toBeTruthy()
            expect(config.colorClass).toBeTruthy()
        })
    })

    it('keys match PAYMENT_METHODS order: cash, card_terminal, twint, manual_card', () => {
        const keys = POS_PAYMENT_CONFIG.map(c => c.key)
        expect(keys).toEqual(['cash', 'card_terminal', 'twint', 'manual_card'])
    })

    it('each labelKey exists in POS_DEFAULT_LABELS', () => {
        POS_PAYMENT_CONFIG.forEach(config => {
            expect(
                POS_DEFAULT_LABELS[config.labelKey],
                `Missing label for payment config: ${config.labelKey}`
            ).toBeTruthy()
        })
    })
})

// ---------------------------------------------------------------------------
// REFUND_REASONS
// ---------------------------------------------------------------------------

describe('REFUND_REASONS', () => {
    it('defines 4 refund reasons', () => {
        expect(REFUND_REASONS).toHaveLength(4)
    })

    it('covers all RefundReason types', () => {
        const keys = REFUND_REASONS.map(r => r.key)
        expect(keys).toContain('damaged')
        expect(keys).toContain('wrong_item')
        expect(keys).toContain('dissatisfied')
        expect(keys).toContain('other')
    })

    it('each reason has labelKey and fallback label', () => {
        REFUND_REASONS.forEach(reason => {
            expect(reason.labelKey).toMatch(/^panel\.pos\.reason\./)
            expect(reason.label).toBeTruthy()
        })
    })

    it('each labelKey exists in POS_DEFAULT_LABELS', () => {
        REFUND_REASONS.forEach(reason => {
            expect(
                POS_DEFAULT_LABELS[reason.labelKey],
                `Missing label for refund reason: ${reason.labelKey}`
            ).toBeTruthy()
        })
    })
})

// ---------------------------------------------------------------------------
// Upsell tooltips
// ---------------------------------------------------------------------------

describe('getUpsellTooltip()', () => {
    it('returns upsell string for known flags', () => {
        const upsell = getUpsellTooltip('enable_pos_kiosk')
        expect(upsell).toContain('Kiosco')
        expect(upsell).toContain('Pro')
    })

    it('returns empty string for unknown flags', () => {
        expect(getUpsellTooltip('nonexistent_flag')).toBe('')
    })

    it('prefers label from dictionary when available', () => {
        const labels = { 'panel.pos.upsell.kiosk': 'Kiosk Mode — Available in POS Pro' }
        const upsell = getUpsellTooltip('enable_pos_kiosk', labels)
        expect(upsell).toBe('Kiosk Mode — Available in POS Pro')
    })

    it('falls back to hardcoded label when not in dictionary', () => {
        const upsell = getUpsellTooltip('enable_pos_kiosk', {})
        expect(upsell).toContain('Kiosco')
    })
})

describe('getRequiredTier()', () => {
    it('returns Pro for Pro-tier flags', () => {
        expect(getRequiredTier('enable_pos_kiosk')).toBe('Pro')
        expect(getRequiredTier('enable_pos_shifts')).toBe('Pro')
    })

    it('returns Enterprise for Enterprise-tier flags', () => {
        expect(getRequiredTier('enable_pos_thermal_printer')).toBe('Enterprise')
        expect(getRequiredTier('enable_pos_line_discounts')).toBe('Enterprise')
    })

    it('defaults to Pro for unknown flags', () => {
        expect(getRequiredTier('unknown_flag')).toBe('Pro')
    })
})
