'use client'

import { useState } from 'react'
import { Building2, Copy, Check, Loader2, AlertCircle } from 'lucide-react'

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
    onConfirm: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Copy to clipboard micro-component
// ---------------------------------------------------------------------------

function CopyField({ label, value }: { label: string; value: string }) {
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
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
            <div>
                <span className="text-xs text-text-muted block">{label}</span>
                <span className="text-sm font-medium text-text-primary">{value}</span>
            </div>
            <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                type="button"
                aria-label={`Copiar ${label}`}
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                ) : (
                    <Copy className="w-4 h-4 text-text-muted" />
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
    onConfirm,
}: BankTransferFlowProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const hasBankDetails = bankDetails.bank_name && bankDetails.bank_account_number

    async function handleConfirm() {
        setIsSubmitting(true)
        setError(null)
        try {
            await onConfirm()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear el pedido')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!hasBankDetails) {
        return (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-400">
                        Datos bancarios no configurados
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">
                        El administrador debe configurar los datos de la cuenta bancaria.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-2">
                <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="text-base font-bold text-text-primary">
                    Transferencia bancaria
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                    Realiza la transferencia a la siguiente cuenta:
                </p>
            </div>

            <div className="space-y-2">
                {bankDetails.bank_name && (
                    <CopyField label="Banco" value={bankDetails.bank_name} />
                )}
                {bankDetails.bank_account_type && (
                    <CopyField label="Tipo de cuenta" value={bankDetails.bank_account_type} />
                )}
                {bankDetails.bank_account_number && (
                    <CopyField label="Número de cuenta" value={bankDetails.bank_account_number} />
                )}
                {bankDetails.bank_account_holder && (
                    <CopyField label="Titular" value={bankDetails.bank_account_holder} />
                )}
                {bankDetails.bank_nit && (
                    <CopyField label="NIT / Cédula" value={bankDetails.bank_nit} />
                )}
                <CopyField label="Monto a transferir" value={totalFormatted} />
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">
                    💡 Tu pedido quedará en estado <strong>pendiente</strong> hasta que
                    confirmemos la transferencia. Te notificaremos cuando se procese.
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
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
                        Creando pedido...
                    </>
                ) : (
                    <>
                        <Building2 className="w-5 h-5" />
                        He realizado la transferencia
                    </>
                )}
            </button>
        </div>
    )
}
