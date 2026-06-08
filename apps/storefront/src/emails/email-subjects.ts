import type { EmailTemplate } from './types'

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

export function getDefaultSubject(template: EmailTemplate, locale: string = 'es'): string {
    return DEFAULT_SUBJECTS[template]?.[locale] || DEFAULT_SUBJECTS[template]?.en || ''
}
