'use server'

import { withPanelGuard } from '@/lib/panel-guard'
import { revalidatePanel } from '@/lib/revalidate'
import { checkLimit } from '@/lib/limits'
import { estimateTenantStorageUsage, canUploadFile } from '@/lib/storage-usage'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import {
    getProductCount,
    createAdminProduct,
    updateAdminProduct,
    deleteAdminProduct,
    updateVariantPrices,
    uploadFiles,
    updateProductImages,
    deleteProductImage,
    getAdminProduct,
    getAdminProductsFull,
    updateVariantInventory,
    type CreateProductInput,
    type AdminProductFull,
} from '@/lib/medusa/admin'

interface ActionResult {
    success: boolean
    error?: string
}

export async function createProduct(data: {
    title: string
    description?: string
    price: number
    currency: string
    categoryId?: string
    status: 'draft' | 'published'
    stockQuantity?: number
}): Promise<ActionResult> {
    const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    if (!data.title.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }
    if (data.price < 0) {
        return { success: false, error: 'El precio no puede ser negativo' }
    }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }
    const productCount = await getProductCount(scope)
    const limitCheck = checkLimit(appConfig.planLimits, 'max_products', productCount)
    if (!limitCheck.allowed) {
        return { success: false, error: 'Límite de productos alcanzado' }
    }

    const manageInventory = appConfig.config.stock_mode === 'managed'

    const input: CreateProductInput = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        status: data.status,
        categories: data.categoryId ? [{ id: data.categoryId }] : undefined,
        variants: [
            {
                title: 'Default',
                prices: [{ amount: Math.round(data.price * 100), currency_code: data.currency }],
                manage_inventory: manageInventory,
                ...(manageInventory ? { inventory_quantity: data.stockQuantity ?? 0 } : {}),
            },
        ],
    }

    const result = await createAdminProduct(input, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')

    return { success: true }
}

export async function updateProduct(
    id: string,
    data: {
        title?: string
        description?: string
        status?: 'draft' | 'published'
        categoryId?: string | null
        price?: number
        currency?: string
        variantId?: string
    }
): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    if (data.title !== undefined && !data.title.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    // Update product fields
    const updateData: Partial<CreateProductInput> = {}
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description.trim() || undefined
    if (data.status !== undefined) updateData.status = data.status
    if (data.categoryId !== undefined) {
        updateData.categories = data.categoryId ? [{ id: data.categoryId }] : []
    }

    const result = await updateAdminProduct(id, updateData, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    // Update price separately if provided
    if (data.price !== undefined && data.variantId && data.currency) {
        const priceResult = await updateVariantPrices(id, data.variantId, [
            { amount: Math.round(data.price * 100), currency_code: data.currency },
        ], scope)
        if (priceResult.error) {
            return { success: false, error: priceResult.error }
        }
    }

    revalidatePanel('all')

    return { success: true }
}

export async function removeProduct(id: string): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }
    const result = await deleteAdminProduct(id, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')

    return { success: true }
}

// ---------------------------------------------------------------------------
// Product Images
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadProductImage(
    productId: string,
    formData: FormData
): Promise<ActionResult> {
    const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    const file = formData.get('file') as File | null
    if (!file) {
        return { success: false, error: 'No file provided' }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }
    }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    // Dynamic file size limit from plan (scoped to auth tenant)
    const maxFileSizeBytes = (appConfig.planLimits.max_file_upload_mb ?? 5) * 1024 * 1024
    if (file.size > maxFileSizeBytes) {
        return { success: false, error: `El archivo excede el límite de ${appConfig.planLimits.max_file_upload_mb ?? 5} MB` }
    }

    // Check current image count against plan limit
    const product = await getAdminProduct(productId, scope)
    if (!product) {
        return { success: false, error: 'Product not found' }
    }

    const existingImages = (product.images ?? []).map(img => ({ url: img.url }))
    const imageLimit = checkLimit(appConfig.planLimits, 'max_images_per_product', existingImages.length)
    if (!imageLimit.allowed) {
        return { success: false, error: `Límite de imágenes alcanzado (${imageLimit.limit} por producto)` }
    }

    // Storage limit enforcement — check tenant-wide storage before upload
    if (appConfig.planLimits.storage_limit_mb > 0) {
        const storageUsage = await estimateTenantStorageUsage(scope)
        const storageCheck = canUploadFile(
            storageUsage.estimatedMb,
            file.size,
            appConfig.planLimits.storage_limit_mb
        )
        if (!storageCheck.allowed) {
            return {
                success: false,
                error: `Límite de almacenamiento alcanzado (${storageCheck.usedMb}/${storageCheck.limitMb} MB)`
            }
        }
    }

    // Upload to Medusa storage
    const uploadResult = await uploadFiles([file])
    if (uploadResult.error || uploadResult.files.length === 0) {
        return { success: false, error: uploadResult.error ?? 'Upload failed' }
    }

    // Append uploaded image(s) to product
    const newImages = uploadResult.files.map(f => ({ url: f.url }))
    const allImages = [...existingImages, ...newImages]

    const updateResult = await updateProductImages(productId, allImages, scope)
    if (updateResult.error) {
        return { success: false, error: updateResult.error }
    }

    revalidatePanel('all')
    return { success: true }
}

