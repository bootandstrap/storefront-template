'use server'

import { revalidatePath } from 'next/cache'
import { getConfig } from '@/lib/config'
import { checkLimit } from '@/lib/limits'
import { requirePanelAuth } from '@/lib/panel-auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateInput {
    name: string
    template: string
    is_default?: boolean
    variables?: string[]
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function createTemplate(
    input: TemplateInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, tenantId } = await requirePanelAuth()
        const { planLimits } = await getConfig()

        const { count } = await supabase
            .from('whatsapp_templates')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        const limitCheck = checkLimit(planLimits, 'max_whatsapp_templates', count ?? 0)
        if (!limitCheck.allowed) {
            return { success: false, error: 'WhatsApp template limit reached' }
        }

        // If this is the default, unset other defaults for this tenant
        if (input.is_default) {
            await supabase
                .from('whatsapp_templates')
                .update({ is_default: false })
                .eq('tenant_id', tenantId)
                .eq('is_default', true)
        }

        const { error } = await supabase
            .from('whatsapp_templates')
            .insert({
                tenant_id: tenantId,
                name: input.name,
                template: input.template,
                is_default: input.is_default ?? false,
                variables: input.variables ?? [],
            })

        if (error) {
            console.error('[panel/messages] Create failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/messages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function updateTemplate(
    id: string,
    updates: Partial<TemplateInput>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, tenantId } = await requirePanelAuth()

        // If setting as default, unset other defaults for this tenant
        if (updates.is_default) {
            await supabase
                .from('whatsapp_templates')
                .update({ is_default: false })
                .eq('tenant_id', tenantId)
                .eq('is_default', true)
        }

        const { error } = await supabase
            .from('whatsapp_templates')
            .update(updates)
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/messages] Update failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/messages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function deleteTemplate(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase, tenantId } = await requirePanelAuth()

        const { error } = await supabase
            .from('whatsapp_templates')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/messages] Delete failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/messages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
