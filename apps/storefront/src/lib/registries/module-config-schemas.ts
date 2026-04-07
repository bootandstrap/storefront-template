/**
 * Module Config Schema Registry — SSOT for all module configuration fields
 *
 * Every panel client that renders configuration fields MUST import from here.
 * NO local ConfigFieldDef[] arrays allowed in panel components.
 *
 * Options for `select` fields that reference other SSOT engines
 * (currencies, locales, payment methods) are dynamically derived.
 *
 * Zone: 🟢 SAFE — pure data, no side effects
 */

import { SUPPORTED_CURRENCIES } from '@/lib/i18n/currencies'
import { LOCALE_LABELS } from '@/lib/i18n'
import type { ConfigFieldDef } from '@/components/panel/ModuleConfigSection'

// ── Extended type for POS grouping ────────────────────────────────────
export interface ConfigFieldDefWithGroup extends ConfigFieldDef {
    /** Visual group for POS-style sectioned forms */
    group?: string
    /** Optional icon key (lucide) for the field */
    iconKey?: string
}

// ── Dynamic options derived from SSOT engines ─────────────────────────

const LANGUAGE_OPTIONS = Object.entries(LOCALE_LABELS).map(([code, info]) => ({
    value: code,
    label: `${info.flag} ${info.nativeName}`,
}))

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.flag} ${c.name} (${c.symbol})`,
}))

// ── Timezone registry ─────────────────────────────────────────────────
export const SUPPORTED_TIMEZONES = [
    { value: 'Europe/Madrid', label: '🇪🇸 Madrid (CET)' },
    { value: 'Europe/Zurich', label: '🇨🇭 Zurich (CET)' },
    { value: 'Europe/London', label: '🇬🇧 London (GMT)' },
    { value: 'Europe/Paris', label: '🇫🇷 Paris (CET)' },
    { value: 'Europe/Berlin', label: '🇩🇪 Berlin (CET)' },
    { value: 'Europe/Rome', label: '🇮🇹 Rome (CET)' },
    { value: 'America/New_York', label: '🇺🇸 New York (EST)' },
    { value: 'America/Chicago', label: '🇺🇸 Chicago (CST)' },
    { value: 'America/Los_Angeles', label: '🇺🇸 Los Angeles (PST)' },
    { value: 'America/Mexico_City', label: '🇲🇽 Ciudad de México (CST)' },
    { value: 'America/Bogota', label: '🇨🇴 Bogotá (COT)' },
    { value: 'America/Santiago', label: '🇨🇱 Santiago (CLT)' },
    { value: 'America/Buenos_Aires', label: '🇦🇷 Buenos Aires (ART)' },
    { value: 'America/Lima', label: '🇵🇪 Lima (PET)' },
    { value: 'America/Sao_Paulo', label: '🇧🇷 São Paulo (BRT)' },
] as const

// ── Master config schema registry ─────────────────────────────────────

export const MODULE_CONFIG_SCHEMAS: Record<string, ConfigFieldDef[]> = {
    // ── E-Commerce ────────────────────────────────────────────────────
    ecommerce: [
        { key: 'stock_mode', label: 'Modo de stock', type: 'select', options: [
            { value: 'enabled', label: 'Activado' },
            { value: 'disabled', label: 'Desactivado' },
            { value: 'display_only', label: 'Solo mostrar' },
        ]},
        { key: 'low_stock_threshold', label: 'Umbral de stock bajo', type: 'number', placeholder: '5' },
        { key: 'free_shipping_threshold', label: 'Envío gratis desde (€)', type: 'number', placeholder: '50' },
        { key: 'tax_display_mode', label: 'Mostrar impuestos', type: 'select', options: [
            { value: 'included', label: 'Incluidos en precio' },
            { value: 'excluded', label: 'Añadidos al final' },
        ]},
    ],

    // ── Sales Channels ────────────────────────────────────────────────
    sales_channels: [
        { key: 'whatsapp_number', label: 'WhatsApp', type: 'text', placeholder: '+34 600 000 000' },
        { key: 'default_country_prefix', label: 'Prefijo país', type: 'text', placeholder: '+34' },
        { key: 'bank_name', label: 'Banco', type: 'text', placeholder: 'Nombre del banco' },
        { key: 'bank_account_type', label: 'Tipo de cuenta', type: 'text', placeholder: 'Corriente / Ahorros' },
        { key: 'bank_account_number', label: 'Número de cuenta', type: 'text', placeholder: 'IBAN' },
        { key: 'bank_account_holder', label: 'Titular', type: 'text', placeholder: 'Nombre del titular' },
        { key: 'bank_id_number', label: 'NIF/CIF titular', type: 'text', placeholder: 'Documento de identidad' },
        { key: 'sales_whatsapp_greeting', label: 'Saludo WhatsApp', type: 'textarea', placeholder: '¡Hola! Bienvenido a nuestra tienda…' },
        { key: 'sales_preferred_contact', label: 'Contacto preferido', type: 'select', options: [
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'phone', label: 'Teléfono' },
            { value: 'email', label: 'Email' },
        ]},
        { key: 'sales_business_hours_display', label: 'Mostrar horario', type: 'select', options: [
            { value: 'not_shown', label: 'No mostrar' },
            { value: 'weekdays', label: 'Lunes a viernes' },
            { value: 'full_week', label: 'Semana completa' },
            { value: 'custom', label: 'Personalizado' },
        ]},
        { key: 'sales_highlight_free_shipping', label: 'Destacar envío gratis', type: 'toggle' },
    ],

    // ── SEO & Analytics ───────────────────────────────────────────────
    seo_analytics: [
        { key: 'meta_title', label: 'Meta Título', type: 'text', placeholder: 'Mi Tienda Online' },
        { key: 'meta_description', label: 'Meta Descripción', type: 'textarea', placeholder: 'Descripción para buscadores…' },
        { key: 'google_analytics_id', label: 'Google Analytics ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
        { key: 'facebook_pixel_id', label: 'Facebook Pixel ID', type: 'text', placeholder: '123456789' },
        { key: 'sentry_dsn', label: 'Sentry DSN', type: 'text', placeholder: 'https://xxx@sentry.io/xxx' },
    ],

    // ── Social Media ──────────────────────────────────────────────────
    social_media: [
        { key: 'social_facebook', label: 'Facebook', type: 'text', placeholder: 'https://facebook.com/…' },
        { key: 'social_instagram', label: 'Instagram', type: 'text', placeholder: 'https://instagram.com/…' },
        { key: 'social_tiktok', label: 'TikTok', type: 'text', placeholder: 'https://tiktok.com/@…' },
        { key: 'social_twitter', label: 'X / Twitter', type: 'text', placeholder: 'https://x.com/…' },
    ],

    // ── i18n & Currency ───────────────────────────────────────────────
    i18n_currency: [
        { key: 'language', label: 'Idioma principal', type: 'select', options: LANGUAGE_OPTIONS },
        { key: 'default_currency', label: 'Moneda principal', type: 'select', options: CURRENCY_OPTIONS },
        { key: 'timezone', label: 'Zona horaria', type: 'select', options: SUPPORTED_TIMEZONES.map(tz => ({ value: tz.value, label: tz.label })) },
    ],

    // ── Chatbot ────────────────────────────────────────────────────────
    chatbot: [
        { key: 'chatbot_name', label: 'Nombre del asistente', type: 'text', placeholder: 'Asistente IA' },
        { key: 'chatbot_tone', label: 'Tono de comunicación', type: 'select', options: [
            { value: 'formal', label: '👔 Formal' },
            { value: 'friendly', label: '🤗 Amigable' },
            { value: 'casual', label: '😎 Casual' },
        ]},
        { key: 'chatbot_welcome_message', label: 'Mensaje de bienvenida', type: 'textarea', placeholder: '¡Hola! ¿En qué puedo ayudarte?' },
        { key: 'chatbot_auto_open_delay', label: 'Apertura automática (segundos)', type: 'number', placeholder: '0 = desactivado' },
        { key: 'chatbot_knowledge_scope', label: 'Alcance de conocimiento', type: 'select', options: [
            { value: 'products_only', label: 'Solo productos' },
            { value: 'products_and_faq', label: 'Productos + FAQ' },
            { value: 'full_catalog', label: 'Catálogo completo' },
        ]},
    ],

    // ── POS ────────────────────────────────────────────────────────────
    pos: [
        { key: 'pos_receipt_header', label: 'Cabecera del ticket', type: 'textarea', placeholder: 'Nombre del negocio\nDirección…' },
        { key: 'pos_receipt_footer', label: 'Pie del ticket', type: 'textarea', placeholder: '¡Gracias por su compra!' },
        { key: 'pos_default_payment_method', label: 'Método de pago por defecto', type: 'select', options: [
            { value: 'cash', label: '💵 Efectivo' },
            { value: 'card', label: '💳 Tarjeta' },
            { value: 'transfer', label: '🏦 Transferencia' },
        ]},
        { key: 'pos_tax_display', label: 'Impuestos en ticket', type: 'select', options: [
            { value: 'tax_included', label: 'Incluidos en precio' },
            { value: 'tax_excluded', label: 'Desglosados' },
        ]},
        { key: 'pos_enable_tips', label: 'Permitir propinas', type: 'toggle' },
        { key: 'pos_tip_percentages', label: 'Porcentajes de propina', type: 'text', placeholder: '5,10,15' },
        { key: 'pos_sound_enabled', label: 'Sonidos de notificación', type: 'toggle' },
    ],

    // ── CRM ────────────────────────────────────────────────────────────
    crm: [
        { key: 'crm_auto_tag_customers', label: 'Auto-etiquetar clientes nuevos', type: 'toggle' },
        { key: 'crm_new_customer_tag', label: 'Etiqueta para nuevos clientes', type: 'text', placeholder: 'nuevo' },
        { key: 'crm_notify_new_contact', label: 'Notificar nuevos contactos', type: 'toggle' },
        { key: 'crm_export_format', label: 'Formato de exportación', type: 'select', options: [
            { value: 'csv', label: 'CSV' },
            { value: 'xlsx', label: 'Excel (XLSX)' },
            { value: 'json', label: 'JSON' },
        ]},
    ],

    // ── Email Marketing ───────────────────────────────────────────────
    email_marketing: [
        { key: 'email_sender_name', label: 'Nombre del remitente', type: 'text', placeholder: 'Mi Tienda' },
        { key: 'email_reply_to', label: 'Responder a', type: 'email', placeholder: 'contacto@mitienda.com' },
        { key: 'email_footer_text', label: 'Pie de email', type: 'textarea', placeholder: 'Gracias por ser nuestro cliente' },
        { key: 'email_abandoned_cart_delay', label: 'Retraso carrito abandonado', type: 'select', options: [
            { value: '1h', label: '1 hora' },
            { value: '3h', label: '3 horas' },
            { value: '24h', label: '24 horas' },
        ]},
    ],

    // ── Automation ────────────────────────────────────────────────────
    automation: [
        { key: 'webhook_notification_email', label: 'Email de notificación', type: 'email', placeholder: 'admin@mitienda.com' },
    ],

    // ── Capacity ──────────────────────────────────────────────────────
    capacidad: [
        { key: 'traffic_alert_email', label: 'Email de alertas', type: 'email', placeholder: 'admin@mitienda.com' },
        { key: 'capacity_warning_threshold_pct', label: 'Umbral aviso (%)', type: 'number', placeholder: '70' },
        { key: 'capacity_critical_threshold_pct', label: 'Umbral crítico (%)', type: 'number', placeholder: '90' },
        { key: 'capacity_auto_upgrade_interest', label: 'Interés en auto-ampliación', type: 'toggle' },
    ],
}

// ── POS Settings with group metadata ──────────────────────────────────
// Used by POSSettingsDrawer which needs grouping by section
export const POS_SETTINGS_SCHEMA: ConfigFieldDefWithGroup[] = [
    // Receipt
    { key: 'pos_receipt_header', label: 'Receipt Header', type: 'textarea', placeholder: 'Business Name\nAddress...', iconKey: 'Receipt', group: 'receipt' },
    { key: 'pos_receipt_footer', label: 'Receipt Footer', type: 'textarea', placeholder: 'Thank you for your purchase!', group: 'receipt' },
    // Payment
    { key: 'pos_default_payment_method', label: 'Default Payment', type: 'select', options: [
        { value: 'cash', label: '💵 Cash' },
        { value: 'card', label: '💳 Card' },
        { value: 'transfer', label: '🏦 Transfer' },
    ], group: 'payment' },
    { key: 'pos_tax_display', label: 'Tax Display', type: 'select', options: [
        { value: 'tax_included', label: 'Included in price' },
        { value: 'tax_excluded', label: 'Itemized separately' },
    ], group: 'payment' },
    // Experience
    { key: 'pos_enable_tips', label: 'Enable Tips', type: 'toggle', group: 'experience' },
    { key: 'pos_tip_percentages', label: 'Tip Percentages', type: 'text', placeholder: '5,10,15', group: 'experience' },
    { key: 'pos_sound_enabled', label: 'Sound Effects', type: 'toggle', iconKey: 'Volume2', group: 'experience' },
]

/**
 * Get config schema for a module key.
 * Returns empty array if module has no config fields.
 */
export function getModuleConfigSchema(moduleKey: string): ConfigFieldDef[] {
    return MODULE_CONFIG_SCHEMAS[moduleKey] ?? []
}
