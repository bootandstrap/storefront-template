import type { EmailTemplateLoader } from './types'

export const accountTemplateLoaders = {
    low_stock_alert: () => import('@/emails/LowStockAlert'),
    welcome: () => import('@/emails/Welcome'),
    password_reset: () => import('@/emails/PasswordReset'),
    account_verification: () => import('@/emails/AccountVerification'),
} satisfies Record<string, EmailTemplateLoader>
