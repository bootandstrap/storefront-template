import type { EmailTemplateLoader } from './types'

export const orderTemplateLoaders = {
    order_confirmation: () => import('@/emails/OrderConfirmation'),
    order_shipped: () => import('@/emails/OrderShipped'),
    order_delivered: () => import('@/emails/OrderDelivered'),
    order_cancelled: () => import('@/emails/OrderCancelled'),
    payment_failed: () => import('@/emails/PaymentFailed'),
    refund_processed: () => import('@/emails/RefundProcessed'),
} satisfies Record<string, EmailTemplateLoader>
