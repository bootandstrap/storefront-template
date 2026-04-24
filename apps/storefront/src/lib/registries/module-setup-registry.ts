import 'server-only'
/**
 * Module Setup Registry — SSOT for per-module onboarding experiences
 *
 * Each module defines what to show in the ModuleSetupCard:
 * - Usage metrics (progress bars with real data)
 * - Feature highlights (what the purchased tier unlocks)
 * - Config fields (from MODULE_CONFIG_SCHEMAS)
 * - Quick actions (recommended first steps)
 *
 * Zone: 🟢 SAFE — pure data, no side effects
 * @module registries/module-setup-registry
 */

import { MODULE_CONFIG_SCHEMAS } from './module-config-schemas'
import type { ConfigFieldDef } from '@/components/panel/ModuleConfigSection'

// ── Types ─────────────────────────────────────────────────────────────

export interface ModuleUsageMetric {
    /** Plan limit key (e.g. 'max_products') */
    limitKey: string
    /** Human-readable label */
    label: string
    /** Icon (lucide name) */
    icon: string
    /** Unit suffix (e.g. 'MB', '/mes') */
    unit?: string
}

export interface ModuleQuickAction {
    /** Label */
    label: string
    /** Panel route (relative) */
    href: string
    /** Lucide icon name */
    icon: string
    /** If true, auto-mark as done when usage > 0 */
    autoDone?: boolean
    /** Metric key to check for auto-done */
    doneWhen?: string
}

export interface ModuleSetupDef {
    /** Module key (matches governance contract) */
    moduleKey: string
    /** i18n key for description */
    description: string
    /** Description in Spanish (fallback) */
    description_es: string
    /** Config fields to show from MODULE_CONFIG_SCHEMAS */
    configFields: ConfigFieldDef[]
    /** Usage metrics to display as progress bars */
    usageMetrics: ModuleUsageMetric[]
    /** Quick actions — recommended first steps */
    quickActions: ModuleQuickAction[]
    /** If true, the module has meaningful config (should show setup card) */
    hasSetup: boolean
}

// ── Registry ──────────────────────────────────────────────────────────

