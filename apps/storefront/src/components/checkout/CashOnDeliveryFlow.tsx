'use client'

import { useState } from 'react'
import { Banknote, Loader2, AlertCircle, MapPin } from 'lucide-react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CashOnDeliveryFlowProps {
    deliveryAddress: string
    totalFormatted: string
    onConfirm: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CashOnDeliveryFlow({
    deliveryAddress,
    totalFormatted,
    onConfirm,
}: CashOnDeliveryFlowProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

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

    return (
        <div className="space-y-4">
            <div className="text-center mb-2">
                <Banknote className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="text-base font-bold text-text-primary">
                    Pago contra entrega
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                    Paga en efectivo cuando recibas tu pedido.
                </p>
            </div>

            {/* Address recap */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
                <MapPin className="w-5 h-5 text-text-muted mt-0.5 shrink-0" />
                <div>
                    <span className="text-xs text-text-muted block">Dirección de entrega</span>
                    <span className="text-sm text-text-primary">{deliveryAddress || 'No especificada'}</span>
                </div>
            </div>

            {/* Total reminder */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-sm text-text-secondary">Total a pagar en entrega:</span>
                <span className="text-base font-bold text-primary">{totalFormatted}</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">
                    🚚 Prepara el monto exacto si es posible. Nuestro repartidor
                    confirmará la entrega.
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
                        <Banknote className="w-5 h-5" />
                        Confirmar pedido — Pago contra entrega
                    </>
                )}
            </button>
        </div>
    )
}
