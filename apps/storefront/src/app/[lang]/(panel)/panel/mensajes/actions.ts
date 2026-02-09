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
        const { supabase } = await requirePanelAuth()
        const { planLimits } = await getConfig()

        const { count } = await supabase
            .from('whatsapp_templates')
            .select('*', { count: 'exact', head: true })

        const limitCheck = checkLimit(planLimits, 'max_whatsapp_templates', count ?? 0)
        if (!limitCheck.allowed) {
            return { success: false, error: 'WhatsApp template limit reached' }
        }

        // If this is the default, unset other defaults
        if (input.is_default) {
            await supabase
                .from('whatsapp_templates')
                .update({ is_default: false })
                .eq('is_default', true)
        }

        const { error } = await supabase
            .from('whatsapp_templates')
            .insert({
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
        const { supabase } = await requirePanelAuth()

        // If setting as default, unset other defaults
        if (updates.is_default) {
            await supabase
                .from('whatsapp_templates')
                .update({ is_default: false })
                .eq('is_default', true)
        }

        const { error } = await supabase
            .from('whatsapp_templates')
            .update(updates)
            .eq('id', id)

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
        const { supabase } = await requirePanelAuth()

        const { error } = await supabase
            .from('whatsapp_templates')
            .delete()
            .eq('id', id)

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
