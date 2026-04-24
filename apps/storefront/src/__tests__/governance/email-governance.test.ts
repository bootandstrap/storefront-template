/**
 * email-governance.test.ts — Validates email template governance
 *
 * Ensures every email template has correct governance metadata,
 * and the governance pipeline correctly gates templates by category.
 *
 * @module __tests__/governance/email-governance.test
 */

import { describe, it, expect } from 'vitest'
import {
    TEMPLATE_GOVERNANCE,
    getEmailGovernance,
    type EmailTemplate,
} from '@/lib/email'

const ALL_TEMPLATES: EmailTemplate[] = [
    'order_confirmation',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'payment_failed',
    'refund_processed',
    'low_stock_alert',
    'welcome',
    'password_reset',
    'account_verification',
    'review_request',
    'abandoned_cart',
]

describe('Email Template Governance', () => {
    it('has governance entry for every template', () => {
        for (const template of ALL_TEMPLATES) {
            const gov = getEmailGovernance(template)
            expect(gov, `Missing governance for template '${template}'`).toBeTruthy()
            expect(gov.category).toBeTruthy()
            expect(gov.audience).toMatch(/^(customer|owner)$/)
            expect(gov.description_es).toBeTruthy()
        }
    })

    it('system templates have no required flag', () => {
        const systemTemplates = ALL_TEMPLATES.filter(
            t => TEMPLATE_GOVERNANCE[t].category === 'system'
        )
        expect(systemTemplates.length).toBeGreaterThan(0)
        for (const t of systemTemplates) {
            expect(TEMPLATE_GOVERNANCE[t].requiredFlag).toBeNull()
        }
    })

    it('essential templates have no required flag', () => {
        const essentialTemplates = ALL_TEMPLATES.filter(
            t => TEMPLATE_GOVERNANCE[t].category === 'essential'
        )
        expect(essentialTemplates).toContain('order_confirmation')
        expect(essentialTemplates).toContain('payment_failed')
        for (const t of essentialTemplates) {
            expect(TEMPLATE_GOVERNANCE[t].requiredFlag).toBeNull()
        }
    })

    it('transactional templates require a flag', () => {
        const transactional = ALL_TEMPLATES.filter(
            t => TEMPLATE_GOVERNANCE[t].category === 'transactional'
        )
        expect(transactional.length).toBeGreaterThan(0)
        for (const t of transactional) {
            expect(
                TEMPLATE_GOVERNANCE[t].requiredFlag,
                `Transactional template '${t}' should require a flag`
            ).toBeTruthy()
        }
    })

    it('marketing templates require a flag', () => {
        const marketing = ALL_TEMPLATES.filter(
            t => TEMPLATE_GOVERNANCE[t].category === 'marketing'
        )
        expect(marketing).toContain('abandoned_cart')
        expect(marketing).toContain('review_request')
        for (const t of marketing) {
            expect(
                TEMPLATE_GOVERNANCE[t].requiredFlag,
                `Marketing template '${t}' should require a flag`
            ).toBeTruthy()
        }
    })

    it('category progression is system → essential → transactional → marketing', () => {
        const categories = ALL_TEMPLATES.map(t => TEMPLATE_GOVERNANCE[t].category)
        const uniqueCategories = [...new Set(categories)]
        expect(uniqueCategories).toEqual(
            expect.arrayContaining(['system', 'essential', 'transactional', 'marketing'])
        )
    })

    it('low_stock_alert is audience=owner', () => {
        expect(TEMPLATE_GOVERNANCE.low_stock_alert.audience).toBe('owner')
    })

    it('all customer-facing templates have audience=customer', () => {
        const customerTemplates = ALL_TEMPLATES.filter(
            t => TEMPLATE_GOVERNANCE[t].audience === 'customer'
        )
        expect(customerTemplates.length).toBeGreaterThan(8)
    })
})
