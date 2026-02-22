'use client'

import { useState, useEffect } from 'react'
import { loadStripe, type Stripe, type Appearance } from '@stripe/stripe-js'
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js'
import { CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import type { StoreConfig } from '@/lib/config'
import { useI18n } from '@/lib/i18n/provider'


// ---------------------------------------------------------------------------
// Stripe instance (loaded once, PLACEHOLDER-safe)
// ---------------------------------------------------------------------------

let stripePromise: Promise<Stripe | null> | null = null

function getStripePromise(): Promise<Stripe | null> {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
    if (!key || key.includes('PLACEHOLDER')) return Promise.resolve(null)
    if (!stripePromise) stripePromise = loadStripe(key)
    return stripePromise!
}

// Map our locales to Stripe-supported locales
const STRIPE_LOCALE_MAP: Record<string, 'auto' | 'en' | 'es' | 'de' | 'fr' | 'it'> = {
    en: 'en',
    es: 'es',
    de: 'de',
    fr: 'fr',
    it: 'it',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StripeCheckoutFlowProps {
    clientSecret: string
    config: StoreConfig
    onSuccess: (paymentIntentId: string) => void
    onError: (message: string) => void
    totalFormatted: string
}

interface StripePaymentFormProps {
    onSuccess: (paymentIntentId: string) => void
    onError: (message: string) => void
    totalFormatted: string
    locale: string
    translations: {
        paymentSuccess: string
        orderConfirmed: string
        processingPayment: string
        payLabel: string
        securePaymentNote: string
        paymentError: string
        unexpectedError: string
    }
}

// ---------------------------------------------------------------------------
// Inner form (must be inside <Elements>)
// ---------------------------------------------------------------------------

function StripePaymentForm({
    onSuccess,
    onError,
    totalFormatted,
    locale,
    translations: t,
}: StripePaymentFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [isProcessing, setIsProcessing] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isComplete, setIsComplete] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!stripe || !elements) return

        setIsProcessing(true)
        setErrorMessage(null)

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/${locale}/checkout/confirmation`,
                },
                redirect: 'if_required',
            })

            if (error) {
                const msg = error.message ?? t.paymentError
                setErrorMessage(msg)
                onError(msg)
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                setIsComplete(true)
                onSuccess(paymentIntent.id)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : t.unexpectedError
            setErrorMessage(msg)
            onError(msg)
        } finally {
            setIsProcessing(false)
        }
    }

    if (isComplete) {
        return (
            <div className="text-center py-6 animate-fade-in">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-text-primary mb-1">{t.paymentSuccess}</h3>
                <p className="text-sm text-text-secondary">
                    {t.orderConfirmed}
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement
                options={{
                    layout: 'accordion',
                }}
            />

            {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || !elements || isProcessing}
                className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.processingPayment}
                    </>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5" />
                        {t.payLabel} {totalFormatted}
                    </>
                )}
            </button>

            <p className="text-xs text-text-muted text-center">
                {t.securePaymentNote}
            </p>
        </form>
    )
}

// ---------------------------------------------------------------------------
// Main component (wraps Elements provider)
// ---------------------------------------------------------------------------

export default function StripeCheckoutFlow({
    clientSecret,
    config,
    onSuccess,
    onError,
    totalFormatted,
}: StripeCheckoutFlowProps) {
    const { t, locale } = useI18n()
    const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getStripePromise().then((s) => {
            setStripeInstance(s)
            setLoading(false)
        })
    }, [])

    // Pre-compute translations for inner form (can't use useI18n inside Elements)
    const translations = {
        paymentSuccess: t('checkout.stripe.paymentSuccess'),
        orderConfirmed: t('checkout.stripe.orderConfirmed'),
        processingPayment: t('checkout.stripe.processing'),
        payLabel: t('checkout.stripe.payButton'),
        securePaymentNote: t('checkout.stripe.secureNote'),
        paymentError: t('checkout.stripe.paymentError'),
        unexpectedError: t('checkout.stripe.unexpectedError'),
    }

    // Build Stripe Appearance matching SOTA design system
    const appearance: Appearance = {
        theme: 'flat',
        variables: {
            colorPrimary: config.primary_color || '#2D5016',
            colorBackground: 'rgba(255, 255, 255, 0.05)',
            colorText: '#e0e0e0',
            colorTextSecondary: '#a0a0a0',
            colorDanger: '#ef4444',
            borderRadius: '12px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSizeBase: '14px',
            spacingUnit: '4px',
        },
        rules: {
            '.Input': {
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'none',
                transition: 'border-color 0.2s ease',
            },
            '.Input:focus': {
                border: `1px solid ${config.primary_color || '#2D5016'}`,
                boxShadow: `0 0 0 1px ${config.primary_color || '#2D5016'}33`,
            },
            '.Label': {
                color: '#a0a0a0',
                fontWeight: '500',
            },
            '.Tab': {
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            },
            '.Tab--selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${config.primary_color || '#2D5016'}`,
            },
        },
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                <span className="ml-2 text-sm text-text-muted">
                    {t('checkout.stripe.loadingForm')}
                </span>
            </div>
        )
    }

    if (!stripeInstance) {
        return (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-400">
                        {t('checkout.stripe.unavailableTitle')}
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">
                        {t('checkout.stripe.unavailableMsg')}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <Elements
            stripe={stripeInstance}
            options={{
                clientSecret,
                appearance,
                locale: STRIPE_LOCALE_MAP[locale] ?? 'auto',
            }}
        >
            <StripePaymentForm
                onSuccess={onSuccess}
                onError={onError}
                totalFormatted={totalFormatted}
                locale={locale}
                translations={translations}
            />
        </Elements>
    )
}
