import { Suspense } from 'react'

import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Pedido confirmado', robots: { index: false } }

import ConfirmationClient from './ConfirmationClient'
import { Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Stripe 3DS Confirmation Page — /[lang]/checkout/confirmation
// Receives payment_intent + redirect_status from Stripe redirect
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function CheckoutConfirmationPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const paymentIntent = typeof params.payment_intent === 'string' ? params.payment_intent : null
    const redirectStatus = typeof params.redirect_status === 'string' ? params.redirect_status : null

    return (
        <Suspense
            fallback={
                <div className="min-h-[50vh] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                </div>
            }
        >
            <ConfirmationClient
                paymentIntent={paymentIntent}
                redirectStatus={redirectStatus}
            />
        </Suspense>
    )
}
