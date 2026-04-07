'use client'

import { useState, useCallback, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { getEnabledMethods, type PaymentMethod } from '@/lib/payment-methods'
import type { CheckoutCountry } from './steps/CheckoutAddressStep'
import {
    isPaymentMethodAvailable,
    initializePaymentSession,
    getStripeClientSecret,
    submitBankTransferOrder,
    submitCODOrder,
    submitWhatsAppOrder,
    setCartAddress,
    getShippingOptions,
    setShippingMethod,
    getCartTotals,
    type CheckoutAddress,
    type ShippingOption,
    type CartTotals,
} from '@/app/[lang]/(shop)/checkout/actions'
import { trackEvent } from '@/lib/analytics'
import type { StoreConfig, FeatureFlags, PlanLimits } from '@/lib/config'
import { useI18n } from '@/lib/i18n/provider'
import { X, ArrowLeft, ArrowRight, Loader2, User, MapPin, Truck, Wallet, CreditCard, Check } from 'lucide-react'

// Step components
import CheckoutInfoStep from './steps/CheckoutInfoStep'
import CheckoutAddressStep from './steps/CheckoutAddressStep'
import CheckoutShippingStep from './steps/CheckoutShippingStep'
import CheckoutMethodStep from './steps/CheckoutMethodStep'
import CheckoutPaymentStep from './steps/CheckoutPaymentStep'
import CheckoutConfirmationStep from './steps/CheckoutConfirmationStep'
import CheckoutOrderSummary from './steps/CheckoutOrderSummary'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckoutModalProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    countries?: CheckoutCountry[]
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

type CheckoutStep = 'info' | 'address' | 'shipping' | 'method' | 'payment' | 'confirmation'

const ALL_STEPS: CheckoutStep[] = ['info', 'address', 'shipping', 'method', 'payment', 'confirmation']

const STEP_ICONS: Record<string, typeof User> = {
    info: User,
    address: MapPin,
    shipping: Truck,
    method: Wallet,
    payment: CreditCard,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckoutModal({
    config,
    featureFlags,
    planLimits,
    countries = [],
    bankDetails,
    isOpen,
    onClose,
}: CheckoutModalProps) {
    const { cart, resetCart } = useCart()
    const { t, locale } = useI18n()

    // Step navigation
    const [step, setStep] = useState<CheckoutStep>('info')

    // Customer info
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')

    // Structured address
    const [street, setStreet] = useState('')
    const [street2, setStreet2] = useState('')
    const [city, setCity] = useState('')
    const [postalCode, setPostalCode] = useState('')
    const [countryCode, setCountryCode] = useState(countries[0]?.iso_2 ?? 'us')
    const [notes, setNotes] = useState('')
    const [addressLoading, setAddressLoading] = useState(false)

    // Shipping options
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
    const [selectedShipping, setSelectedShipping] = useState<string | null>(null)
    const [shippingLoading, setShippingLoading] = useState(false)

    // Payment method
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
    const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([])
    const [loadingMethods, setLoadingMethods] = useState(true)

    // Medusa-computed cart totals
    const [cartTotals, setCartTotals] = useState<CartTotals | null>(null)

    // Stripe state
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [stripeLoading, setStripeLoading] = useState(false)

    // Order confirmation
    const [orderResult, setOrderResult] = useState<{ id: string; display_id: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Dynamic steps: skip 'shipping' if no shipping options available
    const activeSteps = shippingOptions.length > 0
        ? ALL_STEPS
        : ALL_STEPS.filter((s) => s !== 'shipping')
    const stepIndex = activeSteps.indexOf(step)

    // Items & formatting
    const items = cart?.items ?? []
    const displayCurrency = cartTotals?.currency_code || config.default_currency
    const displayTotal = cartTotals?.total ?? items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: displayCurrency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    // Load available methods
    useEffect(() => {
        async function loadMethods() {
            setLoadingMethods(true)
            const allMethods = getEnabledMethods(featureFlags, planLimits)
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

    // Reset on close / add body class for overlay management
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('drawer-open')
            trackEvent('checkout_start', { item_count: cart?.items?.length ?? 0 })
        } else {
            document.body.classList.remove('drawer-open')
            setStep('info')
            setSelectedMethod(null)
            setClientSecret(null)
            setOrderResult(null)
            setError(null)
            setStripeLoading(false)
        }
        return () => {
            document.body.classList.remove('drawer-open')
        }
    }, [isOpen])

    // ---------------------------------------------------------------------------
    // Navigation
    // ---------------------------------------------------------------------------

    function goNext() {
        const nextIdx = stepIndex + 1
        if (nextIdx < activeSteps.length) setStep(activeSteps[nextIdx])
    }

    function goBack() {
        const prevIdx = stepIndex - 1
        if (prevIdx >= 0) setStep(activeSteps[prevIdx])
    }

    // When entering address → save to Medusa + load shipping options
    async function handleAddressContinue() {
        if (!cart?.id) return
        setAddressLoading(true)
        setError(null)

        const addr: CheckoutAddress = {
            first_name: firstName,
            last_name: lastName,
            address_1: street,
            address_2: street2 || undefined,
            city,
            postal_code: postalCode,
            country_code: countryCode,
            phone: phone || undefined,
        }

        try {
            // 1. Save address on Medusa cart
            const addrRes = await setCartAddress(cart.id, addr)
            if (!addrRes.success) {
                setError(addrRes.error ?? t('checkout.errors.addressSave'))
                setAddressLoading(false)
                return
            }

            // 2. Try to load shipping options (graceful fallback)
            const shipRes = await getShippingOptions(cart.id)
            setShippingOptions(shipRes.options)

            // 3. If only one shipping option, auto-select it
            if (shipRes.options.length === 1) {
                setSelectedShipping(shipRes.options[0].id)
                await setShippingMethod(cart.id, shipRes.options[0].id)
            }

            // 4. Fetch Medusa-computed totals
            const totalsRes = await getCartTotals(cart.id)
            if (totalsRes.totals) setCartTotals(totalsRes.totals)
        } catch {
            setError(t('checkout.errors.addressSave'))
        } finally {
            setAddressLoading(false)
        }

        goNext()
    }

    // When selecting a shipping option
    async function handleShippingContinue() {
        if (!cart?.id || !selectedShipping) return
        setShippingLoading(true)
        setError(null)
        try {
            await setShippingMethod(cart.id, selectedShipping)
            const totalsRes = await getCartTotals(cart.id)
            if (totalsRes.totals) setCartTotals(totalsRes.totals)
        } catch {
            setError(t('checkout.errors.shippingSave'))
        } finally {
            setShippingLoading(false)
        }
        goNext()
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
        resetCart()
    }, [resetCart])

    const handleBankTransferConfirm = useCallback(async () => {
        if (!cart?.id) return
        const res = await submitBankTransferOrder(cart.id, {
            name: `${firstName} ${lastName}`.trim(),
            email,
            phone,
            address: street,
            notes,
        })
        if (res.error) throw new Error(res.error)
        if (res.order) setOrderResult({ id: res.order.id, display_id: res.order.display_id })
        setStep('confirmation')
        resetCart()
    }, [cart?.id, firstName, lastName, email, phone, street, notes, resetCart])

    const handleCODConfirm = useCallback(async () => {
        if (!cart?.id) return
        const res = await submitCODOrder(cart.id, {
            name: `${firstName} ${lastName}`.trim(),
            email,
            phone,
            address: street,
            notes,
        })
        if (res.error) throw new Error(res.error)
        if (res.order) setOrderResult({ id: res.order.id, display_id: res.order.display_id })
        setStep('confirmation')
        resetCart()
    }, [cart?.id, firstName, lastName, email, phone, street, notes, resetCart])

    const handleWhatsAppComplete = useCallback((order?: { id: string; display_id: number }) => {
        if (order) setOrderResult(order)
        setStep('confirmation')
        resetCart()
    }, [resetCart])

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------

    function canContinue(): boolean {
        switch (step) {
            case 'info':
                return firstName.trim().length > 0 && lastName.trim().length > 0
            case 'address':
                return street.trim().length > 0 && city.trim().length > 0 && postalCode.trim().length > 0
            case 'shipping':
                return selectedShipping !== null
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

    const customerName = `${firstName} ${lastName}`.trim()

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-sf-0 border border-sf-3 rounded-t-2xl md:rounded-2xl shadow-2xl animate-slide-up safe-area-bottom">
                {/* Header */}
                <div className="sticky top-0 bg-glass-heavy backdrop-blur-xl border-b border-sf-3 p-4 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {stepIndex > 0 && step !== 'confirmation' && (
                                <button
                                    onClick={goBack}
                                    className="p-1.5 rounded-lg hover:bg-sf-1 transition-colors"
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
                            className="p-1.5 rounded-lg hover:bg-sf-1 transition-colors"
                            type="button"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Step indicator — icon stepper */}
                    {step !== 'confirmation' && (
                        <div className="flex items-center justify-between gap-1">
                            {activeSteps.slice(0, -1).map((s: CheckoutStep, i: number) => {
                                const isComplete = i < stepIndex
                                const isActive = i === stepIndex
                                const StepIcon = STEP_ICONS[s] || User
                                return (
                                    <div key={s} className="flex-1 flex items-center gap-1">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                                            isComplete ? 'bg-brand text-white' :
                                            isActive ? 'bg-brand/15 text-brand ring-2 ring-brand/30' :
                                            'bg-sf-2 text-tx-muted'
                                        }`}>
                                            {isComplete ? (
                                                <Check className="w-3 h-3" strokeWidth={2.5} />
                                            ) : (
                                                <StepIcon className="w-3 h-3" strokeWidth={1.5} />
                                            )}
                                        </div>
                                        {i < activeSteps.length - 2 && (
                                            <div className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
                                                isComplete ? 'bg-brand' : 'bg-sf-3'
                                            }`} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-5">
                    {step === 'info' && (
                        <CheckoutInfoStep
                            firstName={firstName}
                            lastName={lastName}
                            email={email}
                            phone={phone}
                            onFirstNameChange={setFirstName}
                            onLastNameChange={setLastName}
                            onEmailChange={setEmail}
                            onPhoneChange={setPhone}
                            t={t}
                        />
                    )}

                    {step === 'address' && (
                        <CheckoutAddressStep
                            street={street}
                            street2={street2}
                            city={city}
                            postalCode={postalCode}
                            countryCode={countryCode}
                            notes={notes}
                            addressLoading={addressLoading}
                            featureFlags={featureFlags}
                            countries={countries}
                            lang={locale}
                            onStreetChange={setStreet}
                            onStreet2Change={setStreet2}
                            onCityChange={setCity}
                            onPostalCodeChange={setPostalCode}
                            onCountryCodeChange={setCountryCode}
                            onNotesChange={setNotes}
                            t={t}
                        />
                    )}

                    {step === 'shipping' && (
                        <CheckoutShippingStep
                            shippingOptions={shippingOptions}
                            selectedShipping={selectedShipping}
                            shippingLoading={shippingLoading}
                            onSelectShipping={setSelectedShipping}
                            formatPrice={formatPrice}
                            t={t}
                        />
                    )}

                    {step === 'method' && (
                        <CheckoutMethodStep
                            availableMethods={availableMethods}
                            selectedMethod={selectedMethod}
                            loadingMethods={loadingMethods}
                            onSelectMethod={setSelectedMethod}
                            t={t}
                        />
                    )}

                    {step === 'payment' && (
                        <CheckoutPaymentStep
                            selectedMethod={selectedMethod}
                            clientSecret={clientSecret}
                            stripeLoading={stripeLoading}
                            error={error}
                            config={config}
                            cartId={cart?.id}
                            items={items}
                            customerName={customerName}
                            customerEmail={email}
                            customerPhone={phone}
                            deliveryAddress={street}
                            notes={notes}
                            bankDetails={bankDetails}
                            totalFormatted={formatPrice(displayTotal)}
                            onStripeSuccess={handleStripeSuccess}
                            onError={(msg) => setError(msg)}
                            onWhatsAppComplete={handleWhatsAppComplete}
                            onBankTransferConfirm={handleBankTransferConfirm}
                            onCODConfirm={handleCODConfirm}
                            t={t}
                        />
                    )}

                    {step === 'confirmation' && (
                        <CheckoutConfirmationStep
                            orderResult={orderResult}
                            selectedMethod={selectedMethod}
                            onClose={onClose}
                            t={t}
                        />
                    )}

                    {/* Order summary (always shown except confirmation) */}
                    {step !== 'confirmation' && (
                        <CheckoutOrderSummary
                            items={items}
                            cartTotals={cartTotals}
                            displayTotal={displayTotal}
                            formatPrice={formatPrice}
                            t={t}
                            freeShippingThreshold={config.free_shipping_threshold}
                            currency={displayCurrency}
                            locale={locale}
                        />
                    )}
                </div>

                {/* Footer with navigation (except for payment and confirmation) */}
                {step !== 'payment' && step !== 'confirmation' && (
                    <div className="sticky bottom-0 bg-glass-heavy backdrop-blur-xl border-t border-sf-3 p-4">
                        <button
                            onClick={
                                step === 'address' ? handleAddressContinue
                                    : step === 'shipping' ? handleShippingContinue
                                        : step === 'method' ? handleMethodContinue
                                            : goNext
                            }
                            disabled={!canContinue() || addressLoading || shippingLoading}
                            className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                        >
                            {(addressLoading || shippingLoading) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {t('checkout.continue')}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
