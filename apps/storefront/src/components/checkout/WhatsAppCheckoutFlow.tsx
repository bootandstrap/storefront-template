'use client'

import { MessageCircle, ArrowRight } from 'lucide-react'
import type { StoreConfig } from '@/lib/config'
import type { MedusaLineItem } from '@/lib/medusa/client'

// ---------------------------------------------------------------------------
// WhatsApp helpers (copied from original CheckoutModal)
// ---------------------------------------------------------------------------

function buildWhatsAppMessage({
    items,
    customerName,
    deliveryAddress,
    notes,
    config,
}: {
    items: MedusaLineItem[]
    customerName?: string
    deliveryAddress?: string
    notes?: string
    config: StoreConfig
}): string {
    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'COP'
    const formatPrice = (amount: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    let msg = `🛒 *Nuevo pedido — ${config.business_name}*\n\n`

    if (customerName) msg += `👤 *Cliente:* ${customerName}\n`
    if (deliveryAddress) msg += `📍 *Dirección:* ${deliveryAddress}\n`
    msg += '\n'

    items.forEach((item, i) => {
        msg += `${i + 1}. ${item.title}`
        if (item.variant) msg += ` (${item.variant.title})`
        msg += ` × ${item.quantity} — ${formatPrice(item.unit_price * item.quantity)}\n`
    })

    const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    msg += `\n💰 *Total:* ${formatPrice(total)}`

    if (notes) msg += `\n\n📝 *Notas:* ${notes}`

    return msg
}

function buildWhatsAppURL(phone: string, message: string): string {
    const cleaned = phone.replace(/\D/g, '')
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WhatsAppCheckoutFlowProps {
    config: StoreConfig
    items: MedusaLineItem[]
    customerName?: string
    deliveryAddress?: string
    notes?: string
    onComplete: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhatsAppCheckoutFlow({
    config,
    items,
    customerName,
    deliveryAddress,
    notes,
    onComplete,
}: WhatsAppCheckoutFlowProps) {
    function handleSend() {
        const message = buildWhatsAppMessage({
            items,
            customerName,
            deliveryAddress,
            notes,
            config,
        })
        const url = buildWhatsAppURL(config.whatsapp_number, message)
        window.open(url, '_blank')
        onComplete()
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-2">
                <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-text-primary">
                    Pedido por WhatsApp
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                    Se abrirá WhatsApp con tu pedido listo para enviar.
                    El pago se coordina directamente.
                </p>
            </div>

            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-300">
                    📱 Revisa el mensaje antes de enviarlo. Puedes modificarlo en WhatsApp.
                </p>
            </div>

            <button
                onClick={handleSend}
                className="btn btn-whatsapp w-full py-3 text-base"
                type="button"
            >
                <MessageCircle className="w-5 h-5" />
                Enviar pedido por WhatsApp
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    )
}
