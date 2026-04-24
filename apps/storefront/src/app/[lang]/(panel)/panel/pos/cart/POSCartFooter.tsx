'use client'

/**
 * POSCartFooter — Pinned bottom section with promos, totals, and PAY button
 *
 * Extracted from POSCart.tsx. Contains:
 * - Active promo badges (discount/coupon)
 * - Expandable discount/coupon input
 * - Subtotal/tax/total summary
 * - Premium gradient PAY button with pulse animation
 *
 * @module pos/cart/POSCartFooter
 */

import { useState, lazy, Suspense } from 'react'
import { Percent, DollarSign, X, Tag, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'
import type { POSDiscount } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel, getUpsellTooltip } from '@/lib/pos/pos-i18n'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

const POSCouponInput = lazy(() => import('../POSCouponInput'))

interface POSCartFooterProps {
    items: { length: number }
    discount: POSDiscount | null
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
    processing: boolean
    canLineDiscounts: boolean
    onSetDiscount: (discount: POSDiscount | null) => void
    onCharge: () => void
    labels: Record<string, string>
    defaultCurrency: string
    // Coupon
    couponCode?: string
    onCouponApply?: (discount: POSDiscount, code: string) => void
    onCouponRemove?: () => void
}

export default function POSCartFooter({
    items,
    discount,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    processing,
    canLineDiscounts,
    onSetDiscount,
    onCharge,
    labels,
    defaultCurrency,
    couponCode,
    onCouponApply,
    onCouponRemove,
}: POSCartFooterProps) {
    const [showDiscountInput, setShowDiscountInput] = useState(false)
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
    const [discountValue, setDiscountValue] = useState('')
    const [gateData, setGateData] = useState<{ isOpen: boolean; flag: string }>({ isOpen: false, flag: '' })

    const formatCurrency = (amount: number) => formatPOSCurrency(amount, defaultCurrency)

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) setGateData({ isOpen: true, flag })
        else action()
    }

    const applyDiscount = () => {
        const val = parseFloat(discountValue)
        if (isNaN(val) || val <= 0) return
        onSetDiscount({
            type: discountType,
            value: discountType === 'fixed' ? Math.round(val * 100) : val,
        })
        setShowDiscountInput(false)
        setDiscountValue('')
    }

    return (
        <div className="border-t border-sf-2 px-4 py-2.5 space-y-2 pos-footer-glass flex-shrink-0">
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />

            {/* Active promos */}
            {(discount || couponCode) && (
                <div className="flex flex-wrap gap-1.5">
                    {discount && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-brand/10 text-brand">
                            <Percent className="w-3 h-3" />
                            {discount.type === 'percentage' ? `${discount.value}%` : ''} -{formatCurrency(discountAmount)}
                            <button onClick={() => onSetDiscount(null)} className="ml-0.5 hover:text-rose-500 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {couponCode && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/40">
                            <Tag className="w-3 h-3" />
                            {couponCode}
                            {onCouponRemove && (
                                <button onClick={onCouponRemove} className="ml-0.5 hover:text-rose-500 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </span>
                    )}
                </div>
            )}

            {/* Collapsed promo button */}
            {!discount && !showDiscountInput && !couponCode && items.length > 0 && (
                <button
                    onClick={() => handleFeatureClick(canLineDiscounts || !!onCouponApply, 'enable_pos_line_discounts', () => setShowDiscountInput(true))}
                    className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                        canLineDiscounts || onCouponApply
                            ? 'text-tx-muted hover:text-brand'
                            : 'text-tx-faint hover:bg-sf-1 p-1 rounded -ml-1'
                    }`}
                    title={canLineDiscounts
                        ? posLabel('panel.pos.addDiscount', labels)
                        : getUpsellTooltip('enable_pos_line_discounts', labels)
                    }
                >
                    <Tag className="w-3 h-3" />
                    {posLabel('panel.pos.addDiscount', labels) || 'Descuento / Cupón'}
                    {!canLineDiscounts && !onCouponApply && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-sf-2 text-tx-faint font-semibold">PRO</span>
                    )}
                </button>
            )}

            {/* Expanded discount input */}
            {showDiscountInput && !discount && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <div className="flex rounded-lg overflow-hidden border border-sf-3">
                            <button
                                onClick={() => handleFeatureClick(canLineDiscounts, 'enable_pos_line_discounts', () => setDiscountType('percentage'))}
                                className={`px-2 py-1.5 text-xs transition-colors ${
                                    discountType === 'percentage' ? 'bg-brand text-white' : 'bg-sf-1'
                                }`}
                            >
                                <Percent className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => handleFeatureClick(canLineDiscounts, 'enable_pos_line_discounts', () => setDiscountType('fixed'))}
                                className={`px-2 py-1.5 text-xs transition-colors ${
                                    discountType === 'fixed' ? 'bg-brand text-white' : 'bg-sf-1'
                                }`}
                            >
                                <DollarSign className="w-3 h-3" />
                            </button>
                        </div>
                        <input
                            type="number"
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value)}
                            placeholder={discountType === 'percentage' ? '10' : '5.00'}
                            className="flex-1 px-2 py-1.5 text-xs border border-sf-3 rounded-lg bg-sf-0
                                       focus:outline-none focus:ring-1 focus:ring-soft"
                            onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                            autoFocus
                        />
                        <button onClick={applyDiscount} className="px-2.5 py-1.5 text-xs bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors">
                            OK
                        </button>
                        <button onClick={() => { setShowDiscountInput(false); setDiscountValue('') }} className="text-tx-muted hover:text-rose-500 transition-colors p-1">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {onCouponApply && !couponCode && (
                        <Suspense fallback={null}>
                            <POSCouponInput
                                onApply={onCouponApply}
                                orderTotal={total}
                                currentCoupon={couponCode}
                                onRemove={onCouponRemove}
                                labels={labels}
                                defaultCurrency={defaultCurrency}
                            />
                        </Suspense>
                    )}
                </div>
            )}

            {/* Totals */}
            <div className="space-y-1 text-xs">
                <div className="flex justify-between text-tx-muted">
                    <span>{posLabel('panel.pos.subtotal', labels)}</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                    <div className="flex justify-between text-tx-muted">
                        <span>{posLabel('panel.pos.tax', labels)}</span>
                        <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between items-baseline text-tx pt-2 mt-1 border-t border-sf-2">
                    <span className="text-sm font-bold">{posLabel('panel.pos.total', labels)}</span>
                    <motion.span
                        key={total}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        className="text-xl font-black tabular-nums"
                    >
                        {formatCurrency(total)}
                    </motion.span>
                </div>
            </div>

            {/* ★ PAY BUTTON — Premium gradient with glow ★ */}
            <button
                onClick={onCharge}
                disabled={items.length === 0 || processing}
                className="pos-pay-btn pos-pay-btn-idle w-full h-[60px] rounded-2xl text-white font-bold text-lg
                           active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all duration-200
                           flex items-center justify-center gap-2.5"
            >
                {processing ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {posLabel('panel.pos.processing', labels)}
                    </span>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5" />
                        <span>{posLabel('panel.pos.pay', labels)}</span>
                        {total > 0 && <span className="font-black">{formatCurrency(total)}</span>}
                    </>
                )}
            </button>
        </div>
    )
}
