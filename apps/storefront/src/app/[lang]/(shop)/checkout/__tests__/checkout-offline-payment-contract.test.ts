import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const checkoutDir = join(__dirname, '..')

describe('checkout offline payment contract', () => {
    it('initializes a system payment session before completing COD orders', () => {
        const orders = readFileSync(join(checkoutDir, 'checkout-orders.ts'), 'utf-8')
        const codStart = orders.indexOf('export async function submitCODOrder')
        const whatsappStart = orders.indexOf('export async function submitWhatsAppOrder')
        const codBlock = orders.slice(codStart, whatsappStart)

        expect(codBlock).toContain('await initializeOfflinePaymentSession(cartId)')
        expect(codBlock.indexOf('await initializeOfflinePaymentSession(cartId)')).toBeLessThan(
            codBlock.indexOf('const result = await completeCart(cartId)')
        )
    })

    it('initializes a system payment session before completing WhatsApp and bank-transfer orders', () => {
        const orders = readFileSync(join(checkoutDir, 'checkout-orders.ts'), 'utf-8')
        const bankStart = orders.indexOf('export async function submitBankTransferOrder')
        const codStart = orders.indexOf('export async function submitCODOrder')
        const whatsappStart = orders.indexOf('export async function submitWhatsAppOrder')
        const bankBlock = orders.slice(bankStart, codStart)
        const whatsappBlock = orders.slice(whatsappStart)

        expect(bankBlock).toContain('await initializeOfflinePaymentSession(cartId)')
        expect(whatsappBlock).toContain('await initializeOfflinePaymentSession(cartId)')
    })

    it('uses the Medusa system payment provider id for simulator/offline checkout', () => {
        const orders = readFileSync(join(checkoutDir, 'checkout-orders.ts'), 'utf-8')

        expect(orders).toContain("const OFFLINE_PAYMENT_PROVIDER_ID = 'pp_system_default'")
        expect(orders).toContain('provider_id: OFFLINE_PAYMENT_PROVIDER_ID')
    })

    it('uses the Medusa v2 payment collection API instead of the removed cart payment-sessions endpoint', () => {
        const orders = readFileSync(join(checkoutDir, 'checkout-orders.ts'), 'utf-8')
        const stripe = readFileSync(join(checkoutDir, 'checkout-stripe.ts'), 'utf-8')

        expect(orders).toContain('/store/payment-collections')
        expect(orders).toContain('/store/payment-collections/${paymentCollection.id}/payment-sessions')
        expect(orders).not.toContain('/store/carts/${cartId}/payment-sessions')
        expect(stripe).toContain('/store/payment-collections')
        expect(stripe).toContain('/store/payment-collections/${paymentCollection.id}/payment-sessions')
        expect(stripe).not.toContain('/store/carts/${cartId}/payment-sessions')
    })
})
