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
        expect(hydrationBlock).not.toContain('localStorage.removeItem(CART_ID_KEY)')
    })
})
