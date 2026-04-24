'use client'

/**
 * POSMobileCartSheet — Mobile bottom sheet cart overlay + floating mini-bar
 *
 * Extracted from POSClient.tsx. Applies premium Liquid Glass design:
 * - Frosted glass backdrop
 * - Spring-damped slide animation
 * - Gradient mini-bar button with cart count + total
 *
 * @module pos/POSMobileCartSheet
 */

import { X as XIcon, ShoppingCart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCartItem, PaymentMethod, POSDiscount } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'
import { POS_SPRINGS } from './hooks/pos-springs'
import { POSCart } from './pos-components'

interface POSMobileCartSheetProps {
    // Cart state
    items: POSCartItem[]
    discount: POSDiscount | null
    customerName: string | null
    paymentMethod: PaymentMethod
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
    processing: boolean

    // Capabilities
    enabledPaymentMethods: PaymentMethod[]
    canLineDiscounts: boolean
    canCustomerSearch: boolean
    canThermalPrint: boolean

    // Handlers
    onUpdateQty: (id: string, qty: number) => void
    onRemoveItem: (id: string) => void
    onSetDiscount: (discount: POSDiscount | null) => void
    onSetCustomer: () => void
    onSetPayment: (method: PaymentMethod) => void
    onCharge: () => void
    onClear: () => void

    // Coupon
    couponCode?: string
    onCouponApply: (discount: POSDiscount, code: string) => void
    onCouponRemove: () => void

    // Labels
    labels: Record<string, string>
    defaultCurrency: string
    formatCurrency: (amount: number) => string

    // Sheet state
    isOpen: boolean
    onOpen: () => void
    onClose: () => void

    // Products for recommendations (optional)
    products?: unknown[]
    onAddToCart?: (item: POSCartItem) => void
}

export default function POSMobileCartSheet({
    items,
    discount,
    customerName,
    paymentMethod,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    processing,
    enabledPaymentMethods,
    canLineDiscounts,
    canCustomerSearch,
    canThermalPrint,
    onUpdateQty,
    onRemoveItem,
    onSetDiscount,
    onSetCustomer,
    onSetPayment,
    onCharge,
    onClear,
    couponCode,
    onCouponApply,
    onCouponRemove,
    labels,
    defaultCurrency,
    formatCurrency,
    isOpen,
    onOpen,
    onClose,
}: POSMobileCartSheetProps) {
    const itemCount = items.reduce((s, i) => s + i.quantity, 0)

    return (
        <>
            {/* ═══ Floating mini-cart bar ═══ */}
            {items.length > 0 && !isOpen && (
                <div
                    className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3"
                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                >
                    <button
                        onClick={onOpen}
                        aria-label={`${posLabel('panel.pos.cart', labels)} — ${itemCount} ${posLabel('panel.pos.items', labels) || 'items'}`}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]
                                   text-white rounded-2xl active:scale-[0.98] transition-transform
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2
                                   pos-pay-btn pos-pay-btn-idle"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <span className="text-xs opacity-80">
                                    {itemCount} {posLabel('panel.pos.items', labels) || 'items'}
                                </span>
                                <p className="text-sm font-bold tabular-nums">
                                    {formatCurrency(total)}
                                </p>
                            </div>
                        </div>
                        <span className="text-sm font-bold flex items-center gap-1.5">
                            {posLabel('panel.pos.pay', labels)} →
                        </span>
                    </button>
                </div>
            )}

            {/* ═══ Bottom sheet cart overlay ═══ */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={POS_SPRINGS.gentle}
                            role="dialog"
                            aria-modal="true"
                            aria-label={posLabel('panel.pos.cart', labels)}
                            className="md:hidden fixed inset-x-0 bottom-0 z-50
                                       bg-sf-0 rounded-t-3xl flex flex-col"
                            style={{ maxHeight: '90dvh', boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.12)' }}
                        >
                            {/* Drag handle */}
                            <div className="flex items-center justify-center pt-2 pb-1">
                                <div className="w-10 h-1 rounded-full bg-sf-3" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-4 pb-2">
                                <span className="text-sm font-bold text-tx">
                                    {posLabel('panel.pos.cart', labels)}
                                </span>
                                <button
                                    onClick={onClose}
                                    aria-label={posLabel('panel.pos.close', labels) || 'Close cart'}
                                    className="w-8 h-8 rounded-full bg-sf-1 flex items-center justify-center
                                               hover:bg-sf-2 transition-colors
                                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Cart content */}
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <POSCart
                                    items={items}
                                    discount={discount}
                                    customerName={customerName}
                                    paymentMethod={paymentMethod}
                                    subtotal={subtotal}
                                    discountAmount={discountAmount}
                                    taxAmount={taxAmount}
                                    total={total}
                                    processing={processing}
                                    enabledPaymentMethods={enabledPaymentMethods}
                                    canLineDiscounts={canLineDiscounts}
                                    canCustomerSearch={canCustomerSearch}
                                    canThermalPrint={canThermalPrint}
                                    onUpdateQty={onUpdateQty}
                                    onRemoveItem={onRemoveItem}
                                    onSetDiscount={onSetDiscount}
                                    onSetCustomer={onSetCustomer}
                                    onSetPayment={onSetPayment}
                                    onCharge={() => { onCharge(); onClose() }}
                                    onClear={() => { onClear(); onClose() }}
                                    labels={labels}
                                    couponCode={couponCode}
                                    onCouponApply={onCouponApply}
                                    onCouponRemove={onCouponRemove}
                                    defaultCurrency={defaultCurrency}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