export const MODULE_SETUP_REGISTRY: Record<string, ModuleSetupDef> = {
    ecommerce: {
        moduleKey: 'ecommerce',
        description: 'Configure your online store, inventory, and checkout.',
        description_es: 'Configura tu tienda online, inventario y checkout.',
        configFields: MODULE_CONFIG_SCHEMAS.ecommerce || [],
        usageMetrics: [
            { limitKey: 'max_products', label: 'Productos', icon: 'Package' },
            { limitKey: 'max_categories', label: 'Categorías', icon: 'FolderTree' },
            { limitKey: 'max_orders_month', label: 'Pedidos/mes', icon: 'ShoppingCart', unit: '/mes' },
            { limitKey: 'storage_limit_mb', label: 'Almacenamiento', icon: 'HardDrive', unit: 'MB' },
        ],
        quickActions: [
            { label: 'Añadir primer producto', href: '/panel/mi-tienda?tab=productos', icon: 'Package', autoDone: true, doneWhen: 'max_products' },
            { label: 'Crear categoría', href: '/panel/mi-tienda?tab=categorias', icon: 'FolderTree', autoDone: true, doneWhen: 'max_categories' },
            { label: 'Configurar envío', href: '/panel/ajustes?tab=envios', icon: 'Truck' },
        ],
        hasSetup: true,
    },

    sales_channels: {
        moduleKey: 'sales_channels',
        description: 'Configure payment methods, WhatsApp, and sales channels.',
        description_es: 'Configura métodos de pago, WhatsApp y canales de venta.',
        configFields: MODULE_CONFIG_SCHEMAS.sales_channels || [],
        usageMetrics: [
            { limitKey: 'max_payment_methods', label: 'Métodos de pago', icon: 'CreditCard' },
        ],
        quickActions: [
            { label: 'Configurar WhatsApp', href: '/panel/mensajes', icon: 'MessageCircle' },
            { label: 'Activar métodos de pago', href: '/panel/ajustes?tab=tienda', icon: 'CreditCard' },
        ],
        hasSetup: true,
    },

    chatbot: {
        moduleKey: 'chatbot',
        description: 'Set up your AI assistant for 24/7 customer support.',
        description_es: 'Configura tu asistente IA para atención al cliente 24/7.',
        configFields: MODULE_CONFIG_SCHEMAS.chatbot || [],
        usageMetrics: [
            { limitKey: 'max_chatbot_messages_month', label: 'Mensajes/mes', icon: 'MessageSquare', unit: '/mes' },
        ],
        quickActions: [
            { label: 'Personalizar asistente', href: '/panel/chatbot', icon: 'Bot' },
            { label: 'Probar chatbot', href: '/', icon: 'ExternalLink' },
        ],
        hasSetup: true,
    },

    pos: {
        moduleKey: 'pos',
        description: 'Configure your point of sale terminal.',
        description_es: 'Configura tu terminal de punto de venta.',
        configFields: MODULE_CONFIG_SCHEMAS.pos || [],
        usageMetrics: [
            { limitKey: 'max_pos_payment_methods', label: 'Métodos POS', icon: 'CreditCard' },
        ],
        quickActions: [
            { label: 'Abrir POS', href: '/panel/pos', icon: 'Monitor' },
            { label: 'Configurar recibos', href: '/panel/pos', icon: 'Receipt' },
        ],
        hasSetup: true,
    },

    pos_kiosk: {
        moduleKey: 'pos_kiosk',
        description: 'Set up self-service kiosk for customers.',
        description_es: 'Configura el kiosco de autoservicio para clientes.',
        configFields: MODULE_CONFIG_SCHEMAS.pos_kiosk || [],
        usageMetrics: [],
        quickActions: [
            { label: 'Probar modo kiosco', href: '/pos', icon: 'Monitor' },
        ],
        hasSetup: true,
    },

    crm: {
        moduleKey: 'crm',
        description: 'Manage customer relationships and contacts.',
        description_es: 'Gestiona relaciones con clientes y contactos.',
        configFields: MODULE_CONFIG_SCHEMAS.crm || [],
        usageMetrics: [
            { limitKey: 'max_crm_contacts', label: 'Contactos', icon: 'Users' },
        ],
        quickActions: [
            { label: 'Ver contactos', href: '/panel/crm', icon: 'Users' },
        ],
        hasSetup: true,
    },

    email_marketing: {
        moduleKey: 'email_marketing',
        description: 'Send emails, newsletters, and automated campaigns.',
        description_es: 'Envía emails, newsletters y campañas automatizadas.',
        configFields: MODULE_CONFIG_SCHEMAS.email_marketing || [],
        usageMetrics: [
            { limitKey: 'max_email_sends_month', label: 'Envíos/mes', icon: 'Mail', unit: '/mes' },
            { limitKey: 'max_newsletter_subscribers', label: 'Suscriptores', icon: 'Users' },
        ],
        quickActions: [
            { label: 'Configurar email', href: '/panel/ajustes?tab=email', icon: 'Mail' },
        ],
        hasSetup: true,
    },

    i18n: {
        moduleKey: 'i18n',
        description: 'Add multiple languages and currencies to your store.',
        description_es: 'Añade múltiples idiomas y monedas a tu tienda.',
        configFields: MODULE_CONFIG_SCHEMAS.i18n || [],
        usageMetrics: [
            { limitKey: 'max_languages', label: 'Idiomas', icon: 'Globe' },
            { limitKey: 'max_currencies', label: 'Monedas', icon: 'Coins' },
        ],
        quickActions: [
            { label: 'Configurar idiomas', href: '/panel/ajustes?tab=idiomas', icon: 'Globe' },
        ],
        hasSetup: true,
    },

    seo: {
        moduleKey: 'seo',
        description: 'Optimize your store for search engines.',
        description_es: 'Optimiza tu tienda para motores de búsqueda.',
        configFields: MODULE_CONFIG_SCHEMAS.seo || [],
        usageMetrics: [],
        quickActions: [
            { label: 'Configurar SEO', href: '/panel/seo', icon: 'Search' },
            { label: 'Ver analíticas', href: '/panel/ajustes?tab=analiticas', icon: 'BarChart3' },
        ],
        hasSetup: true,
    },

    rrss: {
        moduleKey: 'rrss',
        description: 'Connect social media accounts and enable sharing.',
        description_es: 'Conecta redes sociales y habilita compartir.',
        configFields: MODULE_CONFIG_SCHEMAS.rrss || [],
        usageMetrics: [],
        quickActions: [
            { label: 'Conectar redes', href: '/panel/redes-sociales', icon: 'Share2' },
        ],
        hasSetup: true,
    },

    automation: {
        moduleKey: 'automation',
        description: 'Create automated workflows, webhooks, and external connections.',
        description_es: 'Crea flujos automáticos, webhooks y conexiones externas.',
        configFields: MODULE_CONFIG_SCHEMAS.automation || [],
        usageMetrics: [
            { limitKey: 'max_automations', label: 'Automatizaciones', icon: 'Zap' },
        ],
        quickActions: [
            { label: 'Crear automatización', href: '/panel/automatizaciones', icon: 'Zap' },
        ],
        hasSetup: true,
    },

    auth_advanced: {
        moduleKey: 'auth_advanced',
        description: 'Enable Google OAuth, Magic Links, and 2FA.',
        description_es: 'Habilita Google OAuth, Magic Links y 2FA.',
        configFields: [],
        usageMetrics: [
            { limitKey: 'max_admin_users', label: 'Usuarios admin', icon: 'Shield' },
        ],
        quickActions: [
            { label: 'Configurar auth', href: '/panel/auth', icon: 'Shield' },
        ],
        hasSetup: false, // Config is mostly flag-based, no fields
    },

    capacidad: {
        moduleKey: 'capacidad',
        description: 'Manage storage, traffic, and backup capacity.',
        description_es: 'Gestiona almacenamiento, tráfico y capacidad de backups.',
        configFields: MODULE_CONFIG_SCHEMAS.capacidad || [],
        usageMetrics: [
            { limitKey: 'storage_limit_mb', label: 'Almacenamiento', icon: 'HardDrive', unit: 'MB' },
            { limitKey: 'max_requests_day', label: 'Peticiones/día', icon: 'Activity', unit: '/día' },
            { limitKey: 'max_backups', label: 'Backups', icon: 'Archive' },
        ],
        quickActions: [
            { label: 'Ver capacidad', href: '/panel/capacidad', icon: 'BarChart3' },
        ],
        hasSetup: true,
    },
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Get setup definition for a specific module.
 */
export function getModuleSetup(moduleKey: string): ModuleSetupDef | undefined {
    return MODULE_SETUP_REGISTRY[moduleKey]
}

/**
 * Get all module setup definitions that have meaningful config.
 */
export function getConfigurableModules(): ModuleSetupDef[] {
    return Object.values(MODULE_SETUP_REGISTRY).filter(m => m.hasSetup)
}

/**
 * Get module setup definitions for a set of active module keys.
 * Used by the orchestrator to show only the modules the tenant has purchased.
 */
export function getActiveModuleSetups(activeModuleKeys: string[]): ModuleSetupDef[] {
    return activeModuleKeys
        .map(key => MODULE_SETUP_REGISTRY[key])
        .filter((m): m is ModuleSetupDef => m != null && m.hasSetup)
}
