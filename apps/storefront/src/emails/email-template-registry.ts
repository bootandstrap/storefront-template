/**
 * Email Template Registry — SSOT for all BootandStrap email templates
 *
 * Each template is a React component that receives typed props.
 * The registry maps EmailTemplate → component + default subjects.
 *
 * To add a new template:
 *   1. Create the component in src/emails/
 *   2. Add it to this registry
 *   3. Add the template name to EmailTemplate type in email.ts
 *   4. Add governance entry in TEMPLATE_GOVERNANCE
 *
 * Zone: 🟡 EXTEND — add templates freely
 */

import type { ComponentType } from 'react'
import type { EmailTemplate, LayoutComponent } from './types'

// ---------------------------------------------------------------------------
// Lazy imports to avoid bundling all templates when only one is needed
// ---------------------------------------------------------------------------

const templateLoaders: Record<EmailTemplate, () => Promise<{ default: ComponentType<any> }>> = {
    order_confirmation: () => import('@/emails/OrderConfirmation'),
    order_shipped: () => import('@/emails/OrderShipped'),
    order_delivered: () => import('@/emails/OrderDelivered'),
    order_cancelled: () => import('@/emails/OrderCancelled'),
    payment_failed: () => import('@/emails/PaymentFailed'),
    refund_processed: () => import('@/emails/RefundProcessed'),
    low_stock_alert: () => import('@/emails/LowStockAlert'),
    welcome: () => import('@/emails/Welcome'),
    password_reset: () => import('@/emails/PasswordReset'),
    account_verification: () => import('@/emails/AccountVerification'),
    review_request: () => import('@/emails/ReviewRequest'),
    abandoned_cart: () => import('@/emails/AbandonedCart'),
    pos_receipt: () => import('@/emails/POSReceipt'),
}

// ---------------------------------------------------------------------------
// Layout loaders — lazy load to avoid bundling all layouts
// ---------------------------------------------------------------------------

const layoutLoaders: Record<string, () => Promise<{ default: LayoutComponent }>> = {
    minimal: () => import('@/emails/layouts/MinimalLayout'),
    brand: () => import('@/emails/layouts/BrandLayout'),
    modern: () => import('@/emails/layouts/ModernLayout'),
}

/**
 * Load a layout component by design slug.
 * Falls back to MinimalLayout if the slug is unknown.
 */
export async function loadEmailLayout(slug: string): Promise<LayoutComponent> {
    const loader = layoutLoaders[slug]
    if (!loader) {
        const fallback = await layoutLoaders.minimal()
        return fallback.default
    }
    const mod = await loader()
    return mod.default
}

// ---------------------------------------------------------------------------
// Default subjects per locale
// ---------------------------------------------------------------------------