export async function removeProductImage(
    productId: string,
    imageUrl: string
): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }
    const result = await deleteProductImage(productId, imageUrl, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')
    return { success: true }
}

// ---------------------------------------------------------------------------
// Stock / Inventory
// ---------------------------------------------------------------------------

export async function updateProductStock(
    productId: string,
    variantId: string,
    quantity: number
): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    if (typeof quantity !== 'number' || quantity < 0) {
        return { success: false, error: 'La cantidad debe ser un número positivo' }
    }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }
    const result = await updateVariantInventory(productId, variantId, {
        manage_inventory: true,
        inventory_quantity: Math.round(quantity),
    }, scope)

    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')
    return { success: true }
}

// ---------------------------------------------------------------------------
// Bulk Actions
// ---------------------------------------------------------------------------

export async function bulkUpdateStatus(
    ids: string[],
    status: 'published' | 'draft'
): Promise<ActionResult & { updated: number }> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    if (!ids.length) return { success: false, error: 'No products selected', updated: 0 }
    if (ids.length > 100) return { success: false, error: 'Maximum 100 products per batch', updated: 0 }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found', updated: 0 }
    }
    let updated = 0
    const errors: string[] = []

    for (const id of ids) {
        const result = await updateAdminProduct(id, { status }, scope)
        if (result.error) errors.push(`${id}: ${result.error}`)
        else updated++
    }

    revalidatePanel('all')
    return {
        success: errors.length === 0,
        updated,
        error: errors.length ? `${errors.length} failed: ${errors[0]}` : undefined,
    }
}

export async function bulkDeleteProducts(
    ids: string[]
): Promise<ActionResult & { deleted: number }> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    if (!ids.length) return { success: false, error: 'No products selected', deleted: 0 }
    if (ids.length > 50) return { success: false, error: 'Maximum 50 products per batch delete', deleted: 0 }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found', deleted: 0 }
    }
    let deleted = 0
    const errors: string[] = []

    for (const id of ids) {
        const result = await deleteAdminProduct(id, scope)
        if (result.error) errors.push(`${id}: ${result.error}`)
        else deleted++
    }

    revalidatePanel('all')
    return {
        success: errors.length === 0,
        deleted,
        error: errors.length ? `${errors.length} failed: ${errors[0]}` : undefined,
    }
}

export async function exportProductsCsv(): Promise<{ success: boolean; csv?: string; error?: string }> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_ecommerce' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    const result = await getAdminProductsFull({ limit: 1000 }, scope)
    if (!result.products) {
        return { success: false, error: 'Failed to fetch products' }
    }

    const products = result.products
    const header = 'title,description,status,price,currency,category'
    const rows = products.map((p: AdminProductFull) => {
        const price = p.variants?.[0]?.prices?.[0]
        const cat = p.categories?.[0]?.name ?? ''
        return [
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.description || '').replace(/"/g, '""')}"`,
            p.status,
            price ? String(price.amount / 100) : '0',
            price?.currency_code ?? 'eur',
            `"${cat.replace(/"/g, '""')}"`,
        ].join(',')
    })

    return { success: true, csv: [header, ...rows].join('\n') }
}
