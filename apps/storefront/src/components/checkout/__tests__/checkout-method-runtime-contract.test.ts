import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const checkoutRoot = join(__dirname, '..')

function readCheckoutFile(fileName: string) {
    return readFileSync(join(checkoutRoot, fileName), 'utf8')
}

describe('checkout method runtime contract', () => {
    it('keeps discovery and focus lifecycles outside the modal orchestrator', () => {
        const modal = readCheckoutFile('CheckoutModal.tsx')
        const discoveryHook = readCheckoutFile('use-checkout-method-discovery.ts')
        const focusHook = readCheckoutFile('use-checkout-modal-focus.ts')

        expect(modal.split('\n').length).toBeLessThan(600)
        expect(modal).toContain(
            "import { useCheckoutMethodDiscovery, useCheckoutModalFocus } from './checkout-modal-hooks'"
        )
        expect(discoveryHook).toContain('beginCheckoutMethodRequest')
        expect(discoveryHook).toContain('invalidateCheckoutMethodRequests')
        expect(focusHook).toContain("document.addEventListener('keydown'")
        expect(focusHook).toContain("document.removeEventListener('keydown'")
    })

    it('leaves method discovery loading through a retryable fail-closed path', () => {
        const modal = readCheckoutFile('CheckoutModal.tsx')
        const discoveryHook = readCheckoutFile('use-checkout-method-discovery.ts')

        expect(discoveryHook).toContain('const [methodsError, setMethodsError]')
        expect(discoveryHook).toContain('const requestEpoch = useRef')
        expect(discoveryHook).toContain('const retryMethods = useCallback')
        expect(discoveryHook).toContain('isActive: boolean')
        expect(discoveryHook).toMatch(
            /if \(!isActive\) \{\s+setLoadingMethods\(true\)\s+return/
        )
        expect(modal).toContain("isActive: isOpen && step === 'method'")
        expect(discoveryHook).toMatch(
            /setLoadingMethods\(true\)\s+setMethodsError\(null\)\s+setSelectedMethod\(null\)/
        )
        expect(discoveryHook).toContain('canContinueMethod')
        expect(modal).toContain('if (!canContinueMethod) return')
        expect(modal).toContain("case 'method':\n                return canContinueMethod")
        expect(discoveryHook).toContain('beginCheckoutMethodRequest(requestEpoch)')
        expect(discoveryHook).toContain('isCurrentCheckoutMethodRequest(requestEpoch, requestId)')
        expect(discoveryHook).toContain('invalidateCheckoutMethodRequests(requestEpoch)')
        expect(discoveryHook).toContain('setMethodsError(null)')
        expect(discoveryHook).toContain('setAvailableMethods([])')
        expect(discoveryHook).toContain('setMethodsError(errorMessage)')
        expect(discoveryHook).toMatch(/catch\s*\{/)
        expect(discoveryHook).toMatch(/finally\s*\{[\s\S]*setLoadingMethods\(false\)/)
        expect(modal).toContain('methodsError={methodsError}')
        expect(modal).toContain('onRetryMethods={retryMethods}')
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
        expect(step).toContain('text-sm text-red-700 dark:text-red-300')
        expect(step).toContain("t('common.retry')")
    })

    it('lets runtime evidence traverse the optional shipping step', () => {
        const shippingStep = readCheckoutFile('steps/CheckoutShippingStep.tsx')
        const visualHelper = readFileSync(
            join(checkoutRoot, '../../../e2e/runtime-visual-checkout-method-evidence.ts'),
            'utf8'
        )

        expect(shippingStep).toContain('data-testid="checkout-shipping-step"')
        expect(shippingStep).toContain('data-testid="checkout-shipping-option"')
        expect(visualHelper).toContain("getByTestId('checkout-shipping-step')")
        expect(visualHelper).toContain("getByTestId('checkout-shipping-option')")
        expect(visualHelper).toContain('const CHECKOUT_STEP_TRANSITION_TIMEOUT_MS = 45_000')
        expect(visualHelper).toContain(
            'toBeVisible({ timeout: CHECKOUT_STEP_TRANSITION_TIMEOUT_MS })'
        )
    })

    it('exposes the modal and navigation controls to assistive technology', () => {
        const modal = readCheckoutFile('CheckoutModal.tsx')
        const focusHook = readCheckoutFile('use-checkout-modal-focus.ts')
        const checkoutPage = readFileSync(
            join(checkoutRoot, '../../app/[lang]/(shop)/checkout/CheckoutPageClient.tsx'),
            'utf8'
        )

        expect(modal).toContain('role="dialog"')
        expect(modal).toContain('aria-modal="true"')
        expect(modal).toContain('aria-labelledby="checkout-modal-title"')
        expect(modal).toContain('id="checkout-modal-title"')
        expect(focusHook).toContain("document.addEventListener('keydown', handleModalKeyDown)")
        expect(focusHook).toContain("document.removeEventListener('keydown', handleModalKeyDown)")
        expect(focusHook).toContain("event.key === 'Escape'")
        expect(focusHook).toContain("event.key !== 'Tab'")
        expect(focusHook).toContain('modalRef.current.contains(document.activeElement)')
        expect(focusHook).toContain('previousFocusRef.current?.focus()')
        expect(focusHook).toContain('requestAnimationFrame')
        expect(modal).toContain("aria-label={t('common.back')}")
        expect(modal).toContain("aria-label={t('common.close')}")
        expect(modal).toContain('data-testid="checkout-modal-continue"')
        expect(checkoutPage).toContain('data-testid="checkout-proceed-payment"')
    })
})
