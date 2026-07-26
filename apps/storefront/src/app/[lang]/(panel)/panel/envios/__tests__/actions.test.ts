import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockGetAdminShippingOptions = vi.fn()
const mockUpdateAdminShippingOption = vi.fn()
const mockLogOwnerAction = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/medusa/admin', () => ({
    getAdminShippingOptions: mockGetAdminShippingOptions,
    updateAdminShippingOption: mockUpdateAdminShippingOption,
}))

vi.mock('@/lib/panel/log-owner-action', () => ({
    logOwnerAction: mockLogOwnerAction,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
    },
}))

const scope = { tenantId: 'tenant_123', medusaSalesChannelId: 'sc_1' }

describe('/[lang]/panel/envios server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
        mockGetTenantMedusaScope.mockResolvedValue(scope)
        mockGetAdminShippingOptions.mockResolvedValue({
            shipping_options: [{ id: 'so_1', name: 'Local', prices: [] }],
        })
        mockUpdateAdminShippingOption.mockResolvedValue({ error: null })
    })

    it('lists shipping options through tenant-scoped Medusa admin helpers', async () => {
        const { listShippingOptions } = await import('../actions')

        await expect(listShippingOptions()).resolves.toEqual({
            options: [{ id: 'so_1', name: 'Local', prices: [] }],
        })

        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_ecommerce' })
        expect(mockGetTenantMedusaScope).toHaveBeenCalledWith('tenant_123')
        expect(mockGetAdminShippingOptions).toHaveBeenCalledWith(scope)
    })

    it('validates and updates shipping price without cross-tenant scope loss', async () => {
        const { updateShippingPrice } = await import('../actions')

        await expect(updateShippingPrice('so_1', 750, 'EUR')).resolves.toEqual({ success: true })

        expect(mockUpdateAdminShippingOption).toHaveBeenCalledWith('so_1', {
            prices: [{ amount: 750, currency_code: 'EUR' }],
        }, scope)
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'shipping.update_price', {
            optionId: 'so_1',
            amount: 750,
            currencyCode: 'EUR',
        })
    })

    it('rejects invalid shipping price input before auth and external calls', async () => {
        const { updateShippingPrice } = await import('../actions')

        await expect(updateShippingPrice('', -1, 'EUR')).resolves.toEqual({
            success: false,
            error: 'Invalid parameters',
        })

        expect(mockWithPanelGuard).not.toHaveBeenCalled()
        expect(mockUpdateAdminShippingOption).not.toHaveBeenCalled()
    })

    it('trims and updates shipping name through the tenant scope', async () => {
        const { updateShippingName } = await import('../actions')

        await expect(updateShippingName('so_1', '  Express  ')).resolves.toEqual({ success: true })

        expect(mockUpdateAdminShippingOption).toHaveBeenCalledWith('so_1', { name: 'Express' }, scope)
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'shipping.update_name', {
            optionId: 'so_1',
            name: 'Express',
        })
    })
})
