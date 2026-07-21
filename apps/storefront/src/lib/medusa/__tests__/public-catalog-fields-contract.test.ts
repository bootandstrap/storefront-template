import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
    join(__dirname, '..', 'client.ts'),
    'utf-8',
)

function extractFunction(name: string): string {
    const start = source.indexOf(`export async function ${name}`)
    const next = source.indexOf('\nexport async function ', start + 1)
    return source.slice(start, next === -1 ? undefined : next)
}

describe('public catalog Medusa field contract', () => {
    const getProductsSource = extractFunction('getProducts')
    const getCategoriesSource = extractFunction('getCategories')

    it('uses a narrow product list field projection for public catalog pages', () => {
        expect(source).toContain('const PUBLIC_PRODUCT_LIST_FIELDS = [')
        expect(source).toContain("'id'")
        expect(source).toContain("'title'")
        expect(source).toContain("'handle'")
        expect(source).toContain("'thumbnail'")
        expect(source).toContain("'variants.calculated_price'")
        expect(source).toContain("'categories.name'")
        expect(source).toContain("searchParams.set('fields', PUBLIC_PRODUCT_LIST_FIELDS.join(','))")
    })

    it('does not request heavy public product relations for list cards', () => {
        expect(getProductsSource).not.toContain("'+categories,+images,+variants.prices,+variants.options,+variants.calculated_price,+variants.inventory_quantity'")
        expect(getProductsSource).not.toContain("'+images'")
        expect(getProductsSource).not.toContain("'+variants.options'")
        expect(getProductsSource).not.toContain("'+variants.prices'")
    })

    it('uses a narrow category projection for filter controls', () => {
        expect(source).toContain('const PUBLIC_CATEGORY_LIST_FIELDS = [')
        expect(source).toContain("categoryParams.set('fields', PUBLIC_CATEGORY_LIST_FIELDS.join(','))")
        expect(getCategoriesSource).not.toContain("'/store/product-categories?include_descendants_tree=true'")
    })
})
