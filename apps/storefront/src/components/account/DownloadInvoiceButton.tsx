'use client'

import { useState, useCallback } from 'react'
import { FileDown, Loader2, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { logger } from '@/lib/logger'

interface DownloadInvoiceButtonProps {
    orderId: string
    orderNumber: string
    orderDate: string
    customerName: string
    customerEmail: string
    shippingAddress?: {
        line1: string
        line2?: string
        city: string
        postalCode: string
        country: string
        phone?: string
    }
    items: Array<{
        title: string
        variantTitle?: string
        quantity: number
        unitPrice: number
        lineTotal: number
    }>
    subtotal: number
    shippingTotal: number
    taxTotal: number
    discountTotal: number
    total: number
    currency: string
    storeName: string
    storeAddress?: string
    storeEmail?: string
    storePhone?: string
    storeVat?: string
}

export default function DownloadInvoiceButton(props: DownloadInvoiceButtonProps) {
    const { t, locale } = useI18n()
    const [generating, setGenerating] = useState(false)
    const [done, setDone] = useState(false)

    const handleDownload = useCallback(async () => {
        if (generating) return
        setGenerating(true)
        setDone(false)

        try {
            // Dynamic import to avoid bundling react-pdf on initial load
            const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
                import('@react-pdf/renderer'),
                import('./InvoicePDF'),
            ])

            const blob = await pdf(
                <InvoicePDF
                    data={{
                        orderNumber: props.orderNumber,
                        orderDate: props.orderDate,
                        customerName: props.customerName,
                        customerEmail: props.customerEmail,
                        shippingAddress: props.shippingAddress,
                        items: props.items,
                        subtotal: props.subtotal,
                        shippingTotal: props.shippingTotal,
                        taxTotal: props.taxTotal,
                        discountTotal: props.discountTotal,
                        total: props.total,
                        currency: props.currency,
                        locale,
                        storeName: props.storeName,
                        storeAddress: props.storeAddress,
                        storeEmail: props.storeEmail,
                        storePhone: props.storePhone,
                        storeVat: props.storeVat,
                    }}
                />
            ).toBlob()

            // Create download link
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `invoice-${props.orderNumber}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            setDone(true)
            setTimeout(() => setDone(false), 2000)
        } catch (err) {
            logger.error('PDF generation failed:', err)
        } finally {
            setGenerating(false)
        }
    }, [generating, props, locale])

    return (
        <button
            onClick={handleDownload}
            disabled={generating}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-sf-3 bg-sf-0 hover:border-brand hover:bg-brand-subtle text-tx-sec hover:text-brand transition-all disabled:opacity-50"
        >
            {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : done ? (
                <Check className="w-4 h-4 text-green-500" />
            ) : (
                <FileDown className="w-4 h-4" />
            )}
            {generating
                ? (t('order.generatingPdf') || 'Generating...')
                : done
                    ? (t('order.pdfReady') || 'Downloaded!')
                    : (t('order.downloadInvoice') || 'Download Invoice')
            }
        </button>
    )
}
