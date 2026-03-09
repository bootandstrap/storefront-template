import type { FeatureFlags, PlanLimits } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import {
    MessageCircle,
    CreditCard,
    Banknote,
    Building2,
    type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Payment Method Registry
// ---------------------------------------------------------------------------

export interface PaymentMethod {
    id: string
    flag: keyof FeatureFlags
    /** i18n dictionary key for the label (e.g., 'checkout.method_whatsapp') */
    labelKey: string
    /** i18n dictionary key for the description */
    descriptionKey: string
    /** Fallback label (English) when dictionary is not available */
    label: string
    /** Fallback description (English) */
    description: string
    icon: LucideIcon
    /** Component path for dynamic import */
    component: string
    /** Lower = higher priority (shown first) */
    priority: number
    /** Visual style variant */
    variant: 'whatsapp' | 'primary' | 'secondary' | 'ghost'
}

const PAYMENT_METHODS: PaymentMethod[] = [
    {
        id: 'whatsapp',
        flag: 'enable_whatsapp_checkout',
        labelKey: 'checkout.method_whatsapp',
        descriptionKey: 'checkout.method_whatsapp_desc',
        label: 'Order via WhatsApp',
        description: 'Send your order directly via WhatsApp',
        icon: MessageCircle,
        component: 'WhatsAppCheckoutFlow',
        priority: 1,
        variant: 'whatsapp',
    },
    {
        id: 'card',
        flag: 'enable_online_payments',
        labelKey: 'checkout.method_card',
        descriptionKey: 'checkout.method_card_desc',
        label: 'Pay by card',
        description: 'Visa, Mastercard, American Express',
        icon: CreditCard,
        component: 'StripeCheckoutFlow',
        priority: 2,
        variant: 'primary',
    },
    {
        id: 'cod',
        flag: 'enable_cash_on_delivery',
        labelKey: 'checkout.method_cod',
        descriptionKey: 'checkout.method_cod_desc',
        label: 'Cash on delivery',
        description: 'Pay in cash when you receive your order',
        icon: Banknote,
        component: 'CashOnDeliveryFlow',
        priority: 3,
        variant: 'secondary',
    },
    {
        id: 'bank_transfer',
        flag: 'enable_bank_transfer',
        labelKey: 'checkout.method_bank_transfer',
        descriptionKey: 'checkout.method_bank_transfer_desc',
        label: 'Bank transfer',
        description: 'Transfer to our account and attach receipt',
        icon: Building2,
        component: 'BankTransferFlow',
        priority: 4,
        variant: 'secondary',
    },
]

/**
 * Returns only the payment methods whose feature flags are enabled.
 * Sorted by priority (ascending). Enforces `max_payment_methods` plan limit.
 */
export function getEnabledMethods(
    flags: FeatureFlags,
    limits?: PlanLimits | null,
): PaymentMethod[] {
    const enabled = PAYMENT_METHODS
        .filter((m) => isFeatureEnabled(flags, m.flag))
        .sort((a, b) => a.priority - b.priority)

    // Enforce max_payment_methods plan limit (0 = unlimited)
    const max = limits?.max_payment_methods ?? 0
    if (max > 0 && enabled.length > max) {
        return enabled.slice(0, max)
    }

    return enabled
}
