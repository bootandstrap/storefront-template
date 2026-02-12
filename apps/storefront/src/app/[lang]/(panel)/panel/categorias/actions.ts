'use server'

import { revalidatePanel } from '@/lib/revalidate'
import {
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
    type CreateCategoryInput,
} from '@/lib/medusa/admin'

interface ActionResult {
    success: boolean
    error?: string
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export async function createCategory(data: {
    name: string
    description?: string
}): Promise<ActionResult> {
    if (!data.name.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }

    const input: CreateCategoryInput = {
        name: data.name.trim(),
        handle: slugify(data.name),
        description: data.description?.trim() || undefined,
        is_active: true,
        is_internal: false,
    }

    const result = await createAdminCategory(input)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')

    return { success: true }
}

export async function editCategory(
    id: string,
    data: { name?: string; description?: string }
): Promise<ActionResult> {
    if (data.name !== undefined && !data.name.trim()) {
        return { success: false, error: 'El nombre es obligatorio' }
    }

    const updateData: Partial<CreateCategoryInput> = {}
    if (data.name !== undefined) {
        updateData.name = data.name.trim()
        updateData.handle = slugify(data.name)
    }
    if (data.description !== undefined) {
        updateData.description = data.description.trim() || undefined
    }

    const result = await updateAdminCategory(id, updateData)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')

    return { success: true }
}

export async function removeCategory(id: string): Promise<ActionResult> {
    const result = await deleteAdminCategory(id)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')

    return { success: true }
}
