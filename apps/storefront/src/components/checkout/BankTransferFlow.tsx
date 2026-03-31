'use client'

import { useState, useMemo } from 'react'
import { Building2, Copy, Check, Loader2, AlertCircle, Hash, Clock } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BankTransferFlowProps {
    bankDetails: {
        bank_name?: string | null
        bank_account_number?: string | null
        bank_account_holder?: string | null
        bank_account_type?: string | null
        bank_nit?: string | null
    }
    totalFormatted: string
    cartId?: string
    onConfirm: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Generate unique payment reference from cartId
// ---------------------------------------------------------------------------

function generatePaymentReference(cartId?: string): string {
    const ts = Date.now().toString(36).toUpperCase().slice(-4)
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    const prefix = cartId ? cartId.slice(-4).toUpperCase() : 'BNS'
    return `BNS-${prefix}-${ts}${rand}`
}

// ---------------------------------------------------------------------------
// Copy to clipboard micro-component
// ---------------------------------------------------------------------------

function CopyField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback: select the text
        }
    }

    return (
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
            highlight
                ? 'bg-brand/5 border-brand/20'
                : 'bg-sf-1 border-sf-3'
        }`}>
            <div>
                <span className="text-xs text-tx-muted block">{label}</span>
                <span className={`text-sm font-medium ${highlight ? 'text-brand font-bold' : 'text-tx'}`}>
                    {value}
                </span>
            </div>
            <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-glass transition-colors"
                type="button"
                aria-label={`Copy ${label}`}
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                ) : (
                    <Copy className="w-4 h-4 text-tx-muted" />
                )}
            </button>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BankTransferFlow({
    bankDetails,
    totalFormatted,
    cartId,
    onConfirm,
}: BankTransferFlowProps) {
    const { t } = useI18n()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const hasBankDetails = bankDetails.bank_name && bankDetails.bank_account_number

    // Stable unique reference for this transfer
    const paymentRef = useMemo(() => generatePaymentReference(cartId), [cartId])

    async function handleConfirm() {
        setIsSubmitting(true)
        setError(null)
        try {
            await onConfirm()
        } catch (err) {
            setError(err instanceof Error ? err.message : t('checkout.errors.orderCreate'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!hasBankDetails) {
        return (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        {t('checkout.bank.notConfiguredTitle')}
                    </p>
                    <p className="text-xs text-amber-500/70 dark:text-amber-400/70 mt-1">
                        {t('checkout.bank.notConfiguredMsg')}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-2">
                <Building2 className="w-8 h-8 text-brand mx-auto mb-2" />
                <h3 className="text-base font-bold text-tx">
                    {t('checkout.bank.title')}
                </h3>
                <p className="text-sm text-tx-sec mt-1">
                    {t('checkout.bank.instructions')}
                </p>
            </div>

            <div className="space-y-2">
                {/* Unique payment reference — MUST be included in transfer */}
                <CopyField
                    label={t('checkout.bank.reference') || 'Payment Reference'}
                    value={paymentRef}
                    highlight
                />

                {bankDetails.bank_name && (
                    <CopyField label={t('checkout.bank.bankName')} value={bankDetails.bank_name} />
                )}
                {bankDetails.bank_account_type && (
                    <CopyField label={t('checkout.bank.accountType')} value={bankDetails.bank_account_type} />
                )}
                {bankDetails.bank_account_number && (
                    <CopyField label={t('checkout.bank.accountNumber')} value={bankDetails.bank_account_number} />
                )}
                {bankDetails.bank_account_holder && (
                    <CopyField label={t('checkout.bank.holder')} value={bankDetails.bank_account_holder} />
                )}
                {bankDetails.bank_nit && (
                    <CopyField label={t('checkout.bank.nit')} value={bankDetails.bank_nit} />
                )}
                <CopyField label={t('checkout.bank.amount')} value={totalFormatted} highlight />
            </div>

            {/* Reference reminder */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-brand/5 border border-brand/15">
                <Hash className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                <p className="text-xs text-brand-dark dark:text-brand-light">
                    {t('checkout.bank.referenceNote') || 'Include the payment reference in your transfer description so we can match your payment.'}
                </p>
            </div>

            {/* Timing info */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-600 dark:text-blue-300">
                    {t('checkout.bank.pendingNote')}
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('checkout.creatingOrder')}
                    </>
                ) : (
                    <>
                        <Building2 className="w-5 h-5" />
                        {t('checkout.bank.confirmButton')}
                    </>
                )}
            </button>
        </div>
    )
}
