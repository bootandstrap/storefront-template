'use client'

/**
 * POSCart — FSM-based cart orchestrator (SOTA v2 — decomposed)
 *
 * Thin orchestrator that manages the 4-step checkout FSM:
 *   cart → payment → cash_numpad → change_confirm → charge
 *
 * All rendering is delegated to sub-components in ./cart/:
 * - POSCartItemList (drag-to-delete items)
 * - POSCartFooter   (promos, totals, PAY button)
 * - POSPaymentStep  (payment method selection)
 * - POSCashNumpad   (denomination input)
 * - POSChangeConfirm (verify change before final sale)
 *
 * Reduced from 1003 LOC → ~280 LOC (72% reduction).
 *
 * @module pos/POSCart
 */

import { useState, useCallback, lazy, Suspense } from 'react'
import {
    ShoppingCart, PauseCircle, User, X,
    ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCartItem, POSDiscount, PaymentMethod } from '@/lib/pos/pos-config'
import { posLabel, getUpsellTooltip } from '@/lib/pos/pos-i18n'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'
import { POSCartItemList, POSCartFooter, POSPaymentStep, POSCashNumpad, POSChangeConfirm } from './cart'

const POSRecommendations = lazy(() => import('./POSRecommendations'))

// ─── FSM ────────────────────────────────────────────────────────────────────

/**
 * Checkout FSM transition map (prevents invalid state transitions).
 *
 * Flow: cart → payment → cash_numpad → change_confirm → (charge)
 *                     └→ (card/twint/manual) → (charge)
 */
type CheckoutStep = 'cart' | 'payment' | 'cash_numpad' | 'change_confirm'

const TRANSITION_MAP: Record<CheckoutStep, CheckoutStep | null> = {
    cart: 'payment',
    payment: null,          // branches: cash → cash_numpad, others → charge
    cash_numpad: 'change_confirm',
    change_confirm: null,   // terminal → charge
}

const BACK_MAP: Record<CheckoutStep, CheckoutStep | null> = {
    cart: null,
    payment: 'cart',
    cash_numpad: 'payment',
    change_confirm: 'cash_numpad',
}

// ─── Parked Sales ───────────────────────────────────────────────────────────

const PARKED_KEY = 'pos_parked_sales'

interface ParkedSale {
    id: string
    items: POSCartItem[]
    discount: POSDiscount | null
    customerName: string | null
    parkedAt: string
}

function getParkedSales(): ParkedSale[] {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(PARKED_KEY) || '[]') }
    catch { return [] }
}

function saveParkedSale(sale: Omit<ParkedSale, 'id' | 'parkedAt'>) {
    const parked = getParkedSales()
    parked.push({ ...sale, id: crypto.randomUUID(), parkedAt: new Date().toISOString() })
    localStorage.setItem(PARKED_KEY, JSON.stringify(parked))
}

