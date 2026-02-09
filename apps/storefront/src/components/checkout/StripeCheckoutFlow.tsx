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

// ---------------------------------------------------------------------------
// Inner form (must be inside <Elements>)
// ---------------------------------------------------------------------------

function StripePaymentForm({
    onSuccess,
    onError,
    totalFormatted,
}: Omit<StripeCheckoutFlowProps, 'clientSecret' | 'config'>) {
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
                    return_url: `${window.location.origin}/checkout/confirmation`,
                },
                redirect: 'if_required',
            })

            if (error) {
                const msg = error.message ?? 'Error al procesar el pago'
                setErrorMessage(msg)
                onError(msg)
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                setIsComplete(true)
                onSuccess(paymentIntent.id)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error inesperado'
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
                <h3 className="text-lg font-bold text-text-primary mb-1">¡Pago exitoso!</h3>
                <p className="text-sm text-text-secondary">
                    Tu pedido ha sido confirmado.
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
                        Procesando pago...
                    </>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5" />
                        Pagar {totalFormatted}
                    </>
                )}
            </button>

            <p className="text-xs text-text-muted text-center">
                Tu información de pago se procesa de forma segura a través de Stripe.
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
    const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getStripePromise().then((s) => {
            setStripeInstance(s)
            setLoading(false)
        })
    }, [])

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
                    Cargando formulario de pago...
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
                        Pago con tarjeta no disponible
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">
                        El sistema de pagos en línea no está configurado todavía.
                        Contacta al administrador.
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
                locale: 'es',
            }}
        >
            <StripePaymentForm
                onSuccess={onSuccess}
                onError={onError}
                totalFormatted={totalFormatted}
            />
        </Elements>
    )
}
