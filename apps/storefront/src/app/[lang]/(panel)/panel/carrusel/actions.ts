'use server'

import { revalidatePanel } from '@/lib/revalidate'
import { withPanelGuard } from '@/lib/panel-guard'
import { checkLimit } from '@/lib/limits'
import { buildLimitError } from '@/lib/limit-errors'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
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
        const { supabase, tenantId, appConfig } = await withPanelGuard()
        const parsed = SlideInputSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }
        const validInput = parsed.data

        // Count existing slides for this tenant
        const { count } = await supabase
            .from('carousel_slides')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        const limitCheck = checkLimit(appConfig.planLimits, 'max_carousel_slides', count ?? 0)
        if (!limitCheck.allowed) {
            return { success: false, error: buildLimitError('max_carousel_slides', limitCheck) }
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
        logOwnerAction(tenantId, 'carousel.create', { type: validInput.type, title: validInput.title })
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
        const { supabase, tenantId } = await withPanelGuard()
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
        logOwnerAction(tenantId, 'carousel.update', { slideId: id, fields: Object.keys(updates) })
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
        const { supabase, tenantId } = await withPanelGuard()

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
        logOwnerAction(tenantId, 'carousel.delete', { slideId: id })
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
        const { supabase, tenantId } = await withPanelGuard()

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
        logOwnerAction(tenantId, 'carousel.reorder', { count: orderedIds.length })
        return { success: true }
    } catch (err) {
        console.error('[panel/carousel] Reorder error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
