'use server'

import { revalidatePanel } from '@/lib/revalidate'
import { getConfigForTenant } from '@/lib/config'
import { checkLimit } from '@/lib/limits'
import { requirePanelAuth } from '@/lib/panel-auth'
import { TemplateInputSchema, TemplateUpdateSchema } from '@/lib/owner-validation'

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
        const parsed = TemplateInputSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }
        const validInput = parsed.data
        const { planLimits } = await getConfigForTenant(tenantId)

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
                name: validInput.name,
                template: validInput.template,
                is_default: validInput.is_default ?? false,
                variables: validInput.variables ?? [],
            })

        if (error) {
            console.error('[panel/messages] Create failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('panel')
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
        const parsed = TemplateUpdateSchema.safeParse(updates)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }
        const validUpdates = parsed.data

        if (validUpdates.is_default) {
            await supabase
                .from('whatsapp_templates')
                .update({ is_default: false })
                .eq('tenant_id', tenantId)
                .eq('is_default', true)
        }

        const { error } = await supabase
            .from('whatsapp_templates')
            .update(validUpdates)
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/messages] Update failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('panel')
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

        revalidatePanel('panel')
        return { success: true }
    } catch (err) {
        console.error('[panel/messages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
