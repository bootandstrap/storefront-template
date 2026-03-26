'use client'

/**
 * PriceLabelSheet — Print-ready price label grid
 *
 * Generates a sheet of product price labels with:
 * - Product name
 * - Price with currency
 * - Barcode (Code128 from SKU)
 * - Printable on standard A4 label sheets or thermal printers
 */

import { useEffect, useRef, useCallback } from 'react'
import { renderBarcode, type BarcodeFormat } from '@/lib/pos/barcode-generator'
import { Barcode, Printer } from 'lucide-react'

export interface PriceLabelItem {
    name: string
    price: string
    sku: string
    currency?: string
    variant?: string
}

export interface PriceLabelLabels {
    print: string
    noProducts: string
    count: string
    noSku: string
}

const FALLBACK_LABELS: PriceLabelLabels = {
    print: 'Print Labels',
    noProducts: 'No products selected for labels',
    count: '{{count}} labels',
    noSku: 'No SKU',
}

interface PriceLabelSheetProps {
    items: PriceLabelItem[]
    barcodeFormat?: BarcodeFormat
    /** Labels per row (2, 3, or 4) */
    columns?: 2 | 3 | 4
    onPrint?: () => void
    /** i18n labels — English fallbacks if omitted */
    labels?: PriceLabelLabels
}

function SingleLabel({ item, barcodeFormat, noSkuLabel }: { item: PriceLabelItem; barcodeFormat: BarcodeFormat; noSkuLabel: string }) {
    const svgRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        if (svgRef.current && item.sku) {
            renderBarcode(svgRef.current, item.sku, {
                format: barcodeFormat,
                height: 30,
                width: 1.5,
                fontSize: 10,
                margin: 2,
            })
        }
    }, [item.sku, barcodeFormat])

    return (
        <div className="border border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-between gap-1 bg-white print:border-solid print:border-gray-200"
            style={{ minHeight: '120px' }}
        >
            {/* Product name */}
            <p className="text-xs font-semibold text-gray-900 text-center line-clamp-2 leading-tight">
                {item.name}
            </p>

            {/* Variant */}
            {item.variant && (
                <p className="text-[10px] text-gray-500">{item.variant}</p>
            )}

            {/* Price */}
            <p className="text-lg font-bold text-gray-900 tabular-nums">
                {item.price}
            </p>

            {/* Barcode */}
            {item.sku ? (
                <svg ref={svgRef} className="w-full max-w-[120px]" />
            ) : (
                <span className="text-[9px] text-gray-400">{noSkuLabel}</span>
            )}
        </div>
    )
}

export default function PriceLabelSheet({
    items,
    barcodeFormat = 'CODE128',
    columns = 3,
    onPrint,
    labels: externalLabels,
}: PriceLabelSheetProps) {
    const l = externalLabels ?? FALLBACK_LABELS
    const sheetRef = useRef<HTMLDivElement>(null)

    const handlePrint = useCallback(() => {
        if (onPrint) {
            onPrint()
            return
        }
        // Use browser print with label-specific styles
        const printWindow = window.open('', '', 'width=800,height=600')
        if (!printWindow || !sheetRef.current) return

        printWindow.document.write(`
            <html>
                <head>
                    <title>Price Labels</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: system-ui, sans-serif; padding: 8mm; }
                        .grid { display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 4mm; }
                        .label {
                            border: 0.5px solid #d1d5db;
                            border-radius: 4px;
                            padding: 6px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: space-between;
                            gap: 2px;
                            min-height: 100px;
                            page-break-inside: avoid;
                        }
                        .name { font-size: 9px; font-weight: 600; text-align: center; line-height: 1.2; }
                        .variant { font-size: 8px; color: #6b7280; }
                        .price { font-size: 16px; font-weight: 700; }
                        svg { max-width: 100px; height: auto; }
                        .no-sku { font-size: 8px; color: #9ca3af; }
                    </style>
                </head>
                <body>
                    ${sheetRef.current.innerHTML}
                    <script>window.onload = function() { window.print(); window.close(); }</script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }, [onPrint, columns])

    if (items.length === 0) {
        return (
            <div className="text-center py-12 text-text-muted">
                <Barcode className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{l.noProducts}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">
                    {l.count.replace('{{count}}', String(items.length))}
                </p>
                <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    {l.print}
                </button>
            </div>

            {/* Label Grid */}
            <div
                ref={sheetRef}
                className={`grid gap-3`}
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
                {items.map((item, i) => (
                    <SingleLabel key={`${item.sku}-${i}`} item={item} barcodeFormat={barcodeFormat} noSkuLabel={l.noSku} />
                ))}
            </div>
        </div>
    )
}
