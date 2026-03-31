/**
 * POSCouponInput — Coupon Code Entry with Validation
 *
 * Inline coupon code input that validates against stored coupons,
 * shows success/error feedback with animations, and applies 
 * the discount to the cart.
 */
'use client'

import { useState, useCallback, useRef } from 'react'
import { Tag, X, Check, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { POSCoupon, POSDiscount } from '@/lib/pos/pos-config'
import { posLabel } from '@/lib/pos/pos-i18n'

// ── Local coupon storage ──

const COUPONS_KEY = 'pos-coupons'

function getStoredCoupons(): POSCoupon[] {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem(COUPONS_KEY) || '[]')
    } catch {
        return []
    }
}

function saveCoupons(coupons: POSCoupon[]): void {
    localStorage.setItem(COUPONS_KEY, JSON.stringify(coupons))
}

/** Create a demo coupon (for testing) */
export function createPOSCoupon(coupon: POSCoupon): void {
    const coupons = getStoredCoupons()
    const existing = coupons.findIndex(c => c.code.toUpperCase() === coupon.code.toUpperCase())
    if (existing >= 0) {
        coupons[existing] = coupon
    } else {
        coupons.push(coupon)
    }
    saveCoupons(coupons)
}

/** Validate a coupon code and return the discount */
function validateCoupon(code: string, orderTotal: number): {
    valid: boolean
    discount: POSDiscount | null
    coupon: POSCoupon | null
    error?: string
} {
    const coupons = getStoredCoupons()
    const coupon = coupons.find(c =>
        c.code.toUpperCase() === code.toUpperCase() && c.active
    )

    if (!coupon) {
        return { valid: false, discount: null, coupon: null, error: 'Código no válido' }
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return { valid: false, discount: null, coupon: null, error: 'Cupón expirado' }
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return { valid: false, discount: null, coupon: null, error: 'Cupón agotado' }
    }

    // Check minimum order
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
        return { valid: false, discount: null, coupon: null, error: `Pedido mínimo no alcanzado` }
    }

    // Convert to POSDiscount
    let discount: POSDiscount | null = null
    if (coupon.type === 'percentage') {
        discount = { type: 'percentage', value: coupon.value }
    } else if (coupon.type === 'fixed') {
        discount = { type: 'fixed', value: coupon.value }
    } else if (coupon.type === 'free_product') {
        // Free product type — treat as a fixed discount for the product's price
        discount = { type: 'fixed', value: coupon.value }
    }

    return { valid: true, discount, coupon }
}

/** Increment coupon usage */
function markCouponUsed(code: string): void {
    const coupons = getStoredCoupons()
    const idx = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase())
    if (idx >= 0) {
        coupons[idx].usedCount++
        saveCoupons(coupons)
    }
}

// ── Component ──

interface POSCouponInputProps {
    onApply: (discount: POSDiscount, couponCode: string) => void
    orderTotal: number       // minor units
    currentCoupon?: string
    onRemove?: () => void
    labels: Record<string, string>
    defaultCurrency: string
}

type CouponState = 'idle' | 'validating' | 'valid' | 'invalid'

export default function POSCouponInput({
    onApply,
    orderTotal,
    currentCoupon,
    onRemove,
    labels,
    defaultCurrency,
}: POSCouponInputProps) {
    const [code, setCode] = useState('')
    const [state, setState] = useState<CouponState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [discountDesc, setDiscountDesc] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const formatCurrency = useCallback((amount: number) =>
        new Intl.NumberFormat(undefined, { style: 'currency', currency: defaultCurrency })
            .format(amount / 100),
    [defaultCurrency])

    const handleSubmit = useCallback(() => {
        if (!code.trim()) return
        setState('validating')
        setErrorMsg('')

        // Simulate small delay for UX polish
        setTimeout(() => {
            const result = validateCoupon(code.trim(), orderTotal)

            if (result.valid && result.discount && result.coupon) {
                setState('valid')
                // Build description
                if (result.coupon.type === 'percentage') {
                    setDiscountDesc(`-${result.coupon.value}%`)
                } else if (result.coupon.type === 'fixed') {
                    setDiscountDesc(`-${formatCurrency(result.coupon.value)}`)
                } else {
                    setDiscountDesc(labels['panel.pos.freeProduct'] || 'Producto gratis')
                }

                markCouponUsed(code.trim())
                onApply(result.discount, code.trim().toUpperCase())

                // Reset after a beat
                setTimeout(() => {
                    setState('idle')
                    setCode('')
                }, 2000)
            } else {
                setState('invalid')
                setErrorMsg(result.error || (labels['panel.pos.invalidCoupon'] || 'Cupón no válido'))
                setTimeout(() => {
                    setState('idle')
                    setErrorMsg('')
                }, 3000)
            }
        }, 400)
    }, [code, orderTotal, onApply, formatCurrency, labels])

    // If coupon already applied
    if (currentCoupon) {
        return (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/40"
            >
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 flex-1">
                    {currentCoupon}
                </span>
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="p-1 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                        <X className="w-3 h-3 text-emerald-600" />
                    </button>
                )}
            </motion.div>
        )
    }

    const statusColors = {
        idle: 'border-sf-2 focus-within:border-brand',
        validating: 'border-brand animate-pulse',
        valid: 'border-emerald-400 bg-emerald-50/50',
        invalid: 'border-rose-400 bg-rose-50/50',
    }

    return (
        <div className="space-y-1.5">
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-300 ${statusColors[state]}`}>
                <Tag className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                    state === 'valid' ? 'text-emerald-500'
                    : state === 'invalid' ? 'text-rose-500'
                    : 'text-tx-muted'
                }`} />

                <input
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder={labels['panel.pos.enterCoupon'] || 'Código cupón'}
                    disabled={state === 'validating' || state === 'valid'}
                    className="flex-1 text-xs font-semibold bg-transparent border-none outline-none
                               placeholder:text-tx-faint text-tx uppercase tracking-wider min-h-[36px]"
                />

                <AnimatePresence mode="wait">
                    {state === 'idle' && code.length > 0 && (
                        <motion.button
                            key="apply"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={handleSubmit}
                            className="px-2.5 py-1 rounded-lg bg-brand text-white text-[10px] font-bold
                                       hover:bg-brand transition-colors min-h-[28px]"
                        >
                            {labels['panel.pos.apply'] || 'Aplicar'}
                        </motion.button>
                    )}
                    {state === 'validating' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Loader2 className="w-4 h-4 text-brand animate-spin" />
                        </motion.div>
                    )}
                    {state === 'valid' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 text-emerald-600"
                        >
                            <Check className="w-4 h-4" />
                            <span className="text-[10px] font-bold">{discountDesc}</span>
                        </motion.div>
                    )}
                    {state === 'invalid' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, x: [0, -4, 4, -4, 0] }}
                            exit={{ opacity: 0 }}
                        >
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error message */}
            <AnimatePresence>
                {errorMsg && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[10px] text-rose-500 font-medium px-1"
                    >
                        {errorMsg}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}
