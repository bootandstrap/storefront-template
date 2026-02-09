import type { MedusaLineItem } from '@/lib/medusa/client'
import type { StoreConfig } from '@/lib/config'

export interface WhatsAppOrderData {
    items: MedusaLineItem[]
    customerName?: string
    customerPhone?: string
    deliveryAddress?: string
    notes?: string
    config: StoreConfig
}

/**
 * Build a WhatsApp order message from cart items
 */
export function buildWhatsAppMessage(data: WhatsAppOrderData): string {
    const { items, customerName, deliveryAddress, notes, config } = data

    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'COP'

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    const itemLines = items.map((item, i) => {
        const subtotal = item.unit_price * item.quantity
        return `${i + 1}. ${item.title} x${item.quantity} — ${formatPrice(subtotal)}`
    })

    const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

    const lines = [
        `🛒 *Nuevo pedido — ${config.business_name}*`,
        '',
        ...itemLines,
        '',
        `💰 *Total: ${formatPrice(total)}*`,
    ]

    if (customerName) {
        lines.push('', `👤 *Cliente:* ${customerName}`)
    }

    if (deliveryAddress) {
        lines.push(`📍 *Dirección:* ${deliveryAddress}`)
    }

    if (notes) {
        lines.push('', `📝 *Notas:* ${notes}`)
    }

    lines.push('', '---', `Pedido enviado desde ${config.business_name}`)

    return lines.join('\n')
}

/**
 * Build WhatsApp URL with pre-filled message
 */
export function buildWhatsAppURL(
    whatsappNumber: string,
    message: string
): string {
    const encoded = encodeURIComponent(message)
    return `https://wa.me/${whatsappNumber}?text=${encoded}`
}
