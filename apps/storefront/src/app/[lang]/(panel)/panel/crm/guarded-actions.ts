'use server'

/**
 * CRM Guarded Actions — Owner Panel
 *
 * Server-side limit enforcement for CRM operations.
 * Enforces `max_crm_contacts` when creating contacts via Medusa customer API.
 *
 * Decision: 100% Medusa-based CRM (no Supabase CRM tables).
 * Each tenant has an isolated Medusa instance.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { checkLimit } from '@/lib/limits'
import { buildLimitError } from '@/lib/limit-errors'
import { revalidatePanel } from '@/lib/revalidate'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { getAdminCustomers, updateCustomerMetadata } from '@/lib/medusa/admin'
import { adminFetch } from '@/lib/medusa/admin-core'
import { logger } from '@/lib/logger'

interface ActionResult {
    success: boolean
    error?: string
}

// ---------------------------------------------------------------------------
// Create CRM Contact (with max_crm_contacts enforcement)
// ---------------------------------------------------------------------------

export async function createCrmContact(data: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    metadata?: Record<string, unknown>
}): Promise<ActionResult> {
    const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_crm' })

    if (!data.email?.trim()) {
        return { success: false, error: 'Email is required' }
    }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    // Get current customer count for limit enforcement
    const { count: currentCount } = await getAdminCustomers({ limit: 1 }, scope)
    const limitCheck = checkLimit(appConfig.planLimits, 'max_crm_contacts', currentCount)

    if (!limitCheck.allowed) {
        return { success: false, error: buildLimitError('max_crm_contacts', limitCheck) }
    }

    // Create customer in Medusa
    const { error } = await adminFetch('/admin/customers', {
        method: 'POST',
        body: JSON.stringify({
            email: data.email.trim().toLowerCase(),
            first_name: data.first_name?.trim() || undefined,
            last_name: data.last_name?.trim() || undefined,
            phone: data.phone?.trim() || undefined,
            metadata: data.metadata || {},
        }),
    }, scope)

    if (error) {
        logger.error('[crm] Create contact failed:', error)
        return { success: false, error: error.includes('already exists') ? 'Este contacto ya existe' : error }
    }

    revalidatePanel('all')
    logOwnerAction(tenantId, 'crm.create_contact', { email: data.email })

    return { success: true }
}

// ---------------------------------------------------------------------------
// Update CRM Contact
// ---------------------------------------------------------------------------

export async function updateCrmContact(
    customerId: string,
    data: {
        first_name?: string
        last_name?: string
        phone?: string
        metadata?: Record<string, unknown>
    }
): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_crm' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    const updateData: Record<string, unknown> = {}
    if (data.first_name !== undefined) updateData.first_name = data.first_name.trim()
    if (data.last_name !== undefined) updateData.last_name = data.last_name.trim()
    if (data.phone !== undefined) updateData.phone = data.phone.trim()

    if (Object.keys(updateData).length > 0) {
        const { error } = await adminFetch(`/admin/customers/${customerId}`, {
            method: 'POST',
            body: JSON.stringify(updateData),
        }, scope)

        if (error) {
            return { success: false, error }
        }
    }

    // Update metadata separately if provided
    if (data.metadata) {
        const { error } = await updateCustomerMetadata(customerId, data.metadata, scope)
        if (error) {
            return { success: false, error }
        }
    }

    revalidatePanel('all')
    logOwnerAction(tenantId, 'crm.update_contact', { customerId, fields: Object.keys(data) })

    return { success: true }
}

// ---------------------------------------------------------------------------
// Tag CRM Contact (via Medusa metadata)
// ---------------------------------------------------------------------------

export async function tagCrmContact(
    customerId: string,
    tags: string[]
): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_crm_segmentation' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    // Store tags in customer metadata (Medusa-native approach)
    const { error } = await updateCustomerMetadata(customerId, {
        crm_tags: tags.map(t => t.trim().toLowerCase()).filter(Boolean),
    }, scope)

    if (error) {
        return { success: false, error }
    }

    revalidatePanel('all')
    logOwnerAction(tenantId, 'crm.tag_contact', { customerId, tags })

    return { success: true }
}

// ---------------------------------------------------------------------------
// Delete CRM Contact
// ---------------------------------------------------------------------------

export async function deleteCrmContact(customerId: string): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_crm' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    const { error } = await adminFetch(`/admin/customers/${customerId}`, {
        method: 'DELETE',
    }, scope)

    if (error) {
        return { success: false, error }
    }

    revalidatePanel('all')
    logOwnerAction(tenantId, 'crm.delete_contact', { customerId })

    return { success: true }
}
