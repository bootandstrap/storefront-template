'use client'

/**
 * POSCart — SOTA cart sidebar for POS (Phase C: Enhanced Checkout Flow)
 *
 * Architectural improvements:
 * - 3-step checkout: cart → payment method → process/receipt
 * - Inline POSNumpad for cash payments (touch-first)
 * - Per-method UX: card terminal instructions, Twint QR hint, cash numpad
 * - Step indicator with animated transitions
 * - Pinned footer with ALWAYS-visible prominent PAGAR button (56px)
 * - 44px minimum touch targets on quantity controls (WCAG)
 * - Payment methods pre-filtered by plan limits
 * - SaaS feature gating intercepted securely with ClientFeatureGate
 * - All labels use posLabel() with fallback
 */

import { useState, useCallback } from 'react'
import {
    Minus, Plus, Trash2, User, Percent, DollarSign, X,
    Package, PauseCircle, ArrowLeft, ShoppingCart, CreditCard,
    Banknote, Smartphone, Delete, Check, ChevronRight, Tag, ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCartItem, POSDiscount, PaymentMethod } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { POS_PAYMENT_CONFIG, posLabel } from '@/lib/pos/pos-i18n'
import { getUpsellTooltip } from '@/lib/pos/pos-i18n'
import { lazy, Suspense } from 'react'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

const POSCouponInput = lazy(() => import('./POSCouponInput'))
const POSRecommendations = lazy(() => import('./POSRecommendations'))

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
    /** Pre-filtered list of available payment method keys */
    enabledPaymentMethods: PaymentMethod[]
    /** Feature gating booleans */
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
    /** Coupon integration props */
    couponCode?: string
    onCouponApply?: (discount: POSDiscount, code: string) => void
    onCouponRemove?: () => void
    /** Recommendations */
    showRecommendations?: boolean
    products?: any[]
    onAddToCart?: (product: any) => void
    defaultCurrency: string
}

// ── Park/hold helpers ──
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
    try {
        return JSON.parse(localStorage.getItem(PARKED_KEY) || '[]')
    } catch {
        return []
    }
}

function saveParkedSale(sale: Omit<ParkedSale, 'id' | 'parkedAt'>) {
    const parked = getParkedSales()
    parked.push({
        ...sale,
        id: crypto.randomUUID(),
        parkedAt: new Date().toISOString(),
    })
    localStorage.setItem(PARKED_KEY, JSON.stringify(parked))
}

function removeParkedSale(id: string) {
    const parked = getParkedSales().filter(s => s.id !== id)
    localStorage.setItem(PARKED_KEY, JSON.stringify(parked))
}

// ── Quick cash amounts (major units) ──
const QUICK_AMOUNTS = [5, 10, 20, 50, 100] as const

// ── Numpad digits ──
const NUMPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'] as const

