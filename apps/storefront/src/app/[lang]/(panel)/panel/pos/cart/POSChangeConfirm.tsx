'use client'

/**
 * POSChangeConfirm — Change verification screen (Step 4: new user-requested step)
 *
 * Allows cashier to verify/modify the change amount before finalizing.
 * Design: Large display showing tendered → total → change with visual emphasis.
 * User can go back to modify the tendered amount or confirm to process.
 *
 * @module pos/cart/POSChangeConfirm
 */

import { ArrowLeft, Check, Banknote, Receipt } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'
import { POS_SPRINGS } from '../hooks/pos-springs'

interface POSChangeConfirmProps {
    total: number
    tenderedAmount: number       // in minor units (cents)
    processing: boolean
    onConfirm: () => void        // finalize sale
    onBack: () => void           // go back to numpad to modify
    labels: Record<string, string>
    defaultCurrency: string
}

export default function POSChangeConfirm({
    total,
    tenderedAmount,
    processing,
    onConfirm,
    onBack,
    labels,
    defaultCurrency,
}: POSChangeConfirmProps) {
    const formatCurrency = (amount: number) => formatPOSCurrency(amount, defaultCurrency)
    const changeAmount = tenderedAmount - total

    return (
        <motion.div
            key="change_confirm"
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
                    {posLabel('panel.pos.verifyChange', labels) || 'Verificar Cambio'}
                </span>
            </div>

            {/* Change display — the star of this step */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
                {/* Receipt-style breakdown */}
                <div className="w-full max-w-[280px] space-y-3">
                    {/* Total due */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-tx-muted flex items-center gap-1.5">
                            <Receipt className="w-4 h-4" />
                            {posLabel('panel.pos.totalDue', labels) || 'Total'}
                        </span>
                        <span className="font-bold tabular-nums text-tx">{formatCurrency(total)}</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-sf-3" />

                    {/* Tendered */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-tx-muted flex items-center gap-1.5">
                            <Banknote className="w-4 h-4" />
                            {posLabel('panel.pos.cashTendered', labels) || 'Recibido'}
                        </span>
                        <span className="font-bold tabular-nums text-tx">{formatCurrency(tenderedAmount)}</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-sf-2" />

                    {/* Change — prominent */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={POS_SPRINGS.bouncy}
                        className="flex items-center justify-between"
                    >
                        <span className="text-base font-bold text-tx">
                            {posLabel('panel.pos.change', labels) || 'Cambio'}
                        </span>
                        <motion.span
                            key={changeAmount}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            className={`text-3xl font-black tabular-nums ${
                                changeAmount > 0 ? 'text-emerald-600' : 'text-tx'
                            }`}
                        >
                            {formatCurrency(changeAmount)}
                        </motion.span>
                    </motion.div>
                </div>

                {/* Visual cue for non-zero change */}
                {changeAmount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/40"
                    >
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700">
                            {posLabel('panel.pos.giveChange', labels) || 'Entregar cambio al cliente'}
                        </span>
                    </motion.div>
                )}

                {changeAmount === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-subtle border border-brand-soft/40"
                    >
                        <Check className="w-5 h-5 text-brand" />
                        <span className="text-xs font-medium text-brand">
                            {posLabel('panel.pos.exactAmount', labels) || 'Importe exacto — sin cambio'}
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Action buttons */}
            <div className="border-t border-sf-2 px-4 py-3 pos-footer-glass flex-shrink-0 flex gap-2">
                <button
                    onClick={onBack}
                    className="flex-1 h-[52px] rounded-2xl bg-sf-1 text-sm font-semibold text-tx-sec
                               hover:bg-sf-2 transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {posLabel('panel.pos.modifyAmount', labels) || 'Modificar'}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={processing}
                    className="pos-pay-btn pos-pay-btn-active flex-[2] h-[56px] rounded-2xl text-white text-sm font-bold
                               active:scale-[0.97]
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-150 flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {posLabel('panel.pos.processing', labels)}
                        </span>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            {posLabel('panel.pos.confirmSale', labels) || 'Confirmar Venta'}
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    )
}
