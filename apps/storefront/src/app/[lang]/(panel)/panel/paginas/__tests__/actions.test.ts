import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockCheckLimit = vi.fn()
const mockBuildLimitError = vi.fn()
const mockSanitizeHtml = vi.fn()
const mockRevalidatePanel = vi.fn()
const mockLogOwnerAction = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/limits', () => ({
    checkLimit: mockCheckLimit,
}))

vi.mock('@/lib/limit-errors', () => ({
    buildLimitError: mockBuildLimitError,
}))

vi.mock('@/lib/security/sanitize-html', () => ({
    sanitizeHtml: mockSanitizeHtml,
}))

vi.mock('@/lib/revalidate', () => ({
    revalidatePanel: mockRevalidatePanel,
}))

vi.mock('@/lib/panel/log-owner-action', () => ({
    logOwnerAction: mockLogOwnerAction,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
    },
}))

function createPagesSupabaseMock(options: {
    count?: number
    insertError?: { message: string } | null
    updateError?: { message: string } | null
    deleteError?: { message: string } | null
} = {}) {
    const selectEq = vi.fn().mockResolvedValue({ count: options.count ?? 0 })
    const selectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: selectEq,
    }
    const updateEq = vi.fn()
    const updateBuilder = { eq: updateEq }
    updateEq.mockReturnValueOnce(updateBuilder).mockResolvedValueOnce({ error: options.updateError ?? null })
    const deleteEq = vi.fn()
    const deleteBuilder = { eq: deleteEq }
    deleteEq.mockReturnValueOnce(deleteBuilder).mockResolvedValueOnce({ error: options.deleteError ?? null })
    const insert = vi.fn().mockResolvedValue({ error: options.insertError ?? null })
    const update = vi.fn().mockReturnValue(updateBuilder)
    const deleteFn = vi.fn().mockReturnValue(deleteBuilder)
    const from = vi.fn().mockReturnValue({
        select: selectBuilder.select,
        eq: selectBuilder.eq,
        insert,
        update,
        delete: deleteFn,
    })
    return { client: { from }, from, insert, update, updateBuilder, deleteFn, deleteBuilder }
}

describe('/[lang]/panel/paginas server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCheckLimit.mockReturnValue({ allowed: true })
        mockBuildLimitError.mockReturnValue('Plan limit reached')
        mockSanitizeHtml.mockImplementation((value: string) => value.replace(new RegExp('<iframe.*?>.*?</iframe>', 'g'), ''))
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: { planLimits: { max_cms_pages: 10 } },
            supabase: createPagesSupabaseMock().client,
        })
    })

    it('creates a CMS page with plan-limit enforcement, sanitization, tenant scope and audit', async () => {
        const db = createPagesSupabaseMock({ count: 2 })
        mockWithPanelGuard.mockResolvedValueOnce({
            tenantId: 'tenant_123',
            appConfig: { planLimits: { max_cms_pages: 10 } },
            supabase: db.client,
        })
        const { createPage } = await import('../actions')

        await expect(createPage({
            slug: 'shipping-policy',
            title: 'Shipping Policy',
            body: '<p>Safe</p><iframe>blocked</iframe>',
            published: true,
        })).resolves.toEqual({ success: true })

        expect(mockCheckLimit).toHaveBeenCalledWith({ max_cms_pages: 10 }, 'max_cms_pages', 2)
        expect(mockSanitizeHtml).toHaveBeenCalledWith('<p>Safe</p><iframe>blocked</iframe>')
        expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: 'tenant_123',
            slug: 'shipping-policy',
            title: 'Shipping Policy',
            body: '<p>Safe</p>',
            published: true,
        }))
        expect(mockRevalidatePanel).toHaveBeenCalledWith('all')
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'page.create', {
            slug: 'shipping-policy',
            title: 'Shipping Policy',
        })
    })

    it('rejects page creation when plan limits are exhausted before insert', async () => {
        const db = createPagesSupabaseMock({ count: 10 })
        mockWithPanelGuard.mockResolvedValueOnce({
            tenantId: 'tenant_123',
            appConfig: { planLimits: { max_cms_pages: 10 } },
            supabase: db.client,
        })
        mockCheckLimit.mockReturnValueOnce({ allowed: false, limit: 10, current: 10 })
        const { createPage } = await import('../actions')

        await expect(createPage({
            slug: 'limit-page',
            title: 'Limit Page',
            body: 'Body',
        })).resolves.toEqual({ success: false, error: 'Plan limit reached' })

        expect(db.insert).not.toHaveBeenCalled()
    })

    it('updates a CMS page only inside the current tenant and sanitizes body', async () => {
        const db = createPagesSupabaseMock()
        mockWithPanelGuard.mockResolvedValueOnce({
            tenantId: 'tenant_123',
            appConfig: { planLimits: {} },
            supabase: db.client,
        })
        const { updatePage } = await import('../actions')

        await expect(updatePage('page_1', { body: '<p>Updated</p><iframe>blocked</iframe>' })).resolves.toEqual({ success: true })

        expect(db.update).toHaveBeenCalledWith(expect.objectContaining({
            body: '<p>Updated</p>',
            updated_at: expect.any(String),
        }))
        expect(db.updateBuilder.eq).toHaveBeenNthCalledWith(1, 'id', 'page_1')
        expect(db.updateBuilder.eq).toHaveBeenNthCalledWith(2, 'tenant_id', 'tenant_123')
    })

    it('deletes and publishes pages through tenant-scoped mutations', async () => {
        const db = createPagesSupabaseMock()
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant_123',
            appConfig: { planLimits: {} },
            supabase: db.client,
        })
        const { deletePage, togglePagePublish } = await import('../actions')

        await expect(deletePage('page_1')).resolves.toEqual({ success: true })
        await expect(togglePagePublish('page_2', true)).resolves.toEqual({ success: true })

        expect(db.deleteBuilder.eq).toHaveBeenNthCalledWith(1, 'id', 'page_1')
        expect(db.deleteBuilder.eq).toHaveBeenNthCalledWith(2, 'tenant_id', 'tenant_123')
        expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ published: true }))
    })
})
