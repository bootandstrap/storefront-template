/**
 * Notification Message Templates
 *
 * Generates human-readable messages for each event type and channel.
 * WhatsApp/Telegram get emoji-rich text, Webhook gets structured JSON.
 *
 * All templates are self-contained — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationEvent =
    | "order.placed"
    | "order.canceled"
    | "order.return_requested"
    | "order.fulfillment_created"

export type NotificationChannel = "webhook" | "whatsapp" | "telegram" | "email"

interface OrderData {
    display_id?: number | string
    customer_email?: string
    customer_name?: string
    total?: number
    currency?: string
    item_count?: number
    reason?: string
    tracking_numbers?: string[]
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | undefined, code: string | undefined): string {
    if (amount == null) return "—"
    const val = amount / 100
    const sym = CURRENCY_SYMBOLS[code?.toLowerCase() ?? ""] ?? code?.toUpperCase() ?? ""
    return `${sym}${val.toFixed(2)}`
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    eur: "€", usd: "$", gbp: "£", chf: "CHF",
    mxn: "MX$", cop: "$", brl: "R$", ars: "$",
    clp: "$", pen: "S/", sek: "kr", nok: "kr",
    dkk: "kr", pln: "zł", czk: "Kč", huf: "Ft",
    ron: "lei", uyu: "$U", crc: "₡", dop: "RD$",
    gtq: "Q", bob: "Bs",
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format a notification message for the given event, data, and channel.
 *
 * Returns:
 * - string for WhatsApp/Telegram
 * - object for Webhook (full JSON payload)
 */
export function formatNotificationMessage(
    eventType: NotificationEvent,
    data: Record<string, unknown>,
    channel: NotificationChannel
): string | object {
    const d = data as unknown as OrderData

    if (channel === "webhook") {
        return {
            event: eventType,
            timestamp: new Date().toISOString(),
            data,
        }
    }

    // Text-based channels (WhatsApp, Telegram)
    switch (eventType) {
        case "order.placed":
            return formatOrderPlaced(d)
        case "order.canceled":
            return formatOrderCanceled(d)
        case "order.return_requested":
            return formatOrderReturn(d)
        case "order.fulfillment_created":
            return formatOrderShipped(d)
        default:
            return `📢 Evento: ${eventType}\n${JSON.stringify(data, null, 2)}`
    }
}

// ---------------------------------------------------------------------------
// Individual Formatters (shared for WhatsApp + Telegram)
// ---------------------------------------------------------------------------

function formatOrderPlaced(d: OrderData): string {
    const lines = [
        `🛒 <b>Nuevo pedido #${d.display_id ?? "—"}</b>`,
        ``,
        `👤 ${d.customer_name ?? d.customer_email ?? "Cliente"}`,
        `💰 ${formatCurrency(d.total, d.currency)}`,
        `📦 ${d.item_count ?? 0} artículo(s)`,
    ]
    if (d.customer_email) {
        lines.push(`📧 ${d.customer_email}`)
    }
    return lines.join("\n")
}

function formatOrderCanceled(d: OrderData): string {
    const lines = [
        `❌ <b>Pedido cancelado #${d.display_id ?? "—"}</b>`,
        ``,
        `👤 ${d.customer_name ?? d.customer_email ?? "Cliente"}`,
    ]
    if (d.total != null) {
        lines.push(`💰 ${formatCurrency(d.total, d.currency)}`)
    }
    if (d.reason) {
        lines.push(`📝 Razón: ${d.reason}`)
    }
    return lines.join("\n")
}

function formatOrderReturn(d: OrderData): string {
    const lines = [
        `🔄 <b>Devolución solicitada #${d.display_id ?? "—"}</b>`,
        ``,
        `👤 ${d.customer_name ?? d.customer_email ?? "Cliente"}`,
    ]
    if (d.item_count) {
        lines.push(`📦 ${d.item_count} artículo(s)`)
    }
    if (d.reason) {
        lines.push(`📝 Razón: ${d.reason}`)
    }
    return lines.join("\n")
}

function formatOrderShipped(d: OrderData): string {
    const lines = [
        `🚛 <b>Pedido enviado #${d.display_id ?? "—"}</b>`,
        ``,
        `👤 ${d.customer_name ?? d.customer_email ?? "Cliente"}`,
    ]
    if (d.tracking_numbers?.length) {
        lines.push(`📍 Tracking: ${d.tracking_numbers.join(", ")}`)
    }
    return lines.join("\n")
}
