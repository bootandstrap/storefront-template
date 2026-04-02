'use server'

import { revalidatePanel } from '@/lib/revalidate'
import { withPanelGuard } from '@/lib/panel-guard'
import { checkLimit } from '@/lib/limits'
import { buildLimitError } from '@/lib/limit-errors'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import { PageInputSchema, PageUpdateSchema } from '@/lib/owner-validation'
import { sanitizeHtml } from '@/lib/security/sanitize-html'

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
        const { supabase, tenantId, appConfig } = await withPanelGuard()
        const parsed = PageInputSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }
        const validInput = parsed.data

        const { count } = await supabase
            .from('cms_pages')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        const limitCheck = checkLimit(appConfig.planLimits, 'max_cms_pages', count ?? 0)
        if (!limitCheck.allowed) {
            return { success: false, error: buildLimitError('max_cms_pages', limitCheck) }
        }

        const { error } = await supabase
            .from('cms_pages')
            .insert({
                tenant_id: tenantId,
                slug: validInput.slug,
                title: validInput.title,
                body: sanitizeHtml(validInput.body),
                published: validInput.published ?? false,
            })

        if (error) {
            console.error('[panel/pages] Create failed:', error)
            if (error.message.includes('duplicate')) {
                return { success: false, error: 'A page with this slug already exists' }
            }
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
        logOwnerAction(tenantId, 'page.create', { slug: validInput.slug, title: validInput.title })
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
        const { supabase, tenantId } = await withPanelGuard()
        const parsed = PageUpdateSchema.safeParse(updates)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }

        const validData = parsed.data
        // Sanitize body HTML before persisting (prevent stored XSS)
        const updateData: Record<string, unknown> = {
            ...validData,
            ...(validData.body !== undefined ? { body: sanitizeHtml(validData.body) } : {}),
            updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
            .from('cms_pages')
            .update(updateData)
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/pages] Update failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
        logOwnerAction(tenantId, 'page.update', { pageId: id, fields: Object.keys(updates) })
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
        const { supabase, tenantId } = await withPanelGuard()

        const { error } = await supabase
            .from('cms_pages')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/pages] Delete failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
        logOwnerAction(tenantId, 'page.delete', { pageId: id })
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
        const { supabase, tenantId } = await withPanelGuard()

        const { error } = await supabase
            .from('cms_pages')
            .update({ published, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/pages] Toggle failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
        logOwnerAction(tenantId, 'page.toggle_publish', { pageId: id, published })
        return { success: true }
    } catch (err) {
        console.error('[panel/pages] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
