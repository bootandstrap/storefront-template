'use client'

import { useState, useCallback, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { getEnabledMethods, type PaymentMethod } from '@/lib/payment-methods'
import { isPaymentMethodAvailable, initializePaymentSession, getStripeClientSecret, submitBankTransferOrder, submitCODOrder } from '@/app/[lang]/(shop)/checkout/actions'
import StripeCheckoutFlow from '@/components/checkout/StripeCheckoutFlow'
import WhatsAppCheckoutFlow from '@/components/checkout/WhatsAppCheckoutFlow'
import BankTransferFlow from '@/components/checkout/BankTransferFlow'
import CashOnDeliveryFlow from '@/components/checkout/CashOnDeliveryFlow'
import type { StoreConfig, FeatureFlags } from '@/lib/config'
import { useI18n } from '@/lib/i18n/provider'
import { X, ArrowLeft, ArrowRight, ShoppingBag, User, MapPin, CreditCard, CheckCircle, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckoutModalProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    bankDetails?: {
        bank_name?: string | null
        bank_account_number?: string | null
        bank_account_holder?: string | null
        bank_account_type?: string | null
        bank_nit?: string | null
    }
    isOpen: boolean
    onClose: () => void
}

type CheckoutStep = 'info' | 'address' | 'method' | 'payment' | 'confirmation'

const STEP_ORDER: CheckoutStep[] = ['info', 'address', 'method', 'payment', 'confirmation']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckoutModal({
    config,
    featureFlags,
    bankDetails,
    isOpen,
    onClose,
}: CheckoutModalProps) {
    const { cart } = useCart()
    const { t, locale } = useI18n()

    // Step navigation
    const [step, setStep] = useState<CheckoutStep>('info')
    const stepIndex = STEP_ORDER.indexOf(step)

    // Customer info
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')

    // Address
    const [address, setAddress] = useState('')
    const [notes, setNotes] = useState('')

    // Payment method
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
    const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([])
    const [loadingMethods, setLoadingMethods] = useState(true)

    // Stripe state
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [stripeLoading, setStripeLoading] = useState(false)

    // Order confirmation
    const [orderResult, setOrderResult] = useState<{ id: string; display_id: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Items & formatting
    const items = cart?.items ?? []
    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'COP'
    const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat(locale === 'es' ? 'es-CO' : locale, {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    // Load available methods
    useEffect(() => {
        async function loadMethods() {
            setLoadingMethods(true)
            const allMethods = getEnabledMethods(featureFlags)
            const checks = await Promise.all(
                allMethods.map(async (m) => ({
                    method: m,
                    available: await isPaymentMethodAvailable(m.id),
                }))
            )
            setAvailableMethods(checks.filter((c) => c.available).map((c) => c.method))
            setLoadingMethods(false)
        }
        if (isOpen) loadMethods()
    }, [isOpen, featureFlags])

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep('info')
            setSelectedMethod(null)
            setClientSecret(null)
            setOrderResult(null)
            setError(null)
            setStripeLoading(false)
        }
    }, [isOpen])

    // ---------------------------------------------------------------------------
    // Navigation
    // ---------------------------------------------------------------------------

    function goNext() {
        const nextIdx = stepIndex + 1
        if (nextIdx < STEP_ORDER.length) setStep(STEP_ORDER[nextIdx])
    }

    function goBack() {
        const prevIdx = stepIndex - 1
        if (prevIdx >= 0) setStep(STEP_ORDER[prevIdx])
    }

    // When entering payment step with Stripe, init session
    async function handleMethodContinue() {
        if (!selectedMethod) return

        if (selectedMethod === 'card' && cart?.id) {
            setStripeLoading(true)
            setError(null)
            try {
                const initRes = await initializePaymentSession(cart.id, 'pp_stripe_stripe')
                if (!initRes.success) {
                    setError(initRes.error ?? t('checkout.errors.paymentInit'))
                    setStripeLoading(false)
                    return
                }
                const secretRes = await getStripeClientSecret(cart.id)
                if (!secretRes.clientSecret) {
                    setError(secretRes.error ?? t('checkout.errors.paymentDetails'))
                    setStripeLoading(false)
                    return
                }
                setClientSecret(secretRes.clientSecret)
            } catch {
                setError(t('checkout.errors.cardInit'))
            } finally {
                setStripeLoading(false)
            }
        }

        goNext()
    }

    // ---------------------------------------------------------------------------
    // Order completion handlers
    // ---------------------------------------------------------------------------

    const handleStripeSuccess = useCallback((_paymentIntentId: string) => {
        // After Stripe confirms, the webhook handles order creation
        // Show confirmation with a generic success message
        setOrderResult({ id: 'stripe-pending', display_id: 0 })
        setStep('confirmation')
    }, [])

    const handleBankTransferConfirm = useCallback(async () => {
        if (!cart?.id) return
        const res = await submitBankTransferOrder(cart.id, {
            name,
            email,
            phone,
            address,
            notes,
        })
        if (res.error) throw new Error(res.error)
        if (res.order) setOrderResult({ id: res.order.id, display_id: res.order.display_id })
        setStep('confirmation')
    }, [cart?.id, name, email, phone, address, notes])

    const handleCODConfirm = useCallback(async () => {
        if (!cart?.id) return
        const res = await submitCODOrder(cart.id, {
            name,
            email,
            phone,
            address,
            notes,
        })
        if (res.error) throw new Error(res.error)
        if (res.order) setOrderResult({ id: res.order.id, display_id: res.order.display_id })
        setStep('confirmation')
    }, [cart?.id, name, email, phone, address, notes])

    const handleWhatsAppComplete = useCallback(() => {
        onClose()
    }, [onClose])

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------

    function canContinue(): boolean {
        switch (step) {
            case 'info':
                return name.trim().length > 0
            case 'address':
                return true // Address optional for some methods
            case 'method':
                return selectedMethod !== null
            default:
                return true
        }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-0 border border-surface-3 rounded-t-2xl md:rounded-2xl shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="sticky top-0 bg-surface-0/80 backdrop-blur-xl border-b border-surface-3 p-4 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {stepIndex > 0 && step !== 'confirmation' && (
                                <button
                                    onClick={goBack}
                                    className="p-1.5 rounded-lg hover:bg-surface-1 transition-colors"
                                    type="button"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                            )}
                            <h2 className="text-lg font-bold font-display">
                                {t('checkout.title')}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-surface-1 transition-colors"
                            type="button"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Step indicator */}
                    {step !== 'confirmation' && (
                        <div className="flex gap-1">
                            {STEP_ORDER.slice(0, -1).map((s, i) => (
                                <div
                                    key={s}
                                    className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-surface-3'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-5">
                    {/* Step: Customer Info */}
                    {step === 'info' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <User className="w-5 h-5 text-primary" />
                                <h3 className="font-bold">{t('checkout.steps.info')}</h3>
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary block mb-1">
                                    {t('checkout.form.name')} *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('checkout.form.namePlaceholder')}
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary block mb-1">
                                    {t('checkout.form.email')}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary block mb-1">
                                    {t('checkout.form.phone')}
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+57 300 123 4567"
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step: Address */}
                    {step === 'address' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin className="w-5 h-5 text-primary" />
                                <h3 className="font-bold">{t('checkout.steps.address')}</h3>
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary block mb-1">
                                    {t('checkout.form.address')}
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder={t('checkout.form.addressPlaceholder')}
                                    className="input w-full"
                                />
                            </div>
                            {featureFlags.enable_order_notes && (
                                <div>
                                    <label className="text-sm text-text-secondary block mb-1">
                                        {t('checkout.form.notes')}
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t('checkout.form.notesPlaceholder')}
                                        rows={3}
                                        className="input w-full resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Payment Method Selection */}
                    {step === 'method' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <CreditCard className="w-5 h-5 text-primary" />
                                <h3 className="font-bold">{t('checkout.steps.method')}</h3>
                            </div>

                            {loadingMethods ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                                    <span className="ml-2 text-sm text-text-muted">
                                        {t('checkout.loadingMethods')}
                                    </span>
                                </div>
                            ) : availableMethods.length === 0 ? (
                                <div className="text-center py-8 text-text-muted">
                                    <p className="text-sm">
                                        {t('checkout.noMethods')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availableMethods.map((method) => {
                                        const Icon = method.icon
                                        const isSelected = selectedMethod === method.id
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => setSelectedMethod(method.id)}
                                                type="button"
                                                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${isSelected
                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                                    : 'border-surface-3 bg-white/3 hover:bg-white/5 hover:border-surface-2'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20' : 'bg-surface-1'
                                                    }`}>
                                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-text-muted'
                                                        }`} />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <p className="text-sm font-medium text-text-primary">
                                                        {method.label}
                                                    </p>
                                                    <p className="text-xs text-text-muted">
                                                        {method.description}
                                                    </p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                                    ? 'border-primary bg-primary'
                                                    : 'border-surface-3'
                                                    }`}>
                                                    {isSelected && (
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Payment (method-specific UI) */}
                    {step === 'payment' && (
                        <div className="animate-fade-in">
                            {stripeLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                                    <span className="ml-2 text-sm text-text-muted">
                                        {t('checkout.initPayment')}
                                    </span>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Stripe */}
                            {selectedMethod === 'card' && clientSecret && !stripeLoading && (
                                <StripeCheckoutFlow
                                    clientSecret={clientSecret}
                                    config={config}
                                    onSuccess={handleStripeSuccess}
                                    onError={(msg) => setError(msg)}
                                    totalFormatted={formatPrice(total)}
                                />
                            )}

                            {/* WhatsApp */}
                            {selectedMethod === 'whatsapp' && (
                                <WhatsAppCheckoutFlow
                                    config={config}
                                    items={items}
                                    customerName={name}
                                    deliveryAddress={address}
                                    notes={notes}
                                    onComplete={handleWhatsAppComplete}
                                />
                            )}

                            {/* Bank Transfer */}
                            {selectedMethod === 'bank_transfer' && (
                                <BankTransferFlow
                                    bankDetails={bankDetails ?? {}}
                                    totalFormatted={formatPrice(total)}
                                    onConfirm={handleBankTransferConfirm}
                                />
                            )}

                            {/* Cash on Delivery */}
                            {selectedMethod === 'cod' && (
                                <CashOnDeliveryFlow
                                    deliveryAddress={address}
                                    totalFormatted={formatPrice(total)}
                                    onConfirm={handleCODConfirm}
                                />
                            )}
                        </div>
                    )}

                    {/* Step: Confirmation */}
                    {step === 'confirmation' && (
                        <div className="text-center py-6 animate-fade-in">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-text-primary mb-2">
                                {t('checkout.confirmation.title')}
                            </h3>
                            {orderResult && orderResult.display_id > 0 && (
                                <p className="text-sm text-text-secondary mb-4">
                                    {t('checkout.confirmation.orderNumber')}{' '}
                                    <span className="font-bold text-primary">
                                        #{orderResult.display_id}
                                    </span>
                                </p>
                            )}
                            <p className="text-sm text-text-muted mb-6">
                                {selectedMethod === 'card'
                                    ? t('checkout.confirmation.cardMsg')
                                    : selectedMethod === 'bank_transfer'
                                        ? t('checkout.confirmation.bankMsg')
                                        : selectedMethod === 'cod'
                                            ? t('checkout.confirmation.codMsg')
                                            : t('checkout.confirmation.genericMsg')}
                            </p>
                            <button
                                onClick={onClose}
                                className="btn btn-primary px-8 py-2"
                                type="button"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    )}

                    {/* Order summary (always shown except confirmation) */}
                    {step !== 'confirmation' && (
                        <div className="mt-6 pt-4 border-t border-surface-3">
                            <div className="flex items-center gap-2 mb-2">
                                <ShoppingBag className="w-4 h-4 text-text-muted" />
                                <span className="text-xs text-text-muted">
                                    {t('checkout.itemCount', { count: String(items.length) })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-text-secondary">{t('cart.total')}</span>
                                <span className="text-lg font-bold text-primary">
                                    {formatPrice(total)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with navigation (except for payment and confirmation) */}
                {step !== 'payment' && step !== 'confirmation' && (
                    <div className="sticky bottom-0 bg-surface-0/80 backdrop-blur-xl border-t border-surface-3 p-4">
                        <button
                            onClick={step === 'method' ? handleMethodContinue : goNext}
                            disabled={!canContinue()}
                            className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                        >
                            {t('checkout.continue')}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
