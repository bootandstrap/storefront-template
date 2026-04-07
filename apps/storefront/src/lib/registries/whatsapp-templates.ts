/**
 * WhatsApp Template Registry — SSOT for message templates
 *
 * Centralizes template variables and presets used by MessagesClient.
 *
 * Zone: 🟢 SAFE — pure data, no side effects
 */

// ── Template Variables (click-to-insert) ──────────────────────────────

export interface TemplateVariable {
    key: string
    emoji: string
    label: string
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
    { key: 'store_name', emoji: '🏪', label: 'Tienda' },
    { key: 'customer_name', emoji: '👤', label: 'Cliente' },
    { key: 'customer_phone', emoji: '📱', label: 'Teléfono' },
    { key: 'total', emoji: '💰', label: 'Total' },
    { key: 'order_id', emoji: '🔢', label: 'Nº Pedido' },
    { key: 'items', emoji: '📦', label: 'Artículos' },
] as const

// ── Template Presets ──────────────────────────────────────────────────

export interface TemplatePreset {
    id: string
    emoji: string
    label: string
    body: string
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
    {
        id: 'order',
        emoji: '🛒',
        label: 'Nuevo Pedido',
        body: '🛒 *Nuevo Pedido — {{store_name}}*\n\nCliente: {{customer_name}}\nPedido: {{order_id}}\n\n{{items}}\n\n💰 *Total: {{total}}*\n\n¡Gracias por tu compra! 🎉',
    },
    {
        id: 'welcome',
        emoji: '👋',
        label: 'Bienvenida',
        body: '👋 ¡Hola {{customer_name}}!\n\nBienvenido/a a *{{store_name}}*.\n\nEstamos encantados de tenerte aquí. Si necesitas algo, no dudes en escribirnos.\n\n¡Un saludo! 😊',
    },
    {
        id: 'shipping',
        emoji: '🚚',
        label: 'Envío',
        body: '🚚 *Pedido Enviado — {{store_name}}*\n\n¡Hola {{customer_name}}!\n\nTu pedido {{order_id}} está en camino.\n\nTe avisaremos cuando llegue. 📦',
    },
    {
        id: 'custom',
        emoji: '✏️',
        label: 'Personalizada',
        body: '',
    },
]
