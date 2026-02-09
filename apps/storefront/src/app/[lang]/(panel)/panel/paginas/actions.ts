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

interface PageInput {
    slug: string
    title: string
    body: string
    published?: boolean
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function createPage(
    input: PageInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()
        const { planLimits } = await getConfig()

        const { count } = await supabase
            .from('cms_pages')
            .select('*', { count: 'exact', head: true })

        const limitCheck = checkLimit(planLimits, 'max_cms_pages', count ?? 0)
        if (!limitCheck.allowed) {
            return { success: false, error: 'CMS page limit reached' }
        }

        const { error } = await supabase
            .from('cms_pages')
            .insert({
                slug: input.slug,
                title: input.title,
                body: input.body,
                published: input.published ?? false,
            })

        if (error) {
            console.error('[panel/pages] Create failed:', error)
            if (error.message.includes('duplicate')) {
                return { success: false, error: 'A page with this slug already exists' }
            }
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/pages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function updatePage(
    id: string,
    updates: Partial<PageInput>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()

        const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }

        const { error } = await supabase
            .from('cms_pages')
            .update(updateData)
            .eq('id', id)

        if (error) {
            console.error('[panel/pages] Update failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/pages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function deletePage(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()

        const { error } = await supabase
            .from('cms_pages')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[panel/pages] Delete failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/pages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

export async function togglePagePublish(
    id: string,
    published: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()

        const { error } = await supabase
            .from('cms_pages')
            .update({ published, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            console.error('[panel/pages] Toggle failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/pages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
