import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockAdjustStockLevel = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { bucket: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin-inventory', () => ({
    adjustStockLevel: mockAdjustStockLevel,
}))

vi.mock('@/lib/logger', () => ({
    logger: { error: mockLoggerError },
}))

function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest(new Request('https://tenant.example.com/api/panel/inventory/update-stock', {
        method: 'POST',
        body: JSON.stringify(body),
    }))
}

describe('POST /api/panel/inventory/update-stock', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false })
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockAdjustStockLevel.mockResolvedValue({ error: null })
    })

    it('validates required stock fields before mutation', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest({ inventory_item_id: 'iitem_1' }))
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error).toContain('Missing required fields')
        expect(mockAdjustStockLevel).not.toHaveBeenCalled()
    })

    it('updates stock through tenant-scoped Medusa helpers', async () => {
        const { POST } = await import('../route')

        const response = await POST(makeRequest({
            inventory_item_id: 'iitem_1',
            location_id: 'sloc_1',
            stocked_quantity: 7,
        }))
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockAdjustStockLevel).toHaveBeenCalledWith(
            'iitem_1',
            'sloc_1',
            7,
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(json.success).toBe(true)
    })
})
