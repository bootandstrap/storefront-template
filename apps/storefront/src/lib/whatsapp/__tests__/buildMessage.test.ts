import { describe, expect, it } from 'vitest'
import { buildWhatsAppMessage, buildWhatsAppURL, renderTemplate } from '../buildMessage'

const order = {
    customerName: 'Ada',
    customerPhone: '+34000000000',
    deliveryAddress: 'Main Street 1',
    notes: 'Leave at desk',
    config: { business_name: 'Boot Store' },
    items: [{
        title: 'Product A',
        quantity: 2,
        unit_price: 1250,
        variant: {
            title: 'Large',
            prices: [{ currency_code: 'eur' }],
        },
    }],
} as never

describe('WhatsApp message builders', () => {
    it('renders each blocks and simple substitutions', () => {
        const message = renderTemplate(
            'Store {{store_name}} total {{total}} {{#each items}}#{{index}} {{name}} {{variant}} {{qty}} {{unit_price}} {{price}}{{/each}}',
            order,
        )

        expect(message).toContain('Store Boot Store')
        expect(message).toContain('total')
        expect(message).toContain('#1 Product A Large 2')
    })

    it('uses fallback order template and builds encoded WhatsApp URL', () => {
        const message = buildWhatsAppMessage(order)
        const url = buildWhatsAppURL('34123456789', message)

        expect(message).toContain('Boot Store')
        expect(message).toContain('Product A x2')
        expect(url).toMatch(/^https:\/\/wa\.me\/34123456789\?text=/)
        expect(decodeURIComponent(url.split('text=')[1])).toBe(message)
    })
})
