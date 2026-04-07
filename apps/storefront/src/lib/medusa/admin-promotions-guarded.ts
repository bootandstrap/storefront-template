/**
 * Guarded Promotion Operations — Server-side limit enforcement
 *
 * Wraps raw Medusa admin-promotions CRUD with plan limit checks.
 * Enforces `max_promotions_active` before creating new promotions.
 *
 * Pattern: withPanelGuard → checkLimit → medusa operation → revalidate
 *
 * @module admin-promotions-guarded
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { checkLimit } from '@/lib/limits'
import { buildLimitError } from '@/lib/limit-errors'
import { revalidatePanel } from '@/lib/revalidate'
import { logOwnerAction } from '@/lib/panel/log-owner-action'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import {
    getPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    type CreatePromotionInput,
} from './admin-promotions'

interface ActionResult {
    success: boolean
    error?: string
}

// ---------------------------------------------------------------------------
// Create Promotion (with max_promotions_active enforcement)
// ---------------------------------------------------------------------------

export async function createPromotionAction(
    data: CreatePromotionInput
): Promise<ActionResult> {
    const { tenantId, appConfig } = await withPanelGuard({ requiredFlag: 'enable_promotions' })

    if (!data.code?.trim()) {
        return { success: false, error: 'El código de promoción es obligatorio' }
    }

    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    // Count currently active (non-disabled) promotions
    const { promotions } = await getPromotions({ is_disabled: false }, scope)
    const activeCount = promotions.length
    const limitCheck = checkLimit(appConfig.planLimits, 'max_promotions_active', activeCount)

    if (!limitCheck.allowed) {
        return { success: false, error: buildLimitError('max_promotions_active', limitCheck) }
    }

    const result = await createPromotion(data, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')
    logOwnerAction(tenantId, 'promotion.create', {
        code: data.code,
        type: data.type,
        value: data.value,
    })

    return { success: true }
}

// ---------------------------------------------------------------------------
// Update Promotion
// ---------------------------------------------------------------------------

export async function updatePromotionAction(
    id: string,
    data: Partial<CreatePromotionInput> & { is_disabled?: boolean }
): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_promotions' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    const result = await updatePromotion(id, data, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')
    logOwnerAction(tenantId, 'promotion.update', { promotionId: id, fields: Object.keys(data) })

    return { success: true }
}

// ---------------------------------------------------------------------------
// Delete Promotion
// ---------------------------------------------------------------------------

export async function deletePromotionAction(id: string): Promise<ActionResult> {
    const { tenantId } = await withPanelGuard({ requiredFlag: 'enable_promotions' })
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        return { success: false, error: 'Medusa configuration not found' }
    }

    const result = await deletePromotion(id, scope)
    if (result.error) {
        return { success: false, error: result.error }
    }

    revalidatePanel('all')
    logOwnerAction(tenantId, 'promotion.delete', { promotionId: id })

    return { success: true }
}
