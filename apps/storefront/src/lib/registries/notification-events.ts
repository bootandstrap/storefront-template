/**
 * Notification Events Registry — SSOT for notification system
 *
 * Centralizes:
 * - Supported notification events (order lifecycle)
 * - Channel metadata (webhook, whatsapp, telegram, email)
 * - Default configurations
 * - Server-side validation constants
 *
 * ALL consumers must import from here:
 * - AutomationsClient.tsx (UI rendering)
 * - automatizaciones/page.tsx (default props)
 * - panel/actions.ts (server-side validation)
 *
 * Zone: 🟢 SAFE — pure data, no side effects
 */

// ── Notification Events ───────────────────────────────────────────────

export interface NotificationEvent {
    key: string
    /** Lucide icon name */
    iconKey: string
    /** Fallback label (Spanish) */
    label: string
    /** CSS color class */
    color: string
}

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
    { key: 'order.placed', iconKey: 'Zap', label: 'Nuevo pedido', color: 'text-emerald-500' },
    { key: 'order.canceled', iconKey: 'XCircle', label: 'Pedido cancelado', color: 'text-red-500' },
    { key: 'order.return_requested', iconKey: 'RotateCcw', label: 'Devolución solicitada', color: 'text-amber-500' },
    { key: 'order.fulfillment_created', iconKey: 'Truck', label: 'Pedido enviado', color: 'text-blue-500' },
] as const

/** All valid event keys — for server-side validation */
export const NOTIFICATION_EVENT_KEYS = NOTIFICATION_EVENTS.map(e => e.key)

// ── Notification Channels ─────────────────────────────────────────────

export type ChannelKey = 'webhook' | 'whatsapp' | 'telegram' | 'email'

export interface ChannelMeta {
    /** Lucide icon name */
    iconKey: string
    label: string
    description: string
    /** CSS gradient class */
    color: string
}

export const NOTIFICATION_CHANNELS: Record<ChannelKey, ChannelMeta> = {
    webhook: { iconKey: 'Webhook', label: 'Webhook', description: 'Recibe notificaciones como JSON en cualquier URL', color: 'from-violet-500 to-purple-600' },
    whatsapp: { iconKey: 'MessageCircle', label: 'WhatsApp', description: 'Mensajes automáticos via WhatsApp Business API', color: 'from-green-500 to-emerald-600' },
    telegram: { iconKey: 'Send', label: 'Telegram', description: 'Mensajes instantáneos a tu chat o grupo', color: 'from-blue-400 to-cyan-500' },
    email: { iconKey: 'Mail', label: 'Email', description: 'Correos electrónicos al cliente y al propietario', color: 'from-orange-400 to-rose-500' },
} as const

/** All valid channel keys — for server-side validation */
export const NOTIFICATION_CHANNEL_KEYS: ChannelKey[] = ['webhook', 'whatsapp', 'telegram', 'email']

// ── Default Configurations ────────────────────────────────────────────

/** Default notification channels when none are configured */
export const DEFAULT_CHANNEL_CONFIG = {
    webhook: { enabled: false, url: '', secret: '' },
    whatsapp: { enabled: false, phone_number_id: '', token: '', recipient: '' },
    telegram: { enabled: false, bot_token: '', chat_id: '' },
    email: { enabled: true },
} as const

/** Default event → channel mapping — email only for all events */
export const DEFAULT_EVENT_MAPPING: Record<string, ChannelKey[]> = Object.fromEntries(
    NOTIFICATION_EVENT_KEYS.map(key => [key, ['email']])
)
