import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const srcRoot = join(__dirname, '../..')

describe('CartContext hydration contract', () => {
    it('hydrates stored carts through the local server action instead of browser-to-Medusa fetch', () => {
        const context = readFileSync(join(srcRoot, 'contexts/CartContext.tsx'), 'utf-8')

        expect(context).toContain("import { getCartAction } from '@/app/[lang]/(shop)/cart/actions'")
        expect(context).toContain('const loaded = await getCartAction(stored)')
        expect(context).not.toContain('getPublicMedusaUrl')
        expect(context).not.toContain('getRuntimeEnv')
        expect(context).not.toContain('/store/carts/${stored}')
    })

    it('keeps failed hydration distinct from a genuinely empty cart and exposes retry', () => {
        const context = readFileSync(join(srcRoot, 'contexts/CartContext.tsx'), 'utf-8')
        const hydrationBlock = context.slice(
            context.indexOf('const hydrateCart'),
            context.indexOf('const setCartId')
        )

        expect(context).toContain('hydrationError: boolean')
        expect(context).toContain('retryHydration: () => void')
        expect(context).toContain('const [hydrationError, setHydrationError] = useState(false)')
        expect(context).toContain('if (loaded) {')
        expect(context).toContain('setHydrationError(true)')
        expect(context).toContain('const retryHydration = useCallback')
        expect(context).toContain('[CartContext] Cart retrieval unavailable:')
        expect(context).not.toContain('[CartContext] Cart hydration failed:')
        expect(hydrationBlock).not.toContain('localStorage.removeItem(CART_ID_KEY)')
    })

    it('makes the cart page consume provider-owned loading, error, and retry state', () => {
        const page = readFileSync(
            join(srcRoot, 'app/[lang]/(shop)/carrito/page.tsx'),
            'utf-8'
        )

        expect(page).toContain('isLoading: isHydrating')
        expect(page).toContain('hydrationError')
        expect(page).toContain('retryHydration')
        expect(page).toContain('data-testid="cart-hydration-loading"')
        expect(page).toContain('data-testid="cart-hydration-error"')
        expect(page).toContain('data-testid="cart-hydration-retry"')
        expect(page).not.toContain('getCartAction')
        expect(page).not.toContain('useTransition')
    })

    it('makes the cart drawer consume the same provider-owned hydration state', () => {
        const drawer = readFileSync(join(srcRoot, 'components/cart/CartDrawer.tsx'), 'utf-8')

        expect(drawer).toContain('isLoading: isHydrating')
        expect(drawer).toContain('hydrationError')
        expect(drawer).toContain('retryHydration')
        expect(drawer).toContain('data-testid="cart-drawer-hydration-loading"')
        expect(drawer).toContain('data-testid="cart-drawer-hydration-error"')
        expect(drawer).toContain('data-testid="cart-drawer-hydration-retry"')
        expect(drawer).not.toContain('getCartAction')
        expect(drawer).not.toContain('useTransition')
    })
})
