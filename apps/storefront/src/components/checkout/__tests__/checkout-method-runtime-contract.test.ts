import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const checkoutRoot = join(__dirname, '..')

function readCheckoutFile(fileName: string) {
    return readFileSync(join(checkoutRoot, fileName), 'utf8')
}

describe('checkout method runtime contract', () => {
    it('leaves method discovery loading through a retryable fail-closed path', () => {
        const modal = readCheckoutFile('CheckoutModal.tsx')

        expect(modal).toContain('const [methodsError, setMethodsError]')
        expect(modal).toContain('const methodsRequestEpoch = useRef')
        expect(modal).toContain('const loadMethods = useCallback')
        expect(modal).toContain('beginCheckoutMethodRequest(methodsRequestEpoch)')
        expect(modal).toContain('isCurrentCheckoutMethodRequest(methodsRequestEpoch, requestId)')
        expect(modal).toContain('invalidateCheckoutMethodRequests(methodsRequestEpoch)')
        expect(modal).toContain('setMethodsError(null)')
        expect(modal).toContain('setAvailableMethods([])')
        expect(modal).toContain("setMethodsError(t('checkout.errors.methodsLoad'))")
        expect(modal).toMatch(/catch\s*\{/)
        expect(modal).toMatch(/finally\s*\{[\s\S]*setLoadingMethods\(false\)/)
        expect(modal).toContain('methodsError={methodsError}')
        expect(modal).toContain('onRetryMethods={loadMethods}')
    })

    it('renders distinct accessible loading, empty, and error method states', () => {
        const step = readCheckoutFile('steps/CheckoutMethodStep.tsx')

        expect(step).toContain('methodsError: string | null')
        expect(step).toContain('onRetryMethods: () => void')
        expect(step).toContain('data-testid="checkout-methods-loading"')
        expect(step).toContain('data-testid="checkout-methods-error"')
        expect(step).toContain('data-testid="checkout-methods-retry"')
        expect(step).toContain('data-testid="checkout-methods-empty"')
        expect(step).toContain('role="status"')
        expect(step).toContain('role="alert"')
        expect(step).toContain("t('common.retry')")
    })

    it('exposes the modal and navigation controls to assistive technology', () => {
        const modal = readCheckoutFile('CheckoutModal.tsx')
        const checkoutPage = readFileSync(
            join(checkoutRoot, '../../app/[lang]/(shop)/checkout/CheckoutPageClient.tsx'),
            'utf8'
        )

        expect(modal).toContain('role="dialog"')
        expect(modal).toContain('aria-modal="true"')
        expect(modal).toContain('aria-labelledby="checkout-modal-title"')
        expect(modal).toContain('id="checkout-modal-title"')
        expect(modal).toContain("document.addEventListener('keydown', handleModalKeyDown)")
        expect(modal).toContain("document.removeEventListener('keydown', handleModalKeyDown)")
        expect(modal).toContain("event.key === 'Escape'")
        expect(modal).toContain("event.key !== 'Tab'")
        expect(modal).toContain('modalRef.current.contains(document.activeElement)')
        expect(modal).toContain('previousFocusRef.current?.focus()')
        expect(modal).toContain('requestAnimationFrame')
        expect(modal).toContain("aria-label={t('common.back')}")
        expect(modal).toContain("aria-label={t('common.close')}")
        expect(modal).toContain('data-testid="checkout-modal-continue"')
        expect(checkoutPage).toContain('data-testid="checkout-proceed-payment"')
    })
})
