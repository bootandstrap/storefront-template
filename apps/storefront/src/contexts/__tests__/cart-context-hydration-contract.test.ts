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
})
