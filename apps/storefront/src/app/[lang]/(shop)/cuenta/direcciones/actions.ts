'use server'

import { revalidatePath } from 'next/cache'
import {
    createAuthAddress,
    updateAuthAddress,
    deleteAuthAddress,
} from '@/lib/medusa/auth-medusa'
import { logger } from '@/lib/logger'

// ─── Create address ───────────────────────────────────────────
export async function createAddressAction(formData: {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    province?: string
    postal_code: string
    country_code: string
    phone?: string
    company?: string
}) {
    try {
        const address = await createAuthAddress({
            first_name: formData.first_name,
            last_name: formData.last_name,
            address_1: formData.address_1,
            address_2: formData.address_2 || null,
            city: formData.city,
            province: formData.province || null,
            postal_code: formData.postal_code,
            country_code: formData.country_code.toLowerCase(),
            phone: formData.phone || null,
            company: formData.company || null,
        })
        revalidatePath('/[lang]/cuenta/direcciones', 'page')
        return { success: true, address }
    } catch (err) {
        logger.error('[address] create failed:', err)
        return { success: false, error: 'Failed to create address' }
    }
}

// ─── Update address ───────────────────────────────────────────
export async function updateAddressAction(
    addressId: string,
    formData: {
        first_name: string
        last_name: string
        address_1: string
        address_2?: string
        city: string
        province?: string
        postal_code: string
        country_code: string
        phone?: string
        company?: string
    }
) {
    try {
        const address = await updateAuthAddress(addressId, {
            first_name: formData.first_name,
            last_name: formData.last_name,
            address_1: formData.address_1,
            address_2: formData.address_2 || null,
            city: formData.city,
            province: formData.province || null,
            postal_code: formData.postal_code,
            country_code: formData.country_code.toLowerCase(),
            phone: formData.phone || null,
            company: formData.company || null,
        })
        revalidatePath('/[lang]/cuenta/direcciones', 'page')
        return { success: true, address }
    } catch (err) {
        logger.error('[address] update failed:', err)
        return { success: false, error: 'Failed to update address' }
    }
}

// ─── Delete address ───────────────────────────────────────────
export async function deleteAddressAction(addressId: string) {
    try {
        await deleteAuthAddress(addressId)
        revalidatePath('/[lang]/cuenta/direcciones', 'page')
        return { success: true }
    } catch (err) {
        logger.error('[address] delete failed:', err)
        return { success: false, error: 'Failed to delete address' }
    }
}

// ─── Set default address ──────────────────────────────────────
export async function setDefaultAddressAction(addressId: string) {
    try {
        await updateAuthAddress(addressId, {
            is_default_shipping: true,
        })
        revalidatePath('/[lang]/cuenta/direcciones', 'page')
        return { success: true }
    } catch (err) {
        logger.error('[address] setDefault failed:', err)
        return { success: false, error: 'Failed to set default address' }
    }
}
