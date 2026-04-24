'use client'

/**
 * POSPaymentStep — Payment method selection screen (Step 2 of checkout)
 *
 * Extracted from POSCart.tsx. Features:
 * - Large 72px payment pills in 2-column grid
 * - Per-method contextual hint cards (cash, card, twint, manual)
 * - Premium gradient confirm button with per-method label
 * - Back navigation header
 *
 * @module pos/cart/POSPaymentStep
 */

import {
    ArrowLeft, Banknote, CreditCard, Smartphone, Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PaymentMethod } from '@/lib/pos/pos-config'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { POS_PAYMENT_CONFIG, posLabel } from '@/lib/pos/pos-i18n'

interface POSPaymentStepProps {
    paymentMethod: PaymentMethod
    total: number
    processing: boolean
    enabledPaymentMethods: PaymentMethod[]
    onSetPayment: (method: PaymentMethod) => void
    onConfirm: () => void
    onBack: () => void
    labels: Record<string, string>
    defaultCurrency: string
    itemCount: number
}

export default function POSPaymentStep({
    paymentMethod,
    total,
    processing,
    enabledPaymentMethods,
    onSetPayment,
    onConfirm,
    onBack,
    labels,
    defaultCurrency,
    itemCount,
}: POSPaymentStepProps) {
    const formatCurrency = (amount: number) => formatPOSCurrency(amount, defaultCurrency)

    const paymentPills = enabledPaymentMethods
        .map(key => POS_PAYMENT_CONFIG.find(pc => pc.key === key))
        .filter(Boolean) as typeof POS_PAYMENT_CONFIG

    return (
        <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col flex-1 min-h-0"
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-sf-2 pos-footer-glass flex-shrink-0">
                <button
                    onClick={onBack}
                    className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-sf-1 text-tx-sec
                               flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-tx flex-1">
                    {posLabel('panel.pos.selectPayment', labels)}
                </span>
                <span className="text-lg font-black tabular-nums text-tx">
                    {formatCurrency(total)}
                </span>
            </div>

            {/* Payment methods */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    {paymentPills.map(pm => {
                        const Icon = pm.icon
                        const isActive = paymentMethod === pm.key
                        return (
                            <button
                                key={pm.key}
                                onClick={() => onSetPayment(pm.key)}
                                className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl text-xs font-semibold
                                            transition-all duration-200 min-h-[72px] ${
                                    isActive
                                        ? pm.activeClass
                                        : 'bg-sf-1 text-tx-sec hover:bg-sf-2 border border-transparent'
                                }`}
                            >
                                <Icon className="w-6 h-6" />
                                <span>{posLabel(pm.labelKey, labels)}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Per-method instruction cards */}
                <AnimatePresence mode="wait">
                    {paymentMethod === 'cash' && (
                        <PaymentHint
                            key="cash-hint"
                            icon={<Banknote className="w-5 h-5 text-amber-600" />}
                            iconBg="bg-amber-100"
                            containerClass="bg-amber-50/60 border-amber-200/40"
                            title={posLabel('panel.pos.cashPaymentTitle', labels) || 'Pago en efectivo'}
                            hint={posLabel('panel.pos.cashPaymentHint', labels) || 'Pulse Confirmar para entrar el importe recibido'}
                            titleColor="text-amber-800"
                            hintColor="text-amber-600/80"
                        />
                    )}
                    {paymentMethod === 'card_terminal' && (
                        <PaymentHint
                            key="card-hint"
                            icon={<CreditCard className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-100"
                            containerClass="bg-blue-50/60 border-blue-200/40"
                            title={posLabel('panel.pos.cardTerminalTitle', labels) || 'Terminal de tarjeta'}
                            hint={posLabel('panel.pos.cardTerminalHint', labels) || 'Presente la tarjeta o dispositivo en el terminal'}
                            titleColor="text-blue-800"
                            hintColor="text-blue-600/80"
                        />
                    )}
                    {paymentMethod === 'twint' && (
                        <PaymentHint
                            key="twint-hint"
                            icon={<Smartphone className="w-5 h-5 text-violet-600" />}
                            iconBg="bg-violet-100"
                            containerClass="bg-violet-50/60 border-violet-200/40"
                            title={posLabel('panel.pos.twintTitle', labels) || 'Pago con Twint'}
                            hint={posLabel('panel.pos.twintHint', labels) || 'Se mostrará un código QR para el cliente'}
                            titleColor="text-violet-800"
                            hintColor="text-violet-600/80"
                        />
                    )}
                    {paymentMethod === 'manual_card' && (
                        <PaymentHint
                            key="manual-hint"
                            icon={<CreditCard className="w-5 h-5 text-slate-600" />}
                            iconBg="bg-slate-100"
                            containerClass="bg-slate-50/60 border-slate-200/40"
                            title={posLabel('panel.pos.manualCardTitle', labels) || 'Registro manual'}
                            hint={posLabel('panel.pos.manualCardHint', labels) || 'Confirme que el pago con tarjeta ha sido procesado'}
                            titleColor="text-slate-800"
                            hintColor="text-slate-600/80"
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Confirm button */}
            <div className="border-t border-sf-2 px-4 py-3 pos-footer-glass flex-shrink-0">
                <button
                    onClick={onConfirm}
                    disabled={itemCount === 0 || processing}
                    className="pos-pay-btn pos-pay-btn-active w-full h-[60px] rounded-2xl text-white font-bold text-lg
                               active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-200
                               flex items-center justify-center gap-2 relative overflow-hidden"
                >
                    {processing ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {posLabel('panel.pos.processing', labels)}
                        </span>
                    ) : paymentMethod === 'cash' ? (
                        <>
                            <Banknote className="w-5 h-5" />
                            {posLabel('panel.pos.enterAmount', labels) || 'Introducir Importe'}
                        </>
                    ) : paymentMethod === 'card_terminal' ? (
                        <>
                            <CreditCard className="w-5 h-5" />
                            {posLabel('panel.pos.presentCard', labels)} {formatCurrency(total)}
                        </>
                    ) : paymentMethod === 'twint' ? (
                        <>
                            <Smartphone className="w-5 h-5" />
                            {posLabel('panel.pos.scanTwint', labels)} {formatCurrency(total)}
                        </>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            {posLabel('panel.pos.confirmPayment', labels)} {formatCurrency(total)}
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    )
}

// ── Reusable PaymentHint sub-component ──
function PaymentHint({
    icon, iconBg, containerClass, title, hint, titleColor, hintColor,
}: {
    icon: React.ReactNode; iconBg: string; containerClass: string
    title: string; hint: string; titleColor: string; hintColor: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-3 p-4 rounded-2xl border ${containerClass}`}
        >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            <div>
                <p className={`text-xs font-semibold ${titleColor}`}>{title}</p>
                <p className={`text-[11px] ${hintColor} mt-0.5`}>{hint}</p>
            </div>
        </motion.div>
    )
}
