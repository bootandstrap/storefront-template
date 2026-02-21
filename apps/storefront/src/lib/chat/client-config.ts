/**
 * Chat Configuration (Client-safe)
 * Tiered chatbot system — capabilities scale with user tier.
 */

export type ChatTier = 'visitor' | 'customer' | 'premium'

export interface ChatTierConfig {
    messageLimit: number | null // null = from plan_limits
    maxDocs: number
    quickActions: readonly string[]
    suggestedPrompts: number
    historyMode: 'session' | 'local' | 'cloud'
    badge: null | 'verified' | 'pro'
    accentClass: string
    windowSize: 'compact' | 'standard' | 'full'
}

export const CHAT_TIERS: Record<ChatTier, ChatTierConfig> = {
    visitor: {
        messageLimit: 5,
        maxDocs: 3,
        quickActions: ['faq', 'products'],
        suggestedPrompts: 3,
        historyMode: 'session',
        badge: null,
        accentClass: '',
        windowSize: 'compact',
    },
    customer: {
        messageLimit: 10,
        maxDocs: 10,
        quickActions: ['faq', 'products', 'my_orders', 'my_account'],
        suggestedPrompts: 5,
        historyMode: 'local',
        badge: 'verified',
        accentClass: 'chat-tier-customer',
        windowSize: 'standard',
    },
    premium: {
        messageLimit: null,
        maxDocs: 20,
        quickActions: ['faq', 'products', 'my_orders', 'my_account', 'support', 'shipping'],
        suggestedPrompts: 8,
        historyMode: 'cloud',
        badge: 'pro',
        accentClass: 'chat-tier-premium',
        windowSize: 'full',
    },
} as const

/** Quick action definitions — label + either a prompt to inject or a route to navigate */
export const QUICK_ACTION_DEFS: Record<string, {
    icon: string
    labels: Record<string, string>
    prompt?: Record<string, string>
    route?: string
}> = {
    faq: {
        icon: '❓',
        labels: {
            es: 'Preguntas frecuentes', en: 'FAQ',
            de: 'Häufige Fragen', fr: 'FAQ', it: 'FAQ'
        },
        prompt: {
            es: '¿Cuáles son las preguntas más frecuentes?',
            en: 'What are the most common questions?',
            de: 'Was sind die häufigsten Fragen?',
            fr: 'Quelles sont les questions les plus fréquentes ?',
            it: 'Quali sono le domande più frequenti?'
        }
    },
    products: {
        icon: '🛍️',
        labels: {
            es: 'Ver productos', en: 'Browse products',
            de: 'Produkte ansehen', fr: 'Voir les produits', it: 'Vedi prodotti'
        },
        route: '/productos'
    },
    my_orders: {
        icon: '📦',
        labels: {
            es: 'Mis pedidos', en: 'My orders',
            de: 'Meine Bestellungen', fr: 'Mes commandes', it: 'I miei ordini'
        },
        prompt: {
            es: '¿Cuál es el estado de mis pedidos?',
            en: 'What is the status of my orders?',
            de: 'Was ist der Status meiner Bestellungen?',
            fr: 'Quel est le statut de mes commandes ?',
            it: 'Qual è lo stato dei miei ordini?'
        }
    },
    my_account: {
        icon: '👤',
        labels: {
            es: 'Mi cuenta', en: 'My account',
            de: 'Mein Konto', fr: 'Mon compte', it: 'Il mio account'
        },
        route: '/cuenta'
    },
    support: {
        icon: '💬',
        labels: {
            es: 'Hablar con soporte', en: 'Talk to support',
            de: 'Support kontaktieren', fr: 'Contacter le support', it: 'Contatta il supporto'
        },
        prompt: {
            es: 'Necesito hablar con un agente de soporte humano.',
            en: 'I need to talk to a human support agent.',
            de: 'Ich muss mit einem menschlichen Support-Mitarbeiter sprechen.',
            fr: 'J\'ai besoin de parler à un agent de support humain.',
            it: 'Ho bisogno di parlare con un agente di supporto umano.'
        }
    },
    shipping: {
        icon: '🚚',
        labels: {
            es: 'Estado de envío', en: 'Shipping status',
            de: 'Versandstatus', fr: 'État de livraison', it: 'Stato della spedizione'
        },
        prompt: {
            es: '¿Cuándo llegará mi pedido?',
            en: 'When will my order arrive?',
            de: 'Wann kommt meine Bestellung an?',
            fr: 'Quand arrivera ma commande ?',
            it: 'Quando arriverà il mio ordine?'
        }
    },
}

/** localStorage key for tracking anonymous message count */
export const CHAT_ANONYMOUS_KEY = 'tenant_chat_count'

// ---------------------------------------------------------------------------
// Database tier config + merge utility
// ---------------------------------------------------------------------------

/** Shape of a row in the chat_tier_config Supabase table */
export interface ChatTierConfigDB {
    tier: ChatTier
    message_limit: number | null
    max_docs: number
    quick_actions: string[]
    suggested_prompts: number
    history_mode: 'session' | 'local' | 'cloud'
    window_size: 'compact' | 'standard' | 'full'
    is_enabled: boolean
}

/**
 * Merges DB-stored tier overrides on top of hardcoded defaults.
 * If no DB rows exist, returns default CHAT_TIERS unchanged.
 */
export function mergeTierConfig(
    dbRows: ChatTierConfigDB[] | null | undefined
): Record<ChatTier, ChatTierConfig & { is_enabled: boolean }> {
    const result = {} as Record<ChatTier, ChatTierConfig & { is_enabled: boolean }>

    for (const tier of ['visitor', 'customer', 'premium'] as ChatTier[]) {
        const defaults = CHAT_TIERS[tier]
        const override = dbRows?.find(r => r.tier === tier)

        result[tier] = {
            messageLimit: override?.message_limit ?? defaults.messageLimit,
            maxDocs: override?.max_docs ?? defaults.maxDocs,
            quickActions: override?.quick_actions?.length
                ? override.quick_actions
                : defaults.quickActions,
            suggestedPrompts: override?.suggested_prompts ?? defaults.suggestedPrompts,
            historyMode: override?.history_mode ?? defaults.historyMode,
            badge: defaults.badge,
            accentClass: defaults.accentClass,
            windowSize: override?.window_size ?? defaults.windowSize,
            is_enabled: override?.is_enabled ?? true,
        }
    }

    return result
}

/** i18n messages */
export const CHAT_MESSAGES = {
    loginRequired: {
        es: 'Has alcanzado el límite de mensajes gratuitos. Inicia sesión para continuar.',
        en: 'You have reached the free message limit. Please log in to continue.',
        de: 'Sie haben das Limit für kostenlose Nachrichten erreicht. Bitte melden Sie sich an.',
        fr: 'Vous avez atteint la limite de messages gratuits. Veuillez vous connecter.',
        it: 'Hai raggiunto il limite di messaggi gratuiti. Accedi per continuare.'
    },
    upgradeRequired: {
        es: 'Has alcanzado tu límite mensual. Mejora tu plan para más acceso.',
        en: 'You have reached your monthly limit. Upgrade your plan for more access.',
        de: 'Sie haben Ihr monatliches Limit erreicht. Upgraden Sie für mehr Zugang.',
        fr: 'Vous avez atteint votre limite mensuelle. Améliorez votre plan.',
        it: 'Hai raggiunto il limite mensile. Migliora il tuo piano per maggiore accesso.'
    },
}
