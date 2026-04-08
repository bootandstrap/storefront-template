/**
 * Seeder: Catalog (Categories + Products)
 *
 * Creates categories and products defined in the template.
 * Idempotent: skips existing products by handle.
 */

import { MedusaClient } from '../medusa-client'
import type { IndustryTemplate, LogFn } from '../types'

interface CatalogResult {
    categoriesCreated: number
    productsCreated: number
    productIds: string[]
    variantIds: string[]
}

export async function seedCatalog(
    client: MedusaClient,
    template: IndustryTemplate,
    salesChannelId: string,
    log: LogFn
): Promise<CatalogResult> {
    log('📦', '═══ CATALOG SEED START ═══')

    // ── 1) Categories ──
    const existingCategories = await client.getCategories()
    const categoryMap = new Map<string, string>() // handle → id

    for (const cat of existingCategories) {
        categoryMap.set(cat.handle, cat.id)
    }

    let categoriesCreated = 0
    for (const catDef of template.categories) {
        if (categoryMap.has(catDef.handle)) {
            log('⏭️', `Category exists: ${catDef.name}`)
            continue
        }

        try {
            const res = await client.request<{ product_category: { id: string } }>('/admin/product-categories', {
                body: {
                    name: catDef.name,
                    handle: catDef.handle,
                    description: catDef.description,
                    is_active: true,
                    is_internal: false,
                },
            })
            categoryMap.set(catDef.handle, res.product_category.id)
            categoriesCreated++
            log('✅', `Category created: ${catDef.name}`)
        } catch (err) {
            log('⚠️', `Category failed: ${catDef.name} — ${err instanceof Error ? err.message : err}`)
        }
    }

    // ── 2) Tags (must be created before products referencing them) ──
    const tagMap = new Map<string, string>() // value → id
    const allTags = new Set<string>()
    for (const p of template.products) {
        for (const t of p.tags ?? []) allTags.add(t)
    }

    if (allTags.size > 0) {
        // Try to fetch existing tags
        try {
            const existingRes = await client.request<{ product_tags: { id: string; value: string }[] }>('/admin/product-tags?limit=100')
            for (const t of existingRes.product_tags ?? []) {
                tagMap.set(t.value, t.id)
            }
        } catch { /* endpoint may not exist */ }

        // Create missing tags
        for (const tagValue of allTags) {
            if (!tagMap.has(tagValue)) {
                try {
                    const res = await client.request<{ product_tag: { id: string; value: string } }>('/admin/product-tags', {
                        body: { value: tagValue },
                    })
                    tagMap.set(tagValue, res.product_tag.id)
                } catch {
                    // Tag creation failed — skip tagging for this value
                }
            }
        }
        if (tagMap.size > 0) log('✅', `Tags ready: ${Array.from(tagMap.keys()).join(', ')}`)
    }

    // ── 3) Products ──
    const existingProducts = await client.getProducts(500)
    const existingHandles = new Set(existingProducts.map(p => p.handle))

    let productsCreated = 0
    const productIds: string[] = []
    const variantIds: string[] = []

    for (const prodDef of template.products) {
        if (existingHandles.has(prodDef.handle)) {
            // Still collect IDs from existing
            const existing = existingProducts.find(p => p.handle === prodDef.handle)
            if (existing) {
                productIds.push(existing.id)
                for (const v of existing.variants) variantIds.push(v.id)
            }
            log('⏭️', `Product exists: ${prodDef.title}`)
            continue
        }

        const categoryId = categoryMap.get(prodDef.category)

        try {
            const productBody: Record<string, unknown> = {
                title: prodDef.title,
                handle: prodDef.handle,
                description: prodDef.description,
                status: prodDef.status ?? 'published',
                weight: prodDef.weight ?? 500,
                options: [{ title: 'Variant', values: prodDef.variants.map(v => v.title) }],
                variants: prodDef.variants.map(v => ({
                    title: v.title,
                    sku: v.sku,
                    manage_inventory: v.manage_inventory ?? true,
                    prices: v.prices,
                    options: { Variant: v.title },
                })),
                sales_channels: [{ id: salesChannelId }],
            }

            if (categoryId) {
                productBody.categories = [{ id: categoryId }]
            }

            if (prodDef.thumbnail) {
                productBody.thumbnail = prodDef.thumbnail
            }

            if (prodDef.images?.length) {
                productBody.images = prodDef.images.map(url => ({ url }))
            }

            if (prodDef.tags?.length) {
                const tagIds = prodDef.tags
                    .map(value => tagMap.get(value))
                    .filter((id): id is string => !!id)
                if (tagIds.length) {
                    productBody.tags = tagIds.map(id => ({ id }))
                }
            }

            const res = await client.request<{ product: { id: string; variants: { id: string }[] } }>('/admin/products', {
                body: productBody,
            })

            productIds.push(res.product.id)
            for (const v of (res.product.variants ?? [])) {
                variantIds.push(v.id)
            }
            productsCreated++
            log('✅', `Product created: ${prodDef.title} (${prodDef.variants.length} variants)`)
        } catch (err) {
            log('⚠️', `Product failed: ${prodDef.title} — ${err instanceof Error ? err.message : err}`)
        }
    }

    log('📦', `═══ CATALOG SEED COMPLETE: ${categoriesCreated} cats, ${productsCreated} products ═══`)

    return { categoriesCreated, productsCreated, productIds, variantIds }
}
