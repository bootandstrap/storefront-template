'use client'

import { useState, useCallback, useMemo } from 'react'
import { MessageCircle, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react'
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
    const [showPreview, setShowPreview] = useState(false)

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

    // Pre-build message for preview
    const previewMessage = useMemo(() => {
        if (loading || items.length === 0) return ''
        return buildWhatsAppMessage(
            { items, customerName, customerPhone, deliveryAddress, notes, config },
            template
        )
    }, [items, customerName, customerPhone, deliveryAddress, notes, config, template, loading])

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
                <span className="ml-2 text-sm text-tx-muted">{t('common.loading')}</span>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-base font-bold text-tx">
                    {t('checkout.whatsapp.title')}
                </h3>
                <p className="text-sm text-tx-sec mt-1">
                    {t('checkout.whatsapp.description')}
                </p>
            </div>

            {template && (
                <div className="text-xs text-tx-muted text-center">
                    📝 {t('checkout.whatsapp.usingTemplate')}: <strong>{template.name}</strong>
                </div>
            )}

            {/* Message Preview Toggle */}
            <div className="rounded-xl border border-sf-3 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-sf-1 hover:bg-sf-2 transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm text-tx-sec">
                        {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {t('checkout.whatsapp.previewMessage') || 'Preview message'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-tx-muted" />
                </button>
                {showPreview && (
                    <div className="px-4 py-3 bg-sf-1/50 border-t border-sf-3 animate-fade-in">
                        <pre className="text-xs text-tx-sec whitespace-pre-wrap break-words font-mono leading-relaxed max-h-48 overflow-y-auto">
                            {previewMessage}
                        </pre>
                    </div>
                )}
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-300">
                    📱 {t('checkout.whatsapp.reviewNote')}
                </p>
            </div>

            <button
                onClick={handleSend}
                disabled={submitting}
                className="btn btn-whatsapp w-full py-3 text-base disabled:opacity-60 group"
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
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                )}
            </button>
        </div>
    )
}
