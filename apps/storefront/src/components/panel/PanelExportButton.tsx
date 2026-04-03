'use client'

/**
 * PanelExportButton — CSV/PDF export for panel data tables
 *
 * Provides an export dropdown with CSV and PDF options.
 * Handles data serialization and browser file download.
 *
 * Usage:
 *   <PanelExportButton
 *     data={orders}
 *     columns={[{ key: 'id', label: 'Order ID' }, ...]}
 *     filename="orders-export"
 *   />
 */

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Table, ChevronDown } from 'lucide-react'

interface ExportColumn {
    key: string
    label: string
    /** Optional formatter for the cell value */
    format?: (value: unknown) => string
}

interface PanelExportButtonProps {
    /** Data array to export */
    data: Record<string, unknown>[]
    /** Column definitions for the export */
    columns: ExportColumn[]
    /** Base filename (without extension) */
    filename?: string
    /** Hide PDF option */
    csvOnly?: boolean
    /** Loading state */
    loading?: boolean
    /** Additional className */
    className?: string
    /** Labels */
    labels?: {
        export?: string
        csv?: string
        pdf?: string
    }
}

function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function toCSV(data: Record<string, unknown>[], columns: ExportColumn[]): string {
    const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
    const header = columns.map(c => `"${c.label}"`).join(',')
    const rows = data.map(row =>
        columns.map(col => {
            const raw = row[col.key]
            const formatted = col.format ? col.format(raw) : String(raw ?? '')
            // Escape double quotes
            return `"${formatted.replace(/"/g, '""')}"`
        }).join(',')
    )
    return BOM + [header, ...rows].join('\n')
}

export default function PanelExportButton({
    data,
    columns,
    filename = 'export',
    csvOnly = false,
    loading = false,
    className = '',
    labels = {},
}: PanelExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [exporting, setExporting] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleCSV = () => {
        setExporting(true)
        try {
            const csv = toCSV(data, columns)
            const date = new Date().toISOString().split('T')[0]
            downloadFile(csv, `${filename}-${date}.csv`, 'text/csv;charset=utf-8')
        } finally {
            setExporting(false)
            setIsOpen(false)
        }
    }

    const handlePDF = () => {
        setExporting(true)
        try {
            // Generate a simple printable HTML table and trigger print dialog
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${filename}</title>
                    <style>
                        body { font-family: -apple-system, system-ui, sans-serif; padding: 2rem; }
                        h1 { font-size: 1.25rem; margin-bottom: 1rem; }
                        table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
                        th { background: #f3f4f6; padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; }
                        td { padding: 8px 12px; border: 1px solid #e5e7eb; }
                        tr:nth-child(even) { background: #fafafa; }
                        .footer { margin-top: 1.5rem; font-size: 0.75rem; color: #9ca3af; }
                    </style>
                </head>
                <body>
                    <h1>${filename}</h1>
                    <table>
                        <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
                        <tbody>${data.map(row => `<tr>${columns.map(c => {
                            const val = c.format ? c.format(row[c.key]) : String(row[c.key] ?? '')
                            return `<td>${val}</td>`
                        }).join('')}</tr>`).join('')}</tbody>
                    </table>
                    <p class="footer">Generated ${new Date().toLocaleString()} • ${data.length} records</p>
                </body>
                </html>
            `
            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(html)
                printWindow.document.close()
                printWindow.print()
            }
        } finally {
            setExporting(false)
            setIsOpen(false)
        }
    }

    const isDisabled = loading || exporting || data.length === 0

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isDisabled}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sf-3 bg-sf-0 text-sm font-medium text-tx hover:bg-sf-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soft"
            >
                <Download className="w-4 h-4 text-tx-muted" />
                <span>{labels.export || 'Exportar'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-tx-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-xl rounded-xl p-1 min-w-[160px] animate-fade-in-up">
                    <button
                        type="button"
                        onClick={handleCSV}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-tx hover:bg-sf-1 transition-colors"
                    >
                        <Table className="w-4 h-4 text-tx-muted" />
                        {labels.csv || 'CSV (Excel)'}
                    </button>
                    {!csvOnly && (
                        <button
                            type="button"
                            onClick={handlePDF}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-tx hover:bg-sf-1 transition-colors"
                        >
                            <FileText className="w-4 h-4 text-tx-muted" />
                            {labels.pdf || 'PDF (Imprimir)'}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
