'use client'

import { useState, useCallback } from 'react'
import { MessageCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import type { StoreConfig } from '@/lib/config'
import type { MedusaLineItem } from '@/lib/medusa/client'
import { useI18n } from '@/lib/i18n/provider'
import { buildWhatsAppMessage, buildWhatsAppURL, type WhatsAppTemplateRow } from '@/lib/whatsapp/buildMessage'
import { fetchDefaultWhatsAppTemplate, submitWhatsAppOrder } from '@/app/[lang]/(shop)/checkout/actions'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WhatsAppCheckoutFlowProps {
    config: StoreConfig
    items: MedusaLineItem[]
    cartId: string
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    deliveryAddress?: string
    notes?: string
    onComplete: (order?: { id: string; display_id: number }) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhatsAppCheckoutFlow({
    config,
    items,
    cartId,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    notes,
    onComplete,
}: WhatsAppCheckoutFlowProps) {
    const { t } = useI18n()
    const [template, setTemplate] = useState<WhatsAppTemplateRow | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch template from Supabase on mount
    useState(() => {
        async function load() {
            try {
                const tmpl = await fetchDefaultWhatsAppTemplate()
                setTemplate(tmpl)
            } catch {
                // Will fall back to hardcoded template
            } finally {
                setLoading(false)
            }
        }
        load()
    })

    const handleSend = useCallback(async () => {
        if (submitting) return
        setSubmitting(true)
        setError(null)

        try {
            // 1. Create order in backend FIRST (traceability)
            const result = await submitWhatsAppOrder(cartId, {
                name: customerName || '',
                email: customerEmail || '',
                phone: customerPhone,
                address: deliveryAddress,
                notes,
            })

            if (result.error) {
                setError(result.error)
                setSubmitting(false)
                return
            }

            // 2. Build WhatsApp message and open wa.me
            const message = buildWhatsAppMessage(
                { items, customerName, customerPhone, deliveryAddress, notes, config },
                template
            )
            const url = buildWhatsAppURL(config.whatsapp_number, message)
            window.open(url, '_blank')

            // 3. Notify parent with the created order
            onComplete(result.order ? { id: result.order.id, display_id: result.order.display_id } : undefined)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error creating order')
            setSubmitting(false)
        }
    }, [cartId, customerName, customerEmail, customerPhone, deliveryAddress, notes, items, config, template, onComplete, submitting])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                <span className="ml-2 text-sm text-text-muted">{t('common.loading')}</span>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-2">
                <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-text-primary">
                    {t('checkout.whatsapp.title')}
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                    {t('checkout.whatsapp.description')}
                </p>
            </div>

            {template && (
                <div className="text-xs text-text-muted text-center">
                    📝 {t('checkout.whatsapp.usingTemplate')}: <strong>{template.name}</strong>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-300">
                    📱 {t('checkout.whatsapp.reviewNote')}
                </p>
            </div>

            <button
                onClick={handleSend}
                disabled={submitting}
                className="btn btn-whatsapp w-full py-3 text-base disabled:opacity-60"
                type="button"
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('common.loading')}
                    </>
                ) : (
                    <>
                        <MessageCircle className="w-5 h-5" />
                        {t('checkout.whatsapp.sendButton')}
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </div>
    )
}
