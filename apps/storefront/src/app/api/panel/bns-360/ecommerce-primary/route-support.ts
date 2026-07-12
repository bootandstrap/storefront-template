import 'server-only'

import {
    createAdminProduct,
    deleteAdminProduct,
    getAdminProduct,
    getAdminProductsFull,
    updateAdminProduct,
} from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import type {
    Bns360EcommerceMedusaClient,
    Bns360EcommerceProduct,
    Bns360EcommerceProductInput,
    Bns360EcommerceProductUpdate,
} from '@/lib/bns-360/ecommerce-primary-journey'

type MedusaProductPayload = {
    id: string
    title: string
    handle: string
    status: string
    metadata?: Record<string, unknown> | null
}

function normalizeProduct(product: MedusaProductPayload): Bns360EcommerceProduct {
    return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        status: product.status,
        metadata: product.metadata,
    }
}

export async function createBns360EcommerceMedusaClient(
    tenantId: string
): Promise<Bns360EcommerceMedusaClient> {
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        throw new Error('Medusa configuration not found')
    }

    return {
        async createProduct(input: Bns360EcommerceProductInput) {
            const { product, error } = await createAdminProduct({
                ...input,
                sales_channels: [{ id: scope.medusaSalesChannelId }],
            }, scope)
            if (error || !product) {
                throw new Error(error ?? 'Ecommerce product create returned no product')
            }
            return normalizeProduct(product)
        },

        async findProductByHandle(handle: string) {
            const { products } = await getAdminProductsFull({ limit: 10, q: handle }, scope)
            const match = products.find(product => product.handle === handle)
            return match ? normalizeProduct(match) : null
        },

        async getProduct(productId: string) {
            const product = await getAdminProduct(productId, scope)
            return product ? normalizeProduct(product) : null
        },

        async updateProduct(productId: string, input: Bns360EcommerceProductUpdate) {
            const { product, error } = await updateAdminProduct(productId, input, scope)
            if (error || !product) {
                throw new Error(error ?? 'Ecommerce product update returned no product')
            }
            return normalizeProduct(product)
        },

        async deleteProduct(productId: string) {
            const { error } = await deleteAdminProduct(productId, scope)
            if (error) {
                throw new Error(error)
            }
        },
    }
}
