import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const checkoutRoot = join(__dirname, '..')

function readCheckoutModal() {
    return readFileSync(join(checkoutRoot, 'CheckoutModal.tsx'), 'utf-8')
}

function handlerBlock(source: string, startMarker: string, endMarker: string) {
    const start = source.indexOf(startMarker)
    const end = source.indexOf(endMarker, start + startMarker.length)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    return source.slice(start, end)
}

describe('checkout confirmation lifecycle contract', () => {
    it('does not clear cart context before rendering successful offline order confirmation', () => {
        const modal = readCheckoutModal()
        const stripeBlock = handlerBlock(modal, 'const handleStripeSuccess', 'const handleBankTransferConfirm')
        const bankTransferBlock = handlerBlock(modal, 'const handleBankTransferConfirm', 'const handleCODConfirm')
        const codBlock = handlerBlock(modal, 'const handleCODConfirm', 'const handleWhatsAppComplete')
        const whatsAppBlock = handlerBlock(modal, 'const handleWhatsAppComplete', '// ---------------------------------------------------------------------------\n    // Validation')

        expect(stripeBlock).toContain("setStep('confirmation')")
        expect(bankTransferBlock).toContain("setStep('confirmation')")
        expect(codBlock).toContain("setStep('confirmation')")
        expect(whatsAppBlock).toContain("setStep('confirmation')")
        expect(stripeBlock).not.toContain('resetCart()')
        expect(bankTransferBlock).not.toContain('resetCart()')
        expect(codBlock).not.toContain('resetCart()')
        expect(whatsAppBlock).not.toContain('resetCart()')
    })

    it('clears cart context only when the confirmation modal is closed', () => {
        const modal = readCheckoutModal()
        const closeBlock = handlerBlock(modal, 'const handleModalClose', '// ---------------------------------------------------------------------------\n    // Navigation')

        expect(closeBlock).toContain("if (step === 'confirmation')")
        expect(closeBlock).toContain('resetCart()')
        expect(modal).toContain('onClick={handleModalClose}')
        expect(modal).toContain('onClose={handleModalClose}')
    })
})
