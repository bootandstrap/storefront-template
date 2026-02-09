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

// ---------------------------------------------------------------------------
// Template engine — processes {{variable}} and {{#each items}}...{{/each}}
// ---------------------------------------------------------------------------

export interface WhatsAppTemplateRow {
    id: string
    name: string
    template: string
    is_default: boolean
    variables: string[]
}

/**
 * Render a dynamic WhatsApp template with variable substitution.
 *
 * Supported syntax:
 * - {{variable}} — simple substitution
 * - {{#each items}}...{{/each}} — iteration over items array
 */
export function renderTemplate(
    templateStr: string,
    data: WhatsAppOrderData
): string {
    const { items, customerName, customerPhone, deliveryAddress, notes, config } = data

    const currency = items[0]?.variant?.prices?.[0]?.currency_code || 'COP'
    const formatPrice = (amount: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
        }).format(amount / 100)

    const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

    // Process {{#each items}}...{{/each}} block
    let result = templateStr.replace(
        /\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g,
        (_match, itemTemplate: string) => {
            return items
                .map((item, idx) => {
                    const subtotal = item.unit_price * item.quantity
                    return itemTemplate
                        .replace(/\{\{name\}\}/g, item.title || '')
                        .replace(/\{\{variant\}\}/g, item.variant?.title || '')
                        .replace(/\{\{qty\}\}/g, String(item.quantity))
                        .replace(/\{\{price\}\}/g, formatPrice(subtotal))
                        .replace(/\{\{unit_price\}\}/g, formatPrice(item.unit_price))
                        .replace(/\{\{index\}\}/g, String(idx + 1))
                })
                .join('')
                .trim()
        }
    )

    // Simple variable substitutions
    result = result
        .replace(/\{\{store_name\}\}/g, config.business_name || '')
        .replace(/\{\{total\}\}/g, formatPrice(total))
        .replace(/\{\{customer_name\}\}/g, customerName || '')
        .replace(/\{\{customer_phone\}\}/g, customerPhone || '')
        .replace(/\{\{delivery_address\}\}/g, deliveryAddress || '')
        .replace(/\{\{notes\}\}/g, notes || '')
        .replace(/\{\{item_count\}\}/g, String(items.length))
        .replace(/\{\{currency\}\}/g, currency.toUpperCase())

    return result.trim()
}

// ---------------------------------------------------------------------------
// Hardcoded fallback (used when no template is found in DB)
// ---------------------------------------------------------------------------

const FALLBACK_TEMPLATE = `🛒 *Nuevo pedido — {{store_name}}*

{{#each items}}
• {{name}} x{{qty}} — {{price}}
{{/each}}

💰 *Total: {{total}}*

👤 *Cliente:* {{customer_name}}
📍 *Dirección:* {{delivery_address}}
📝 *Notas:* {{notes}}

---
Pedido enviado desde {{store_name}}`

/**
 * Build a WhatsApp order message.
 *
 * Uses dynamic template from DB when provided, falls back to hardcoded template.
 */
export function buildWhatsAppMessage(
    data: WhatsAppOrderData,
    template?: WhatsAppTemplateRow | null
): string {
    const templateStr = template?.template || FALLBACK_TEMPLATE
    return renderTemplate(templateStr, data)
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