function removeParkedSale(id: string) {
    const parked = getParkedSales().filter(s => s.id !== id)
    localStorage.setItem(PARKED_KEY, JSON.stringify(parked))
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface POSCartProps {
    items: POSCartItem[]
    discount: POSDiscount | null
    customerName: string | null
    paymentMethod: PaymentMethod
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
    processing: boolean
    enabledPaymentMethods: PaymentMethod[]
    canLineDiscounts: boolean
    canCustomerSearch: boolean
    canThermalPrint: boolean
    onUpdateQty: (variantId: string, quantity: number) => void
    onRemoveItem: (variantId: string) => void
    onSetDiscount: (discount: POSDiscount | null) => void
    onSetCustomer: () => void
    onSetPayment: (method: PaymentMethod) => void
    onCharge: () => void
    onClear: () => void
    labels: Record<string, string>
    couponCode?: string
    onCouponApply?: (discount: POSDiscount, code: string) => void
    onCouponRemove?: () => void
    showRecommendations?: boolean
    products?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    onAddToCart?: (product: any) => void // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultCurrency: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function POSCart({
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
    labels,
    couponCode,
    onCouponApply,
    onCouponRemove,
    showRecommendations = false,
    products = [],
    onAddToCart,
    defaultCurrency,
}: POSCartProps) {
    // ── FSM state ──
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart')
    const [tenderedAmount, setTenderedAmount] = useState(0) // cents
    const [gateData, setGateData] = useState<{ isOpen: boolean; flag: string }>({ isOpen: false, flag: '' })

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

    // ── FSM transitions ──
    const goBack = useCallback(() => {
        const prev = BACK_MAP[checkoutStep]
        if (prev) setCheckoutStep(prev)
    }, [checkoutStep])

    const handleChargeClick = useCallback(() => {
        if (checkoutStep === 'cart') {
            setCheckoutStep('payment')
            return
        }
        if (checkoutStep === 'payment') {
            if (paymentMethod === 'cash') {
                setCheckoutStep('cash_numpad')
                return
            }
            // Card/Twint/Manual: charge directly
            onCharge()
            setCheckoutStep('cart')
            return
        }
    }, [checkoutStep, paymentMethod, onCharge])

    const handleCashConfirm = useCallback((tendered: number) => {
        setTenderedAmount(tendered)
        setCheckoutStep('change_confirm')
    }, [])

    const handleFinalConfirm = useCallback(() => {
        onCharge()
        setCheckoutStep('cart')
        setTenderedAmount(0)
    }, [onCharge])

    const handleParkSale = useCallback(() => {
        if (items.length === 0) return
        saveParkedSale({ items, discount, customerName })
        onClear()
    }, [items, discount, customerName, onClear])

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) setGateData({ isOpen: true, flag })
        else action()
    }

    // ── Step indicator ──
    const stepIndex = checkoutStep === 'cart' ? 0
        : checkoutStep === 'payment' ? 1
        : checkoutStep === 'cash_numpad' ? 2
        : 3
    const stepLabels = [
        posLabel('panel.pos.cart', labels),
        posLabel('panel.pos.selectPayment', labels),
        posLabel('panel.pos.cashTendered', labels),
        posLabel('panel.pos.verifyChange', labels) || 'Verificar Cambio',
    ]

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <div className="flex flex-col h-full bg-sf-0">
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />

            {/* Step Indicator (visible when not on cart step) */}
            <AnimatePresence>
                {checkoutStep !== 'cart' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-sf-2 overflow-hidden"
                    >
                        <div className="px-4 py-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                {stepLabels.slice(0, paymentMethod === 'cash' ? 4 : 2).map((label, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        {i > 0 && <ChevronRight className="w-3 h-3 text-tx-faint flex-shrink-0" />}
                                        <span
                                            className={`text-[10px] font-semibold transition-colors duration-300 ${
                                                i === stepIndex ? 'text-brand' : i < stepIndex ? 'text-brand-dark' : 'text-tx-muted'
                                            }`}
                                        >
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-0.5 bg-sf-2 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${((stepIndex + 1) / (paymentMethod === 'cash' ? 4 : 2)) * 100}%` }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Step content */}
            <AnimatePresence mode="wait">
                {/* ══ STEP 1: CART ══ */}
                {checkoutStep === 'cart' && (
                    <motion.div
                        key="cart"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col flex-1 min-h-0"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-sf-2 pos-footer-glass flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-tx-muted" />
                                <h2 className="text-sm font-bold text-tx">
                                    {posLabel('panel.pos.cart', labels)}
                                </h2>
                                {itemCount > 0 && (
                                    <motion.span
                                        key={itemCount}
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand font-bold"
                                    >
                                        {itemCount}
                                    </motion.span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {items.length > 0 && (
                                    <>
                                        <button
                                            onClick={handleParkSale}
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1
                                                       text-[11px] text-amber-500/80 hover:text-amber-600 hover:bg-amber-50
                                                       font-medium transition-colors rounded-xl px-2"
                                            title={posLabel('panel.pos.holdSale', labels)}
                                        >
                                            <PauseCircle className="w-4 h-4" />
                                            <span className="hidden sm:inline">{posLabel('panel.pos.holdSale', labels)}</span>
                                        </button>
                                        <button
                                            onClick={onClear}
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center
                                                       text-[11px] text-rose-500/80 hover:text-rose-600 hover:bg-rose-50
                                                       font-medium transition-colors rounded-xl px-2"
                                        >
                                            {posLabel('panel.pos.clearCart', labels)}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Customer pill */}
                        <button
                            onClick={() => handleFeatureClick(canCustomerSearch, 'enable_pos_customer_search', onSetCustomer)}
                            className={`mx-3 mt-2 mb-0.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 flex-shrink-0 ${
                                !canCustomerSearch
                                    ? 'border border-dashed border-sf-3 text-tx-faint hover:bg-sf-1'
                                    : customerName
                                        ? 'bg-brand-subtle text-brand border border-brand-soft'
                                        : 'border border-dashed border-sf-3 text-tx-muted hover:border-brand hover:text-brand'
                            }`}
                            title={canCustomerSearch
                                ? (customerName || posLabel('panel.pos.addCustomer', labels))
                                : getUpsellTooltip('enable_pos_customer_search', labels)
                            }
                        >
                            <User className="w-3 h-3" />
                            <span className="truncate max-w-[160px]">
                                {canCustomerSearch
                                    ? (customerName || posLabel('panel.pos.addCustomer', labels))
                                    : posLabel('panel.pos.addCustomer', labels)
                                }
                            </span>
                            {customerName && canCustomerSearch && (
                                <X className="w-3 h-3 ml-auto opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onSetCustomer() }} />
                            )}
                            {!canCustomerSearch && (
                                <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-sf-2 text-tx-faint font-semibold">PRO</span>
                            )}
                        </button>

                        {/* Items list */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5 space-y-1">
                            <POSCartItemList
                                items={items}
                                onUpdateQty={onUpdateQty}
                                onRemoveItem={onRemoveItem}
                                labels={labels}
                                defaultCurrency={defaultCurrency}
                            />
                        </div>

                        {/* Recommendations */}
                        {showRecommendations && items.length > 0 && onAddToCart && (
                            <div className="pt-2 pb-1 max-h-[120px]">
                                <Suspense fallback={null}>
                                    <POSRecommendations
                                        cartItems={items}
                                        allProducts={products as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                                        onAddItem={(item) => onAddToCart?.(item)}
                                        labels={labels}
                                        defaultCurrency={defaultCurrency}
                                        maxSuggestions={3}
                                    />
                                </Suspense>
                            </div>
                        )}

                        {/* Footer with totals + PAY */}
                        <POSCartFooter
                            items={items}
                            discount={discount}
                            subtotal={subtotal}
                            discountAmount={discountAmount}
                            taxAmount={taxAmount}
                            total={total}
                            processing={processing}
                            canLineDiscounts={canLineDiscounts}
                            onSetDiscount={onSetDiscount}
                            onCharge={handleChargeClick}
                            labels={labels}
                            defaultCurrency={defaultCurrency}
                            couponCode={couponCode}
                            onCouponApply={onCouponApply}
                            onCouponRemove={onCouponRemove}
                        />
                    </motion.div>
                )}

                {/* ══ STEP 2: PAYMENT METHOD ══ */}
                {checkoutStep === 'payment' && (
                    <POSPaymentStep
                        paymentMethod={paymentMethod}
                        total={total}
                        processing={processing}
                        enabledPaymentMethods={enabledPaymentMethods}
                        onSetPayment={onSetPayment}
                        onConfirm={handleChargeClick}
                        onBack={goBack}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                        itemCount={items.length}
                    />
                )}

                {/* ══ STEP 3: CASH NUMPAD ══ */}
                {checkoutStep === 'cash_numpad' && (
                    <POSCashNumpad
                        total={total}
                        processing={processing}
                        onConfirm={handleCashConfirm}
                        onBack={goBack}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                )}

                {/* ══ STEP 4: CHANGE CONFIRM (new user-requested step) ══ */}
                {checkoutStep === 'change_confirm' && (
                    <POSChangeConfirm
                        total={total}
                        tenderedAmount={tenderedAmount}
                        processing={processing}
                        onConfirm={handleFinalConfirm}
                        onBack={goBack}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export { getParkedSales, removeParkedSale }
export type { ParkedSale }
