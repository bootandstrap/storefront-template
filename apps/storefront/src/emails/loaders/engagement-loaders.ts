import type { EmailTemplateLoader } from './types'

export const engagementTemplateLoaders = {
    review_request: () => import('@/emails/ReviewRequest'),
    abandoned_cart: () => import('@/emails/AbandonedCart'),
    pos_receipt: () => import('@/emails/POSReceipt'),
} satisfies Record<string, EmailTemplateLoader>
