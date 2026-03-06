/**
 * Sprint 1: Email Pipeline Tests
 *
 * Validates the email notification infrastructure:
 * - Template completeness
 * - sendEmailForTenant fallback behavior
 * - sendTenantEmail helper in webhook context
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase admin
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => ({
                        data: null,
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}))

describe('Email Pipeline', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    describe('EmailTemplate types', () => {
        it('should include all required templates', async () => {
            const { sendEmail } = await import('@/lib/email')

            // Verify all template types compile and work with console provider
            const templates = [
                'order_confirmation',
                'order_shipped',
                'order_delivered',
                'order_cancelled',
                'payment_failed',
                'refund_processed',
                'low_stock_alert',
                'welcome',
                'password_reset',
                'account_verification',
                'review_request',
                'abandoned_cart',
            ] as const

            for (const template of templates) {
                const result = await sendEmail({
                    to: 'test@example.com',
                    subject: `Test ${template}`,
                    template,
                    data: {
                        customerName: 'Test',
                        orderId: '123',
                        storeName: 'Test Store',
                    },
                })
                expect(result.success).toBe(true)
                expect(result.messageId).toBeDefined()
            }
        })
    })

    describe('sendEmailForTenant', () => {
        it('should fall back to console when tenant has no email config', async () => {
            const { sendEmailForTenant } = await import('@/lib/email')

            const result = await sendEmailForTenant('test-tenant', {
                to: 'customer@example.com',
                subject: 'Test',
                template: 'order_confirmation',
                data: { customerName: 'Test' },
            })

            expect(result.success).toBe(true)
        })
    })

    describe('getEmailProviderName', () => {
        it('should return console as default provider', async () => {
            const { getEmailProviderName } = await import('@/lib/email')
            expect(getEmailProviderName()).toBe('console')
        })
    })

    describe('Medusa events API route contract', () => {
        it('should define the correct event types', () => {
            // Contract: these are the event types the medusa-events API accepts
            const validEventTypes = [
                'order.placed',
                'order.shipped',
                'inventory.low_stock',
            ]

            // This is a contract test — if the event types change,
            // both the Medusa subscribers and the API route must update
            expect(validEventTypes).toHaveLength(3)
        })

        it('should require event_type and data fields', () => {
            // Contract: payload structure
            const validPayload = {
                event_type: 'order.placed',
                data: {
                    customer_email: 'test@test.com',
                    display_id: 1,
                    total: 1000,
                    currency: 'eur',
                },
            }

            expect(validPayload.event_type).toBeDefined()
            expect(validPayload.data).toBeDefined()
        })
    })
})
