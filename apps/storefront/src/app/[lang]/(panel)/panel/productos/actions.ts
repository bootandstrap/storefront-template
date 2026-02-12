'use server'

import { revalidatePanel } from '@/lib/revalidate'
import {
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
    if (!data.title.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }
    if (data.price < 0) {
        return { success: false, error: 'El precio no puede ser negativo' }
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

    const result = await createAdminProduct(input)
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
    if (data.title !== undefined && !data.title.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }

    // Update product fields
    const updateData: Partial<CreateProductInput> = {}
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description.trim() || undefined
    if (data.status !== undefined) updateData.status = data.status
    if (data.categoryId !== undefined) {
        updateData.categories = data.categoryId ? [{ id: data.categoryId }] : []
    }

    const result = await updateAdminProduct(id, updateData)
    if (result.error) {
        return { success: false, error: result.error }
    }

    // Update price separately if provided
    if (data.price !== undefined && data.variantId && data.currency) {
        const priceResult = await updateVariantPrices(id, data.variantId, [
            { amount: Math.round(data.price * 100), currency_code: data.currency },
        ])
        if (priceResult.error) {
            return { success: false, error: priceResult.error }
        }
    }

    revalidatePanel('all')

    return { success: true }
}

export async function removeProduct(id: string): Promise<ActionResult> {
    const result = await deleteAdminProduct(id)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')

    return { success: true }
}

// ---------------------------------------------------------------------------
// Product Images
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadProductImage(
    productId: string,
    formData: FormData
): Promise<ActionResult> {
    const file = formData.get('file') as File | null
    if (!file) {
        return { success: false, error: 'No file provided' }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }
    }

    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'Image must be under 5 MB' }
    }

    // 1. Upload to Medusa storage
    const uploadResult = await uploadFiles([file])
    if (uploadResult.error || uploadResult.files.length === 0) {
        return { success: false, error: uploadResult.error ?? 'Upload failed' }
    }

    // 2. Get current product images
    const product = await getAdminProduct(productId)
    if (!product) {
        return { success: false, error: 'Product not found' }
    }

    // 3. Append uploaded image(s) to product
    const existingImages = (product.images ?? []).map(img => ({ url: img.url }))
    const newImages = uploadResult.files.map(f => ({ url: f.url }))
    const allImages = [...existingImages, ...newImages]

    const updateResult = await updateProductImages(productId, allImages)
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
    const result = await deleteProductImage(productId, imageUrl)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')
    return { success: true }
}