export const DEFAULT_SUBJECTS: Record<EmailTemplate, Record<string, string>> = {
    order_confirmation: {
        es: '🎉 ¡Pedido confirmado!',
        en: '🎉 Order Confirmed!',
        de: '🎉 Bestellung bestätigt!',
        fr: '🎉 Commande confirmée !',
        it: '🎉 Ordine confermato!',
    },
    order_shipped: {
        es: '📦 ¡Tu pedido ha sido enviado!',
        en: '📦 Your Order Has Shipped!',
        de: '📦 Ihre Bestellung wurde versandt!',
        fr: '📦 Votre commande a été expédiée !',
        it: '📦 Il tuo ordine è stato spedito!',
    },
    order_delivered: {
        es: '✅ ¡Pedido entregado!',
        en: '✅ Order Delivered!',
        de: '✅ Bestellung zugestellt!',
        fr: '✅ Commande livrée !',
        it: '✅ Ordine consegnato!',
    },
    order_cancelled: {
        es: '❌ Pedido cancelado',
        en: '❌ Order Cancelled',
        de: '❌ Bestellung storniert',
        fr: '❌ Commande annulée',
        it: '❌ Ordine annullato',
    },
    payment_failed: {
        es: '⚠️ Pago no procesado',
        en: '⚠️ Payment Not Processed',
        de: '⚠️ Zahlung nicht verarbeitet',
        fr: '⚠️ Paiement non traité',
        it: '⚠️ Pagamento non elaborato',
    },
    refund_processed: {
        es: '💰 Reembolso procesado',
        en: '💰 Refund Processed',
        de: '💰 Erstattung verarbeitet',
        fr: '💰 Remboursement traité',
        it: '💰 Rimborso elaborato',
    },
    low_stock_alert: {
        es: '📉 Alerta de stock bajo',
        en: '📉 Low Stock Alert',
        de: '📉 Niedriger Bestand',
        fr: '📉 Alerte stock bas',
        it: '📉 Allarme scorte basse',
    },
    welcome: {
        es: '👋 ¡Bienvenido/a!',
        en: '👋 Welcome!',
        de: '👋 Willkommen!',
        fr: '👋 Bienvenue !',
        it: '👋 Benvenuto/a!',
    },
    password_reset: {
        es: '🔑 Restablecer contraseña',
        en: '🔑 Password Reset',
        de: '🔑 Passwort zurücksetzen',
        fr: '🔑 Réinitialisation du mot de passe',
        it: '🔑 Reimposta password',
    },
    account_verification: {
        es: '✉️ Verifica tu email',
        en: '✉️ Verify Your Email',
        de: '✉️ E-Mail bestätigen',
        fr: '✉️ Vérifiez votre email',
        it: '✉️ Verifica la tua email',
    },
    review_request: {
        es: '⭐ ¿Qué tal tu pedido?',
        en: '⭐ How Was Your Order?',
        de: '⭐ Wie war Ihre Bestellung?',
        fr: '⭐ Comment était votre commande ?',
        it: '⭐ Come è stato il tuo ordine?',
    },
    abandoned_cart: {
        es: '🛒 ¡Te dejaste algo!',
        en: '🛒 You Left Something Behind!',
        de: '🛒 Sie haben etwas vergessen!',
        fr: '🛒 Vous avez oublié quelque chose !',
        it: '🛒 Hai dimenticato qualcosa!',
    },
    pos_receipt: {
        es: '🧾 Recibo de compra',
        en: '🧾 Purchase Receipt',
        de: '🧾 Kaufbeleg',
        fr: '🧾 Reçu d\'achat',
        it: '🧾 Ricevuta d\'acquisto',
    },
}

// ---------------------------------------------------------------------------
// Design registry
// ---------------------------------------------------------------------------

/**
 * Email module tier prices — SSOT: governance contract
 * modules.catalog[email_marketing].tiers[].price_chf
 * Update these if contract prices change.
 */
const EMAIL_TIER_PRICES = {
    basic: 15,
    pro: 30,
} as const

function formatTierPrice(tier: keyof typeof EMAIL_TIER_PRICES): string {
    return `${EMAIL_TIER_PRICES[tier]} CHF/mo`
}

export interface EmailDesign {
    slug: string
    name: string
    description_es: string
    /** Tier required: null = free, 'basic', 'pro' */
    requiredTier: string | null
    /** Price label for upsell UI */
    price_label?: string
}

export const EMAIL_DESIGNS: EmailDesign[] = [
    {
        slug: 'minimal',
        name: 'Minimal',
        description_es: 'Limpio y profesional. Perfecto para cualquier tienda.',
        requiredTier: null,
    },
    {
        slug: 'brand',
        name: 'Brand Premium',
        description_es: 'Con logo, colores de marca y footer personalizado.',
        requiredTier: 'basic',
        price_label: formatTierPrice('basic'),
    },
    {
        slug: 'modern',
        name: 'Modern Pro',
        description_es: 'Diseño premium oscuro con gradientes, sombras sofisticadas y tipografía moderna.',
        requiredTier: 'pro',
        price_label: formatTierPrice('pro'),
    },
]

export function getDesignBySlug(slug: string): EmailDesign {
    return EMAIL_DESIGNS.find(d => d.slug === slug) || EMAIL_DESIGNS[0]
}

// ---------------------------------------------------------------------------
// Template loader
// ---------------------------------------------------------------------------

/**
 * Load a template component by name.
 * Returns the React component that accepts email-specific props.
 */
export async function loadEmailTemplate(
    template: EmailTemplate,
): Promise<ComponentType<any>> {
    const loader = templateLoaders[template]
    if (!loader) {
        throw new Error(`Unknown email template: ${template}`)
    }
    const mod = await loader()
    return mod.default
}

/**
 * Get default subject for a template + locale.
 */
export function getDefaultSubject(template: EmailTemplate, locale: string = 'es'): string {
    return DEFAULT_SUBJECTS[template]?.[locale] || DEFAULT_SUBJECTS[template]?.en || ''
}
