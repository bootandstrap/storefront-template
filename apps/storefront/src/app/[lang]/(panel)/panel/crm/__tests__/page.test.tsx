import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDictionary = vi.fn()
const mockCreateTranslator = vi.fn()
const mockGetAdminCustomers = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockWithPanelGuard = vi.fn()

vi.mock('@/lib/i18n', () => ({
    getDictionary: mockGetDictionary,
    createTranslator: mockCreateTranslator,
}))

vi.mock('@/lib/medusa/admin', () => ({
    getAdminCustomers: mockGetAdminCustomers,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/components/panel/ModuleShell', () => ({
    default: function ModuleShell(props: Record<string, unknown>) {
        return { type: 'ModuleShell', props }
    },
}))

vi.mock('../CRMClient', () => ({
    default: function CRMClient(props: Record<string, unknown>) {
        return { type: 'CRMClient', props }
    },
}))

function t(key: string) {
    return key
}

describe('CRMPage /[lang]/panel/crm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockGetDictionary.mockResolvedValue({})
        mockCreateTranslator.mockReturnValue(t)
        mockGetTenantMedusaScope.mockResolvedValue({ tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' })
        mockGetAdminCustomers.mockResolvedValue({ count: 0, customers: [] })
    })

    it('renders locked CRM shell without querying Medusa customers', async () => {
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: { enable_crm: false },
                planLimits: { max_crm_contacts: 200 },
                config: {},
            },
        })
        const { default: CRMPage } = await import('../page')

        const element = await CRMPage({ params: Promise.resolve({ lang: 'es' }) })

        expect(element.props).toMatchObject({
            isLocked: true,
            gateFlag: 'enable_crm',
            lang: 'es',
        })
        expect(mockGetAdminCustomers).not.toHaveBeenCalled()
    })

    it('builds CRM segments from tenant-scoped Medusa customers', async () => {
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: {
                featureFlags: {
                    enable_crm: true,
                    enable_crm_segmentation: true,
                    enable_crm_export: true,
                    enable_crm_contacts: true,
                    enable_crm_interactions: true,
                },
                planLimits: { max_crm_contacts: 500 },
                config: { crm_export_format: 'csv' },
            },
        })
        mockGetAdminCustomers.mockResolvedValue({
            count: 2,
            customers: [
                { id: 'cus_1', email: 'a@example.com', first_name: 'A', last_name: 'One', orders: [{ id: 'order_1' }], created_at: new Date().toISOString() },
                { id: 'cus_2', email: 'b@example.com', first_name: 'B', last_name: 'Two', orders: [], created_at: '2020-01-01T00:00:00Z' },
            ],
        })
        const { default: CRMPage } = await import('../page')

        const element = await CRMPage({ params: Promise.resolve({ lang: 'es' }) })
        const client = element.props.children

        expect(mockGetTenantMedusaScope).toHaveBeenCalledWith('tenant_123')
        expect(mockGetAdminCustomers).toHaveBeenCalledWith(
            { limit: 50, offset: 0 },
            { tenantId: 'tenant_123', baseUrl: 'https://medusa.example.com' }
        )
        expect(element.props.isLocked).toBe(false)
        expect(client.props).toMatchObject({
            totalCustomers: 2,
            maxContacts: 500,
            enableSegmentation: true,
            enableExport: true,
            segments: { total: 2, withOrders: 1, recent: 1 },
        })
    })
})