// ── Step type ──
type CheckoutStep = 'cart' | 'payment' | 'cash_numpad'

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
    const [showDiscountInput, setShowDiscountInput] = useState(false)
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
    const [discountValue, setDiscountValue] = useState('')
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart')

    // ── SaaS Gating State ──
    const [gateData, setGateData] = useState<{isOpen: boolean, flag: string}>({ isOpen: false, flag: '' })

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) {
            setGateData({ isOpen: true, flag })
        } else {
            action()
        }
    }

    // ── Cash numpad state ──
    const [numpadValue, setNumpadValue] = useState('')

    const formatCurrency = (amount: number, currency?: string) =>
        formatPOSCurrency(amount, currency || defaultCurrency)

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

    const handleParkSale = useCallback(() => {
        if (items.length === 0) return
        saveParkedSale({ items, discount, customerName })
        onClear()
    }, [items, discount, customerName, onClear])

    // ── Main charge handler: navigates through steps ──
    const handleCharge = useCallback(() => {
        if (checkoutStep === 'cart') {
            // Go to payment method selection
            setCheckoutStep('payment')
            return
        }
        if (checkoutStep === 'payment') {
            if (paymentMethod === 'cash') {
                // For cash: go to numpad
                setNumpadValue('')
                setCheckoutStep('cash_numpad')
                return
            }
            // For card/twint/manual: process directly
            onCharge()
            setCheckoutStep('cart')
            return
        }
        if (checkoutStep === 'cash_numpad') {
            // Confirm cash payment
            onCharge()
            setCheckoutStep('cart')
            setNumpadValue('')
            return
        }
    }, [checkoutStep, paymentMethod, onCharge])

    // ── Numpad handlers ──
    const handleNumpadDigit = (digit: string) => {
        if (digit === '.' && numpadValue.includes('.')) return
        if (numpadValue.includes('.') && numpadValue.split('.')[1].length >= 2) return
        setNumpadValue(prev => prev + digit)
    }
    const handleNumpadDelete = () => setNumpadValue(prev => prev.slice(0, -1))
    const handleNumpadClear = () => setNumpadValue('')
    const handleNumpadQuick = (amount: number) => setNumpadValue(amount.toFixed(2))

    const numpadNumeric = parseFloat(numpadValue) || 0
    const numpadChangeAmount = numpadNumeric * 100 - total // in cents

    // Build the payment pills from the enabled methods only
    const paymentPills = enabledPaymentMethods
        .map(key => POS_PAYMENT_CONFIG.find(pc => pc.key === key))
        .filter(Boolean) as typeof POS_PAYMENT_CONFIG

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

    // ── Step indicator dots ──
    const stepIndex = checkoutStep === 'cart' ? 0 : checkoutStep === 'payment' ? 1 : 2
    const stepLabels = [
        posLabel('panel.pos.cart', labels),
        posLabel('panel.pos.selectPayment', labels),
        paymentMethod === 'cash'
            ? posLabel('panel.pos.cashTendered', labels)
            : posLabel('panel.pos.confirmPayment', labels),
    ]

    const goBack = () => {
        if (checkoutStep === 'cash_numpad') {
            setCheckoutStep('payment')
            setNumpadValue('')
        } else if (checkoutStep === 'payment') {
            setCheckoutStep('cart')
        }
    }

    return (
        <div className="flex flex-col h-full bg-sf-0">
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />

            {/* ═══════════════════════════════════════════════ */}
            {/* Step Indicator (with animated progress bar)    */}
            {/* ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {checkoutStep !== 'cart' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-sf-2 overflow-hidden"
                    >
                        <div className="px-4 py-2 space-y-1.5">
                            {/* Step labels */}
                            <div className="flex items-center gap-1.5">
                                {stepLabels.map((label, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        {i > 0 && <ChevronRight className="w-3 h-3 text-tx-faint flex-shrink-0" />}
                                        <span
                                            className={`text-[10px] font-semibold transition-colors duration-300 ${i === stepIndex ? 'text-brand' : i < stepIndex ? 'text-brand-dark' : 'text-tx-muted'}`}
                                        >
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {/* Animated progress bar */}
                            <div className="h-0.5 bg-sf-2 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${((stepIndex + 1) / stepLabels.length) * 100}%` }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* STEP 1: CART VIEW                                         */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                {checkoutStep === 'cart' && (
                    <motion.div
                        key="cart"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col flex-1 min-h-0"
                    >
                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-sf-2 bg-glass-heavy backdrop-blur-sm flex-shrink-0">
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
                                        {/* Park/Hold */}
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
                                        {/* Clear */}
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

                        {/* ── Customer pill (compact inline) ── */}
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

                        {/* ── Items list (ONLY scrollable section) ── */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5 space-y-1">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-tx-muted gap-3 py-12">
                                    <motion.div
                                        className="w-16 h-16 rounded-2xl bg-sf-1 flex items-center justify-center"
                                        initial={{ scale: 0.7, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.1 }}
                                    >
                                        <ShoppingCart className="w-7 h-7 opacity-25" />
                                    </motion.div>
                                    <motion.p
                                        className="text-sm text-tx-faint font-medium"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        {posLabel('panel.pos.emptyCart', labels)}
                                    </motion.p>
                                    <motion.p
                                        className="text-[11px] text-tx-faint text-center max-w-[180px]"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        {posLabel('panel.pos.emptyCartHint', labels) || 'Selecciona productos del catálogo para comenzar'}
                                    </motion.p>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {items.map(item => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, x: -16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="relative rounded-xl overflow-hidden"
                                        >
                                            {/* Swipe-to-delete backdrop — only visible during drag */}
                                            <div className="absolute inset-0 bg-rose-500/8 flex items-center justify-end pr-4 rounded-xl">
                                                <Trash2 className="w-4 h-4 text-rose-400" />
                                            </div>
                                            {/* Single-row compact item */}
                                            <motion.div
                                                drag="x"
                                                dragConstraints={{ left: -72, right: 0 }}
                                                dragElastic={0.12}
                                                onDragEnd={(_, info) => {
                                                    if (info.offset.x < -55) onRemoveItem(item.id)
                                                }}
                                                className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-sf-0
                                                           hover:bg-sf-1 transition-colors duration-100
                                                           cursor-grab active:cursor-grabbing relative z-10"
                                                style={{ touchAction: 'pan-y' }}
                                            >
                                                {/* Thumbnail 36px */}
                                                {item.thumbnail ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={item.thumbnail}
                                                        alt=""
                                                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg bg-sf-2 flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-4 h-4 text-tx-faint" />
                                                    </div>
                                                )}
                                                {/* Title + variant */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-tx truncate leading-tight">
                                                        {item.title}
                                                    </p>
                                                    {item.variant_title && (
                                                        <p className="text-[10px] text-tx-faint truncate">{item.variant_title}</p>
                                                    )}
                                                </div>
                                                {/* Inline qty stepper */}
                                                <div className="flex items-center gap-0 bg-sf-1 rounded-lg flex-shrink-0">
                                                    <button
                                                        onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                                                        aria-label={`Decrease quantity of ${item.title}`}
                                                        className="w-7 h-7 flex items-center justify-center
                                                                   hover:bg-sf-2 rounded-l-lg transition-colors active:scale-90"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <motion.span
                                                        key={item.quantity}
                                                        initial={{ scale: 1.2 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-6 text-center text-xs font-bold tabular-nums"
                                                    >
                                                        {item.quantity}
                                                    </motion.span>
                                                    <button
                                                        onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                                        aria-label={`Increase quantity of ${item.title}`}
                                                        className="w-7 h-7 flex items-center justify-center
                                                                   hover:bg-sf-2 rounded-r-lg transition-colors active:scale-90"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {/* Item total */}
                                                <span className="text-xs font-bold text-tx tabular-nums w-16 text-right shrink-0">
                                                    {formatCurrency(item.unit_price * item.quantity, item.currency_code)}
                                                </span>
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                            {/* ── Recommendations (inside scroll, capped height) ── */}
                            {showRecommendations && items.length > 0 && onAddToCart && (
                                <div className="pt-2 pb-1 max-h-[120px]">
                                    <Suspense fallback={null}>
                                        <POSRecommendations
                                            cartItems={items}
                                            allProducts={products as any}
                                            onAddItem={(item) => onAddToCart?.(item)}
                                            labels={labels}
                                            defaultCurrency={defaultCurrency}
                                            maxSuggestions={3}
                                        />
                                    </Suspense>
                                </div>
                            )}

                        {/* ── Pinned Footer: Promos + Totals + PAY ── */}
                        <div className="border-t border-sf-2 px-4 py-2.5 space-y-2 bg-glass-heavy backdrop-blur-sm flex-shrink-0">

                            {/* ── Active promos display (discount/coupon badges) ── */}
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

                            {/* ── Collapsed promos: expand to show discount/coupon inputs ── */}
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

                            {/* ── Expanded discount input ── */}
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
                                        <button
                                            onClick={applyDiscount}
                                            className="px-2.5 py-1.5 text-xs bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
                                        >
                                            OK
                                        </button>
                                        <button
                                            onClick={() => { setShowDiscountInput(false); setDiscountValue('') }}
                                            className="text-tx-muted hover:text-rose-500 transition-colors p-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {/* Coupon sub-row (collapsed by default) */}
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

                            {/* ── Totals ── */}
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
                                    <span className="text-xl font-black tabular-nums">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            {/* ★ PAGAR BUTTON — with glow pulse ★ */}
                            <button
                                onClick={handleCharge}
                                disabled={items.length === 0 || processing}
                                className={`w-full h-[60px] rounded-2xl text-white font-bold text-lg
                                           active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed
                                           transition-all duration-200
                                           flex items-center justify-center gap-2.5
                                           bg-brand shadow-xl shadow-brand/20 hover:bg-brand-dark`}
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
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* STEP 2: PAYMENT METHOD SELECTION                          */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {checkoutStep === 'payment' && (
                    <motion.div
                        key="payment"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col flex-1 min-h-0"
                    >
                        {/* ── Payment step header ── */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-sf-2 bg-glass-heavy backdrop-blur-sm flex-shrink-0">
                            <button
                                onClick={goBack}
                                className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-sf-1 text-tx-sec
                                           flex items-center justify-center transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold text-tx flex-1">
                                {posLabel('panel.pos.selectPayment', labels)}
                            </span>
                            <span className="text-lg font-black tabular-nums text-tx">
                                {formatCurrency(total)}
                            </span>
                        </div>

                        {/* ── Payment content area ── */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
                            {/* ── Payment method pills (large, 72px) ── */}
                            <div className="grid grid-cols-2 gap-2">
                                {paymentPills.map(pm => {
                                    const Icon = pm.icon
                                    const isActive = paymentMethod === pm.key
                                    return (
                                        <button
                                            key={pm.key}
                                            onClick={() => onSetPayment(pm.key)}
                                            className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl text-xs font-semibold
                                                        transition-all duration-200 min-h-[72px] ${
                                                isActive
                                                    ? pm.activeClass
                                                    : 'bg-sf-1 text-tx-sec hover:bg-sf-2 border border-transparent'
                                            }`}
                                        >
                                            <Icon className="w-6 h-6" />
                                            <span>{posLabel(pm.labelKey, labels)}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* ── Per-method instructions ── */}
                            <AnimatePresence mode="wait">
                                {paymentMethod === 'cash' && (
                                    <motion.div
                                        key="cash-hint"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/40"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <Banknote className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-amber-800">
                                                {posLabel('panel.pos.cashPaymentTitle', labels) || 'Pago en efectivo'}
                                            </p>
                                            <p className="text-[11px] text-amber-600/80 mt-0.5">
                                                {posLabel('panel.pos.cashPaymentHint', labels) || 'Pulse Confirmar para entrar el importe recibido'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                                {paymentMethod === 'card_terminal' && (
                                    <motion.div
                                        key="card-hint"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/60 border border-blue-200/40"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <CreditCard className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-blue-800">
                                                {posLabel('panel.pos.cardTerminalTitle', labels) || 'Terminal de tarjeta'}
                                            </p>
                                            <p className="text-[11px] text-blue-600/80 mt-0.5">
                                                {posLabel('panel.pos.cardTerminalHint', labels) || 'Presente la tarjeta o dispositivo en el terminal'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                                {paymentMethod === 'twint' && (
                                    <motion.div
                                        key="twint-hint"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-violet-50/60 border border-violet-200/40"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                            <Smartphone className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-violet-800">
                                                {posLabel('panel.pos.twintTitle', labels) || 'Pago con Twint'}
                                            </p>
                                            <p className="text-[11px] text-violet-600/80 mt-0.5">
                                                {posLabel('panel.pos.twintHint', labels) || 'Se mostrará un código QR para el cliente'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                                {paymentMethod === 'manual_card' && (
                                    <motion.div
                                        key="manual-hint"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/40"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <CreditCard className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800">
                                                {posLabel('panel.pos.manualCardTitle', labels) || 'Registro manual'}
                                            </p>
                                            <p className="text-[11px] text-slate-600/80 mt-0.5">
                                                {posLabel('panel.pos.manualCardHint', labels) || 'Confirme que el pago con tarjeta ha sido procesado'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── Pinned Footer: CONFIRM / NEXT ── */}
                        <div className="border-t border-sf-2 px-4 py-3 bg-glass-heavy backdrop-blur-sm flex-shrink-0">
                            <button
                                onClick={handleCharge}
                                disabled={items.length === 0 || processing}
                                className="w-full h-[60px] rounded-2xl text-white font-bold text-lg
                                           active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed
                                           transition-all duration-200
                                           flex items-center justify-center gap-2
                                           relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, var(--color-pos-accent) 0%, var(--color-pos-accent-dark) 100%)', boxShadow: '0 6px 20px var(--color-pos-glow)' }}
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {posLabel('panel.pos.processing', labels)}
                                    </span>
                                ) : paymentMethod === 'cash' ? (
                                    <>
                                        <Banknote className="w-5 h-5" />
                                        {posLabel('panel.pos.enterAmount', labels) || 'Introducir Importe'}
                                    </>
                                ) : paymentMethod === 'card_terminal' ? (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        {posLabel('panel.pos.presentCard', labels)} {formatCurrency(total)}
                                    </>
                                ) : paymentMethod === 'twint' ? (
                                    <>
                                        <Smartphone className="w-5 h-5" />
                                        {posLabel('panel.pos.scanTwint', labels)} {formatCurrency(total)}
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        {posLabel('panel.pos.confirmPayment', labels)} {formatCurrency(total)}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* STEP 3: CASH NUMPAD (inline, touch-first)                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {checkoutStep === 'cash_numpad' && (
                    <motion.div
                        key="numpad"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col flex-1 min-h-0"
                    >
                        {/* ── Numpad header ── */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-sf-2 bg-glass-heavy backdrop-blur-sm flex-shrink-0">
                            <button
                                onClick={goBack}
                                className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-sf-1 text-tx-sec
                                           flex items-center justify-center transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold text-tx flex-1">
                                {posLabel('panel.pos.cashTendered', labels)}
                            </span>
                            <span className="text-xs text-tx-muted">
                                {posLabel('panel.pos.totalDue', labels) || 'Total'}: <span className="font-bold text-tx">{formatCurrency(total)}</span>
                            </span>
                        </div>

                        {/* ── Calculator display ── */}
                        <div className="px-5 pt-4 pb-2 bg-glass">
                            <p className="text-3xl font-black text-tx tabular-nums text-right">
                                {numpadValue
                                    ? formatCurrency(Math.round(parseFloat(numpadValue) * 100))
                                    : <span className="text-tx-faint">0.00</span>
                                }
                            </p>
                            {/* Change / Short */}
                            {numpadNumeric > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-right text-xs font-semibold mt-1"
                                    style={{ color: numpadChangeAmount >= 0 ? 'var(--color-pos-accent)' : '#f43f5e' }}
                                
                                >
                                    {numpadChangeAmount >= 0
                                        ? `${posLabel('panel.pos.change', labels)}: ${formatCurrency(numpadChangeAmount)}`
                                        : `${posLabel('panel.pos.shortAmount', labels)}: ${formatCurrency(Math.abs(numpadChangeAmount))}`
                                    }
                                </motion.div>
                            )}
                        </div>

                        {/* ── Quick amounts ── */}
                        <div className="flex gap-1.5 px-3 pt-3 pb-1">
                            {QUICK_AMOUNTS.map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => handleNumpadQuick(amount)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all
                                               active:scale-[0.95] ${
                                        numpadValue === amount.toFixed(2)
                                            ? 'bg-brand text-white shadow-sm'
                                            : 'bg-brand-subtle text-brand hover:bg-brand-muted'
                                    }`}
                                >
                                    {amount}
                                </button>
                            ))}
                            {/* Exact button */}
                            <button
                                onClick={() => handleNumpadQuick(total / 100)}
                                className="flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all active:scale-[0.95]"
                                style={numpadValue === (total / 100).toFixed(2)
                                    ? { background: 'var(--color-pos-accent)', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }
                                    : { background: 'var(--color-pos-surface)', color: 'var(--color-pos-accent-dark)' }
                                }
                            >
                                {posLabel('panel.pos.exact', labels) || 'Exacto'}
                            </button>
                        </div>

                        {/* ── Digit grid ── */}
                        <div className="grid grid-cols-3 gap-1.5 px-3 py-2 flex-1 min-h-0">
                            {NUMPAD_DIGITS.map(d => (
                                <button
                                    key={d}
                                    onClick={() => handleNumpadDigit(d)}
                                    className="rounded-xl bg-sf-1 text-lg font-bold text-tx
                                               hover:bg-sf-2 active:bg-sf-3 active:scale-[0.96]
                                               transition-all duration-100 min-h-[48px]"
                                >
                                    {d}
                                </button>
                            ))}
                            {/* Backspace */}
                            <button
                                onClick={handleNumpadDelete}
                                onDoubleClick={handleNumpadClear}
                                className="rounded-xl bg-sf-1 flex items-center justify-center
                                           text-tx-sec hover:bg-sf-2 active:bg-sf-3 active:scale-[0.96]
                                           transition-all duration-100 min-h-[48px]"
                                title={posLabel('panel.pos.deleteHint', labels) || 'Tap: borrar · Doble-tap: limpiar'}
                            >
                                <Delete className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── Confirm Button ── */}
                        <div className="border-t border-sf-2 px-3 py-3 bg-glass-heavy backdrop-blur-sm flex-shrink-0 flex gap-2">
                            <button
                                onClick={goBack}
                                className="flex-1 h-[52px] rounded-2xl bg-sf-1 text-sm font-semibold text-tx-sec
                                           hover:bg-sf-2 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                {posLabel('panel.pos.cancel', labels)}
                            </button>
                            <button
                                onClick={handleCharge}
                                disabled={numpadChangeAmount < 0 || processing}
                                className="flex-[2] h-[56px] rounded-2xl text-white text-sm font-bold
                                           active:scale-[0.97]
                                           disabled:opacity-30 disabled:cursor-not-allowed
                                           transition-all duration-150 flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, var(--color-pos-accent) 0%, var(--color-pos-accent-dark) 100%)', boxShadow: '0 6px 20px var(--color-pos-glow)' }}
                            >
                                <Check className="w-5 h-5" />
                                {posLabel('panel.pos.confirmCharge', labels)} {total > 0 ? formatCurrency(total) : ''}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export { getParkedSales, removeParkedSale }
export type { ParkedSale }
