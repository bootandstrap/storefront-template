import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockRevalidatePanel = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/revalidate', () => ({
    revalidatePanel: mockRevalidatePanel,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
    },
}))

function createConfigSupabaseMock(existing: { id: string } | null = { id: 'cfg_1' }, updateError: { message: string } | null = null) {
    const single = vi.fn().mockResolvedValue({ data: existing })
    const readBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single,
    }
    const updateEq = vi.fn()
    const updateBuilder = {
        eq: updateEq,
    }
    updateEq.mockReturnValueOnce(updateBuilder).mockResolvedValueOnce({ error: updateError })
    const update = vi.fn().mockReturnValue(updateBuilder)
    const from = vi.fn()
        .mockReturnValueOnce(readBuilder)
        .mockReturnValueOnce({ update })
    return { client: { from }, from, readBuilder, update, updateBuilder }
}

describe('/[lang]/panel/modulos/[module] server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            supabase: createConfigSupabaseMock().client,
        })
    })

    it('sanitizes module config to allowed fields and updates only the tenant row', async () => {
        const db = createConfigSupabaseMock()
        mockWithPanelGuard.mockResolvedValueOnce({ tenantId: 'tenant_123', supabase: db.client })
        const { saveModuleConfigAction } = await import('../actions')

        await expect(saveModuleConfigAction('seo', {
            meta_title: 'Tenant SEO',
            facebook_pixel_id: 'px_1',
            tenant_id: 'evil_tenant',
            chatbot_name: 'wrong module',
        })).resolves.toEqual({ success: true })

        expect(db.from).toHaveBeenCalledWith('config')
        expect(db.update).toHaveBeenCalledWith({
            meta_title: 'Tenant SEO',
            facebook_pixel_id: 'px_1',
        })
        expect(db.updateBuilder.eq).toHaveBeenNthCalledWith(1, 'id', 'cfg_1')
        expect(db.updateBuilder.eq).toHaveBeenNthCalledWith(2, 'tenant_id', 'tenant_123')
        expect(mockRevalidatePanel).toHaveBeenCalledWith('all')
    })

    it('treats modules with no editable config fields as a no-op success', async () => {
        const db = createConfigSupabaseMock()
        mockWithPanelGuard.mockResolvedValueOnce({ tenantId: 'tenant_123', supabase: db.client })
        const { saveModuleConfigAction } = await import('../actions')

        await expect(saveModuleConfigAction('unknown_module', { meta_title: 'Ignored' })).resolves.toEqual({ success: true })

        expect(db.from).not.toHaveBeenCalled()
        expect(mockRevalidatePanel).not.toHaveBeenCalled()
    })

    it('fails closed when the tenant config row is missing', async () => {
        const db = createConfigSupabaseMock(null)
        mockWithPanelGuard.mockResolvedValueOnce({ tenantId: 'tenant_123', supabase: db.client })
        const { saveModuleConfigAction } = await import('../actions')

        await expect(saveModuleConfigAction('seo', { meta_title: 'Tenant SEO' })).resolves.toEqual({
            success: false,
            error: 'Config not found',
        })

        expect(db.update).not.toHaveBeenCalled()
    })
})
