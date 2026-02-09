'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getConfig } from '@/lib/config'
import { checkLimit } from '@/lib/limits'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requirePanelAuth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['owner', 'super_admin', 'admin'].includes(profile.role)) {
        throw new Error('Insufficient permissions')
    }

    return { supabase, user, role: profile.role }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlideInput {
    type: 'product' | 'image' | 'offer'
    title: string
    subtitle?: string
    image?: string
    cta_text?: string
    cta_url?: string
    medusa_product_id?: string
    active?: boolean
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function createSlide(
    input: SlideInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()
        const { planLimits } = await getConfig()

        // Count existing slides
        const { count } = await supabase
            .from('carousel_slides')
            .select('*', { count: 'exact', head: true })

        const limitCheck = checkLimit(planLimits, 'max_carousel_slides', count ?? 0)
        if (!limitCheck.allowed) {
            return { success: false, error: 'Carousel slide limit reached' }
        }

        // Get next sort_order
        const { data: lastSlide } = await supabase
            .from('carousel_slides')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .single()

        const nextOrder = (lastSlide?.sort_order ?? 0) + 1

        const { error } = await supabase
            .from('carousel_slides')
            .insert({
                ...input,
                sort_order: nextOrder,
                active: input.active ?? true,
            })

        if (error) {
            console.error('[panel/carousel] Create failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/carousel] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function updateSlide(
    id: string,
    updates: Partial<SlideInput>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()

        const { error } = await supabase
            .from('carousel_slides')
            .update(updates)
            .eq('id', id)

        if (error) {
            console.error('[panel/carousel] Update failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/carousel] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function deleteSlide(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()

        const { error } = await supabase
            .from('carousel_slides')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[panel/carousel] Delete failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/carousel] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function reorderSlides(
    orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()

        // Update sort_order for each slide
        const updates = orderedIds.map((id, index) =>
            supabase
                .from('carousel_slides')
                .update({ sort_order: index })
                .eq('id', id)
        )

        await Promise.all(updates)

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/carousel] Reorder error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
