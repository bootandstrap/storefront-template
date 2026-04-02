import { lazy } from 'react'

// ── Eagerly loaded POS sub-components ──────────────────────
export { default as POSProductGrid } from './POSProductGrid'
export { default as POSCart } from './POSCart'
export { default as POSPaymentOverlay } from './POSPaymentOverlay'
export { default as POSOfflineBanner } from './POSOfflineBanner'
export { default as POSToolbar } from './POSToolbar'
export { getParkedSales } from './POSParkedSales'

// ── Lazily loaded POS sub-components ───────────────────────
export const POSReceipt = lazy(() => import('./POSReceipt'))
export const POSSalesHistory = lazy(() => import('./POSSalesHistory'))
export const POSDashboard = lazy(() => import('./POSDashboard'))
export const POSShiftPanel = lazy(() => import('./POSShiftPanel'))
export const POSCustomerModal = lazy(() => import('./POSCustomerModal'))
export const POSRefundModal = lazy(() => import('./POSRefundModal'))
export const POSRefundReceipt = lazy(() => import('./POSRefundReceipt'))
export const POSParkedSales = lazy(() => import('./POSParkedSales'))
export const POSPrinterSettings = lazy(() => import('./POSPrinterSettings'))
export const POSSplitPayment = lazy(() => import('./POSSplitPayment'))
export const POSLoyaltyCard = lazy(() => import('./POSLoyaltyCard'))
export const POSEndOfDayReport = lazy(() => import('./POSEndOfDayReport'))
export const POSSettingsDrawer = lazy(() => import('./POSSettingsDrawer'))
