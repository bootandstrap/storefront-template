'use server'

import { requirePanelAuth } from '@/lib/panel-auth'
import { revalidatePanel } from '@/lib/revalidate'
import { getConfigForTenant } from '@/lib/config'
import { checkLimit } from '@/lib/limits'
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
    type CreateProductInput,
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
}): Promise<ActionResult> {
    const { tenantId } = await requirePanelAuth()
    if (!data.title.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }
    if (data.price < 0) {
        return { success: false, error: 'El precio no puede ser negativo' }
    }

    const scope = await getTenantMedusaScope(tenantId)
    const [{ planLimits }, productCount] = await Promise.all([
        getConfigForTenant(tenantId),
        getProductCount(scope),
    ])
    const limitCheck = checkLimit(planLimits, 'max_products', productCount)
    if (!limitCheck.allowed) {
        return { success: false, error: 'Límite de productos alcanzado' }
    }

    const input: CreateProductInput = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        status: data.status,
        categories: data.categoryId ? [{ id: data.categoryId }] : undefined,
        variants: [
            {
                title: 'Default',
                prices: [{ amount: Math.round(data.price * 100), currency_code: data.currency }],
                manage_inventory: false,
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
    const { tenantId } = await requirePanelAuth()
    if (data.title !== undefined && !data.title.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }

    const scope = await getTenantMedusaScope(tenantId)

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
    const { tenantId } = await requirePanelAuth()
    const scope = await getTenantMedusaScope(tenantId)
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
    const { tenantId } = await requirePanelAuth()
    const file = formData.get('file') as File | null
    if (!file) {
        return { success: false, error: 'No file provided' }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }
    }

    const scope = await getTenantMedusaScope(tenantId)

    // Dynamic file size limit from plan (scoped to auth tenant)
    const { planLimits } = await getConfigForTenant(tenantId)
    const maxFileSizeBytes = (planLimits.max_file_upload_mb ?? 5) * 1024 * 1024
    if (file.size > maxFileSizeBytes) {
        return { success: false, error: `El archivo excede el límite de ${planLimits.max_file_upload_mb ?? 5} MB` }
    }

    // Check current image count against plan limit
    const product = await getAdminProduct(productId, scope)
    if (!product) {
        return { success: false, error: 'Product not found' }
    }

    const existingImages = (product.images ?? []).map(img => ({ url: img.url }))
    const imageLimit = checkLimit(planLimits, 'max_images_per_product', existingImages.length)
    if (!imageLimit.allowed) {
        return { success: false, error: `Límite de imágenes alcanzado (${imageLimit.limit} por producto)` }
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
    const { tenantId } = await requirePanelAuth()
    const scope = await getTenantMedusaScope(tenantId)
    const result = await deleteProductImage(productId, imageUrl, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')
    return { success: true }
}
