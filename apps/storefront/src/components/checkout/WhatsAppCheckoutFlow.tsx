'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageCircle, ArrowRight, Loader2 } from 'lucide-react'
import type { StoreConfig } from '@/lib/config'
import type { MedusaLineItem } from '@/lib/medusa/client'
import { useI18n } from '@/lib/i18n/provider'
import { buildWhatsAppMessage, buildWhatsAppURL, type WhatsAppTemplateRow } from '@/lib/whatsapp/buildMessage'
import { fetchDefaultWhatsAppTemplate } from '@/app/[lang]/(shop)/checkout/actions'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WhatsAppCheckoutFlowProps {
    config: StoreConfig
    items: MedusaLineItem[]
    customerName?: string
    customerPhone?: string
    deliveryAddress?: string
    notes?: string
    onComplete: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhatsAppCheckoutFlow({
    config,
    items,
    customerName,
    customerPhone,
    deliveryAddress,
    notes,
    onComplete,
}: WhatsAppCheckoutFlowProps) {
    const { t } = useI18n()
    const [template, setTemplate] = useState<WhatsAppTemplateRow | null>(null)
    const [loading, setLoading] = useState(true)

    // Fetch template from Supabase on mount
    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const tmpl = await fetchDefaultWhatsAppTemplate()
                if (!cancelled) setTemplate(tmpl)
            } catch {
                // Will fall back to hardcoded template
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    const handleSend = useCallback(() => {
        const message = buildWhatsAppMessage(
            { items, customerName, customerPhone, deliveryAddress, notes, config },
            template
        )
        const url = buildWhatsAppURL(config.whatsapp_number, message)
        window.open(url, '_blank')
        onComplete()
    }, [items, customerName, customerPhone, deliveryAddress, notes, config, template, onComplete])

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

            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-300">
                    📱 {t('checkout.whatsapp.reviewNote')}
                </p>
            </div>

            <button
                onClick={handleSend}
                className="btn btn-whatsapp w-full py-3 text-base"
                type="button"
            >
                <MessageCircle className="w-5 h-5" />
                {t('checkout.whatsapp.sendButton')}
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    )
}
