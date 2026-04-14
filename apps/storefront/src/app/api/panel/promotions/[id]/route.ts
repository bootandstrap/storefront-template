/**
 * PATCH/DELETE /api/panel/promotions/[id] — Update or delete a promotion
 *
 * PATCH: Toggle is_disabled or update fields.
 * DELETE: Remove promotion entirely.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withPanelGuard } from '@/lib/panel-guard'
import { withRateLimit, PANEL_GUARD } from '@/lib/security/api-rate-guard'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { updatePromotion, deletePromotion } from '@/lib/medusa/admin-promotions'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rl = await withRateLimit(request, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { id } = await params
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)
        const data = await request.json()

        const { error } = await updatePromotion(id, data, scope)
        if (error) {
            return NextResponse.json({ error }, { status: 400 })
        }
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[api/panel/promotions/[id]] PATCH error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rl = await withRateLimit(request, PANEL_GUARD)
        if (rl.limited) return rl.response!

        const { id } = await params
        const { tenantId } = await withPanelGuard()
        const scope = await getTenantMedusaScope(tenantId)

        const { error } = await deletePromotion(id, scope)
        if (error) {
            return NextResponse.json({ error }, { status: 400 })
        }
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[api/panel/promotions/[id]] DELETE error:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        )
    }
}
