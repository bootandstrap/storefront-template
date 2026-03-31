'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n/provider'
import { CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Stripe 3DS Confirmation Client — handles post-redirect state
// ---------------------------------------------------------------------------

interface ConfirmationClientProps {
    paymentIntent: string | null
    redirectStatus: string | null
}

export default function ConfirmationClient({
    paymentIntent,
    redirectStatus,
}: ConfirmationClientProps) {
    const { resetCart } = useCart()
    const { t, localizedHref } = useI18n()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

    useEffect(() => {
        async function processRedirect() {
            if (!paymentIntent) {
                setStatus('error')
                return
            }

            // Stripe redirect_status: 'succeeded' | 'processing' | 'requires_payment_method' | 'failed'
            if (redirectStatus === 'succeeded') {
                setStatus('success')
                resetCart()
            } else if (redirectStatus === 'failed' || redirectStatus === 'requires_payment_method') {
                setStatus('error')
            } else {
                // 'processing' or unknown — wait briefly then show success (webhook handles real confirmation)
                await new Promise((r) => setTimeout(r, 2000))
                setStatus('success')
                resetCart()
            }
        }
        processRedirect()
    }, [paymentIntent, redirectStatus, resetCart])

    return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
            <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 text-brand mx-auto mb-4 animate-spin" />
                        <h1 className="text-xl font-bold text-tx mb-2">
                            {t('checkout.confirmation.processing') || 'Procesando tu pago...'}
                        </h1>
                        <p className="text-sm text-tx-muted">
                            {t('checkout.confirmation.pleaseWait') || 'Por favor, espera un momento.'}
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-tx mb-2">
                            {t('checkout.confirmation.title') || '¡Pedido confirmado!'}
                        </h1>
                        <p className="text-sm text-tx-muted mb-6">
                            {t('checkout.confirmation.cardMsg') || 'Tu pago ha sido procesado correctamente. Recibirás un email de confirmación.'}
                        </p>
                        <Link
                            href={localizedHref('home')}
                            className="btn btn-primary px-8 py-2"
                        >
                            {t('checkout.confirmation.backHome') || 'Volver a la tienda'}
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-tx mb-2">
                            {t('checkout.confirmation.errorTitle') || 'Error en el pago'}
                        </h1>
                        <p className="text-sm text-tx-muted mb-6">
                            {t('checkout.confirmation.errorMsg') || 'Hubo un problema al procesar tu pago. Por favor, intenta de nuevo.'}
                        </p>
                        <Link
                            href={localizedHref('home')}
                            className="btn btn-primary px-8 py-2 inline-flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t('checkout.confirmation.retry') || 'Volver a intentar'}
                        </Link>
                    </>
                )}
            </div>
        </div>
    )
}
