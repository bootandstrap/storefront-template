import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Medusa cart client', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    it('reads the updated cart from the Medusa v2 delete line item parent field', async () => {
        vi.stubEnv('MEDUSA_BACKEND_URL', 'https://medusa.example.com')
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY', 'pk_test')

        const updatedCart = {
            id: 'cart_1',
            items: [],
            total: 0,
            subtotal: 0,
            tax_total: 0,
            shipping_total: 0,
            discount_total: 0,
        }
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({
                id: 'cali_1',
                object: 'line_item',
                deleted: true,
                parent: updatedCart,
            }), { status: 200 })
        )
        vi.stubGlobal('fetch', fetchMock)

        const { removeFromCart } = await import('../client')
        const result = await removeFromCart('cart_1', 'cali_1')

        expect(result).toEqual(updatedCart)
        expect(fetchMock).toHaveBeenCalledWith(
            'https://medusa.example.com/store/carts/cart_1/line-items/cali_1',
            expect.objectContaining({
                method: 'DELETE',
                headers: expect.objectContaining({
                    'x-publishable-api-key': 'pk_test',
                }),
            })
        )
    })
})
