import type { FeatureFlags } from '@/lib/config'
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
    label: string
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
        label: 'Pedir por WhatsApp',
        description: 'Envía tu pedido directo por WhatsApp',
        icon: MessageCircle,
        component: 'WhatsAppCheckoutFlow',
        priority: 1,
        variant: 'whatsapp',
    },
    {
        id: 'card',
        flag: 'enable_online_payments',
        label: 'Pagar con tarjeta',
        description: 'Visa, Mastercard, American Express',
        icon: CreditCard,
        component: 'StripeCheckoutFlow',
        priority: 2,
        variant: 'primary',
    },
    {
        id: 'cod',
        flag: 'enable_cash_on_delivery',
        label: 'Pago contra entrega',
        description: 'Paga en efectivo al recibir tu pedido',
        icon: Banknote,
        component: 'CashOnDeliveryFlow',
        priority: 3,
        variant: 'secondary',
    },
    {
        id: 'bank_transfer',
        flag: 'enable_bank_transfer',
        label: 'Transferencia bancaria',
        description: 'Transfiere a nuestra cuenta y adjunta comprobante',
        icon: Building2,
        component: 'BankTransferFlow',
        priority: 4,
        variant: 'secondary',
    },
]

/**
 * Returns only the payment methods whose feature flags are enabled.
 * Sorted by priority (ascending).
 */
export function getEnabledMethods(flags: FeatureFlags): PaymentMethod[] {
    return PAYMENT_METHODS
        .filter((m) => isFeatureEnabled(flags, m.flag))
        .sort((a, b) => a.priority - b.priority)
}
