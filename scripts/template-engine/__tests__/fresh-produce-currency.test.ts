import { describe, expect, it } from 'vitest'

import { freshProduceTemplate } from '../templates/fresh-produce'

describe('fresh produce template currency', () => {
    it('seeds COP prices for the Campifruit tenant default region', () => {
        expect(freshProduceTemplate.currency).toBe('cop')
        expect(freshProduceTemplate.country).toBe('co')

        for (const product of freshProduceTemplate.products) {
            for (const variant of product.variants) {
                expect(
                    variant.prices.some(price => price.currency_code === 'cop' && price.amount > 0),
                    `${product.handle}/${variant.sku} must include a COP price`,
                ).toBe(true)
            }
        }
    })

    it('keeps a programmable checkout method visible next to WhatsApp', () => {
        expect(freshProduceTemplate.governance.flagOverrides).toMatchObject({
            enable_whatsapp_checkout: true,
            enable_cash_on_delivery: true,
        })
        expect(freshProduceTemplate.governance.limitOverrides?.max_payment_methods).toBeGreaterThanOrEqual(2)
    })
})
