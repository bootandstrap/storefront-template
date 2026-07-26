import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockCreateAdminClient = vi.fn()
const mockRevalidatePanel = vi.fn()
const mockLogOwnerAction = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: mockCreateAdminClient,
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

function supabaseUpsertMock(error: { message: string } | null = null) {
    const upsert = vi.fn().mockResolvedValue({ error })
    const from = vi.fn().mockReturnValue({ upsert })
    return { client: { from }, from, upsert }
}

describe('/[lang]/panel/email server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
        mockCreateAdminClient.mockReturnValue(supabaseUpsertMock().client)
    })

    it('saves automation config behind the email feature gate and tenant scope', async () => {
        const db = supabaseUpsertMock()
        mockCreateAdminClient.mockReturnValueOnce(db.client)
        const { saveAutomationConfig } = await import('../actions')

        await expect(saveAutomationConfig({
            abandoned_cart_enabled: true,
            abandoned_cart_delay_hours: 12,
            review_request_enabled: false,
            review_request_delay_days: 7,
        })).resolves.toEqual({ success: true })

        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_email_notifications' })
        expect(db.from).toHaveBeenCalledWith('email_automation_config')
        expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: 'tenant_123',
            abandoned_cart_enabled: true,
            abandoned_cart_delay_hours: 12,
            review_request_enabled: false,
            review_request_delay_days: 7,
        }), { onConflict: 'tenant_id' })
        expect(mockRevalidatePanel).toHaveBeenCalledWith('panel')
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'email.save_automation', expect.any(Object))
    })

    it('saves tenant email preferences without requiring the automation flag', async () => {
        const db = supabaseUpsertMock()
        mockCreateAdminClient.mockReturnValueOnce(db.client)
        const { saveEmailPreferences } = await import('../actions')

        await expect(saveEmailPreferences({
            send_order_confirmation: true,
            send_payment_failed: true,
            send_order_shipped: true,
            send_order_delivered: true,
            send_order_cancelled: false,
            send_refund_processed: false,
            send_welcome: true,
            send_low_stock_alert: true,
            send_abandoned_cart: false,
            send_review_request: false,
            template_design: 'minimal',
        })).resolves.toEqual({ success: true })

        expect(mockWithPanelGuard).toHaveBeenCalledWith({})
        expect(db.from).toHaveBeenCalledWith('email_preferences')
        expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: 'tenant_123',
            send_order_confirmation: true,
            template_design: 'minimal',
        }), { onConflict: 'tenant_id' })
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'email.save_preferences', expect.objectContaining({
            design: 'minimal',
        }))
    })

    it('returns a fail-closed error when persistence fails', async () => {
        mockCreateAdminClient.mockReturnValueOnce(supabaseUpsertMock({ message: 'database unavailable' }).client)
        const { saveAutomationConfig } = await import('../actions')

        await expect(saveAutomationConfig({
            abandoned_cart_enabled: false,
            abandoned_cart_delay_hours: 24,
            review_request_enabled: true,
            review_request_delay_days: 5,
        })).resolves.toEqual({ success: false, error: 'database unavailable' })

        expect(mockRevalidatePanel).not.toHaveBeenCalled()
        expect(mockLogOwnerAction).not.toHaveBeenCalled()
    })
})
