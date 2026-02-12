'use server'

import { revalidatePanel } from '@/lib/revalidate'
import { getConfig } from '@/lib/config'
import { checkLimit } from '@/lib/limits'
import { requirePanelAuth } from '@/lib/panel-auth'
import { SlideInputSchema, SlideUpdateSchema } from '@/lib/owner-validation'

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
        const { supabase, tenantId } = await requirePanelAuth()
        const parsed = SlideInputSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }
        const validInput = parsed.data
        const { planLimits } = await getConfig()

        // Count existing slides for this tenant
        const { count } = await supabase
            .from('carousel_slides')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        const limitCheck = checkLimit(planLimits, 'max_carousel_slides', count ?? 0)
        if (!limitCheck.allowed) {
            return { success: false, error: 'Carousel slide limit reached' }
        }

        // Get next sort_order for this tenant
        const { data: lastSlide } = await supabase
            .from('carousel_slides')
            .select('sort_order')
            .eq('tenant_id', tenantId)
            .order('sort_order', { ascending: false })
            .limit(1)
            .single()

        const nextOrder = (lastSlide?.sort_order ?? 0) + 1

        const { error } = await supabase
            .from('carousel_slides')
            .insert({
                tenant_id: tenantId,
                ...validInput,
                sort_order: nextOrder,
                active: validInput.active ?? true,
            })

        if (error) {
            console.error('[panel/carousel] Create failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
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
        const { supabase, tenantId } = await requirePanelAuth()
        const parsed = SlideUpdateSchema.safeParse(updates)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }

        const { error } = await supabase
            .from('carousel_slides')
            .update(parsed.data)
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/carousel] Update failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
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
        const { supabase, tenantId } = await requirePanelAuth()

        const { error } = await supabase
            .from('carousel_slides')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/carousel] Delete failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
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
        const { supabase, tenantId } = await requirePanelAuth()

        // Update sort_order for each slide (scoped to tenant)
        const updates = orderedIds.map((id, index) =>
            supabase
                .from('carousel_slides')
                .update({ sort_order: index })
                .eq('id', id)
                .eq('tenant_id', tenantId)
        )

        await Promise.all(updates)

        revalidatePanel('all')
        return { success: true }
    } catch (err) {
        console.error('[panel/carousel] Reorder error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
