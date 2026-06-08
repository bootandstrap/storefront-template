import type { ComponentType } from 'react'
import type { EmailTemplate } from './types'

const templateLoaders: Record<EmailTemplate, () => Promise<{ default: ComponentType<any> }>> = {
    order_confirmation: () => import('@/emails/OrderConfirmation'),
    order_shipped: () => import('@/emails/OrderShipped'),
    order_delivered: () => import('@/emails/OrderDelivered'),
    order_cancelled: () => import('@/emails/OrderCancelled'),
    payment_failed: () => import('@/emails/PaymentFailed'),
    refund_processed: () => import('@/emails/RefundProcessed'),
    low_stock_alert: () => import('@/emails/LowStockAlert'),
    welcome: () => import('@/emails/Welcome'),
    password_reset: () => import('@/emails/PasswordReset'),
    account_verification: () => import('@/emails/AccountVerification'),
    review_request: () => import('@/emails/ReviewRequest'),
    abandoned_cart: () => import('@/emails/AbandonedCart'),
    pos_receipt: () => import('@/emails/POSReceipt'),
}

export async function loadEmailTemplate(
    template: EmailTemplate,
): Promise<ComponentType<any>> {
    const loader = templateLoaders[template]
    if (!loader) {
        throw new Error(`Unknown email template: ${template}`)
    }
    const mod = await loader()
    return mod.default
}
