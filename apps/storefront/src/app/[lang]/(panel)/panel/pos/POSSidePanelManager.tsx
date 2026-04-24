'use client'

/**
 * POSSidePanelManager — Routes panelView state to lazy-loaded side panel components
 *
 * Extracted from POSClient.tsx to reduce god-file size.
 * All panels are wrapped in Suspense for code-splitting.
 *
 * @module pos/POSSidePanelManager
 */

import { Suspense } from 'react'
import type { POSPanelView, POSShift, POSCartItem, POSRefund, PaymentMethod, POSSale } from '@/lib/pos/pos-config'
import type { FeatureFlags } from '@/lib/config'
import {
    POSReceipt, POSSalesHistory, POSDashboard, POSShiftPanel,
    POSCustomerModal, POSRefundModal, POSRefundReceipt,
    POSParkedSales, POSPrinterSettings, POSSplitPayment,
    POSLoyaltyCard, POSEndOfDayReport, POSSettingsDrawer,
} from './pos-components'

interface POSSidePanelManagerProps {
    panelView: POSPanelView
    setPanelView: (v: POSPanelView) => void
    labels: Record<string, string>
    defaultCurrency: string
    businessName: string

    // Capabilities
    canAccessHistory: boolean
    canAccessDashboard: boolean
    canAccessShifts: boolean
    canThermalPrint: boolean
    canSplitPayment: boolean
    canLoyalty: boolean
    canEndOfDay: boolean

    // Data
    currentShift: POSShift | null
    onShiftChange: (shift: POSShift | null) => void
    shiftHistory: POSShift[]
    refundOrderId: string | null
    onRefundClose: () => void
    onRefundComplete: (refund: POSRefund) => void
    refundReceipt: POSRefund | null
    onRefundReceiptClose: () => void
    completedSale: POSSale | null
    onNewSale: () => void
    posConfig: Record<string, unknown>
    featureFlags: FeatureFlags

    // Parked sales
    onResumeParked: (items: POSCartItem[]) => void
    parkedSalesMultiDevice: boolean

    // Customer
    onCustomerSelect: (customer: { id: string; name: string } | null) => void
    customerId: string | null
    customerName: string | null

    // Split payment
    splitTotal: number
    enabledPaymentMethods: PaymentMethod[]
    onSplitPaymentConfirm: (entries: { method: PaymentMethod; amount: number }[]) => void

    // Refund from history
    onRefundFromHistory: (orderId: string) => void
}

export default function POSSidePanelManager({
    panelView,
    setPanelView,
    labels,
    defaultCurrency,
    businessName,
    canAccessHistory,
    canAccessDashboard,
    canAccessShifts,
    canThermalPrint,
    canSplitPayment,
    canLoyalty,
    canEndOfDay,
    currentShift,
    onShiftChange,
    shiftHistory,
    refundOrderId,
    onRefundClose,
    onRefundComplete,
    refundReceipt,
    onRefundReceiptClose,
    completedSale,
    onNewSale,
    posConfig,
    featureFlags,
    onResumeParked,
    parkedSalesMultiDevice,
    onCustomerSelect,
    customerId,
    customerName,
    splitTotal,
    enabledPaymentMethods,
    onSplitPaymentConfirm,
}: POSSidePanelManagerProps) {
    const close = () => setPanelView(null)

    return (
        <>
            {/* Receipt modal */}
            {completedSale && (
                <Suspense fallback={null}>
                    <POSReceipt
                        sale={completedSale}
                        businessName={businessName}
                        canThermalPrint={canThermalPrint}
                        onNewSale={onNewSale}
                        labels={labels}
                        posConfig={posConfig}
                    />
                </Suspense>
            )}

            {/* History */}
            {panelView === 'history' && canAccessHistory && (
                <Suspense fallback={null}>
                    <POSSalesHistory
                        onClose={close}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}

            {/* Dashboard */}
            {panelView === 'dashboard' && canAccessDashboard && (
                <Suspense fallback={null}>
                    <POSDashboard
                        onClose={close}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}

            {/* Shift */}
            {panelView === 'shift' && canAccessShifts && (
                <Suspense fallback={null}>
                    <POSShiftPanel
                        onClose={close}
                        onShiftChange={onShiftChange}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}

            {/* Customer */}
            {panelView === 'customer' && (
                <Suspense fallback={null}>
                    <POSCustomerModal
                        onClose={close}
                        onSelect={onCustomerSelect}
                        labels={labels}
                    />
                </Suspense>
            )}

            {/* Refund */}
            {panelView === 'refund' && refundOrderId && (
                <Suspense fallback={null}>
                    <POSRefundModal
                        orderId={refundOrderId}
                        onClose={onRefundClose}
                        onComplete={onRefundComplete}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}

            {/* Parked Sales */}
            {panelView === 'parkedSales' && (
                <Suspense fallback={null}>
                    <POSParkedSales
                        onClose={close}
                        onResume={onResumeParked}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                        multiDevice={parkedSalesMultiDevice}
                    />
                </Suspense>
            )}

            {/* Refund Receipt */}
            {refundReceipt && (
                <Suspense fallback={null}>
                    <POSRefundReceipt
                        refund={refundReceipt}
                        businessName={businessName}
                        onClose={onRefundReceiptClose}
                        labels={labels}
                    />
                </Suspense>
            )}

            {/* Printer Settings */}
            {panelView === 'printerSettings' && canThermalPrint && (
                <Suspense fallback={null}>
                    <POSPrinterSettings
                        isOpen={true}
                        onClose={close}
                        labels={labels}
                    />
                </Suspense>
            )}

            {/* Split Payment */}
            {panelView === 'splitPayment' && canSplitPayment && (
                <Suspense fallback={null}>
                    <POSSplitPayment
                        total={splitTotal}
                        enabledPaymentMethods={enabledPaymentMethods}
                        onConfirm={onSplitPaymentConfirm}
                        onCancel={close}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}

            {/* Loyalty */}
            {panelView === 'loyalty' && canLoyalty && (
                <Suspense fallback={null}>
                    <POSLoyaltyCard
                        customerId={customerId}
                        customerName={customerName}
                        onClose={close}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}

            {/* End of Day */}
            {panelView === 'endOfDay' && canEndOfDay && (
                <Suspense fallback={null}>
                    <POSEndOfDayReport
                        onClose={close}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                        shifts={shiftHistory}
                    />
                </Suspense>
            )}

            {/* POS Settings */}
            {panelView === 'posSettings' && (
                <Suspense fallback={null}>
                    <POSSettingsDrawer
                        isOpen={true}
                        onClose={close}
                        initialValues={posConfig}
                        labels={labels}
                        kioskFlags={{
                            enable_kiosk_idle_timer: featureFlags.enable_kiosk_idle_timer === true,
                            enable_kiosk_analytics: featureFlags.enable_kiosk_analytics === true,
                            enable_kiosk_remote_management: featureFlags.enable_kiosk_remote_management === true,
                        }}
                    />
                </Suspense>
            )}
        </>
    )
}
