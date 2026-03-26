#!/usr/bin/env tsx
/**
 * preview-receipt — Generate receipt previews as SVG without a physical printer.
 *
 * Uses the `receiptline` library to render receipt markdown → SVG.
 * Opens the preview in the default browser.
 *
 * Usage:
 *   npx tsx scripts/preview-receipt.ts              # Default thermal 80mm
 *   npx tsx scripts/preview-receipt.ts --thermal     # 80mm thermal receipt  (48 chars)
 *   npx tsx scripts/preview-receipt.ts --thermal-58  # 58mm thermal receipt  (32 chars)
 *   npx tsx scripts/preview-receipt.ts --a4          # A4 invoice-style (72 chars)
 *   npx tsx scripts/preview-receipt.ts --save        # Save SVG to file instead of opening
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// ── receiptline import (CommonJS) ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
let receiptline: { transform: (doc: string, options: Record<string, unknown>) => string }
try {
    receiptline = require('receiptline')
} catch {
    const storefrontPath = path.join(__dirname, '../apps/storefront/node_modules/receiptline')
    receiptline = require(storefrontPath)
}

// ── CLI args ───────────────────────────────────────────────────
const args = process.argv.slice(2)
const is58mm = args.includes('--thermal-58')
const isA4 = args.includes('--a4')
const saveOnly = args.includes('--save')
const paperWidth = isA4 ? 72 : is58mm ? 32 : 48 // chars per line

// ── Mock sale data ─────────────────────────────────────────────
const now = new Date()
const timestamp = `${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`

const businessName = 'Frutas Frescas del Campo'
const businessAddress = 'C/ Mayor 15, 28001 Madrid'
const businessNIF = 'B-12345678'
const businessPhone = '+34 612 345 678'

const items = [
    { name: 'Manzanas Fuji (1kg)', qty: 2, price: 3.49 },
    { name: 'Plátanos Canarias', qty: 1, price: 1.89 },
    { name: 'Aguacate Hass', qty: 3, price: 2.79 },
    { name: 'Fresas (500g)', qty: 1, price: 4.50 },
    { name: 'Limones eco (malla)', qty: 2, price: 2.25 },
]

const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
const tax = subtotal * 0.10 // 10% IVA
const total = subtotal + tax
const discount = 1.50

// ── Build ReceiptLine markdown ─────────────────────────────────
function buildReceiptMarkdown(): string {
    const sep = '-'.repeat(paperWidth)
    const lines: string[] = []

    // Header
    lines.push(`^^^${businessName}`)
    lines.push(`${businessAddress}`)
    lines.push(`NIF: ${businessNIF} | Tel: ${businessPhone}`)
    lines.push(sep)
    lines.push(`${timestamp}`)
    lines.push(`Pedido: #ORD-A1B2C3`)
    lines.push(sep)

    // Items
    for (const item of items) {
        const lineTotal = (item.qty * item.price).toFixed(2)
        lines.push(`${item.qty}x ${item.name} |${lineTotal}€`)
    }

    lines.push(sep)

    // Totals
    lines.push(`Subtotal |${subtotal.toFixed(2)}€`)
    lines.push(`Descuento |-${discount.toFixed(2)}€`)
    lines.push(`IVA (10%) |${tax.toFixed(2)}€`)
    lines.push(sep)
    lines.push(`^^TOTAL |^^${(total - discount).toFixed(2)}€`)
    lines.push(sep)

    // Payment
    lines.push(`Método: Efectivo`)
    lines.push(`Pagado: ${(total - discount + 5).toFixed(2)}€`)
    lines.push(`Cambio: ${(5).toFixed(2)}€`)
    lines.push(sep)

    // QR Code (receipt URL placeholder)
    lines.push(`{code:https://tienda.example.com/receipt/ORD-A1B2C3;option:qrcode,5}`)

    // Footer
    lines.push('')
    lines.push(`^¡Gracias por su compra!`)
    lines.push(`^www.frutasfrescas.es`)
    lines.push('')

    return lines.join('\n')
}

// ── Generate SVG ───────────────────────────────────────────────
const doc = buildReceiptMarkdown()
const svg = receiptline.transform(doc, {
    cpl: paperWidth,
    encoding: 'multilingual',
    spacing: true,
})

// ── Output ─────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
}

const format = isA4 ? 'A4 (72 chars)' : is58mm ? 'Thermal 58mm (32 chars)' : 'Thermal 80mm (48 chars)'

console.log()
console.log(`${C.cyan}${C.bold}  🖨️  Receipt Preview Generator${C.reset}`)
console.log(`${C.dim}  ────────────────────────────────${C.reset}`)
console.log(`  Format: ${C.bold}${format}${C.reset}`)
console.log()

// Wrap in full HTML for browser display
const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Receipt Preview — ${format}</title>
    <style>
        body {
            background: #1a1a2e;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: system-ui, -apple-system, sans-serif;
            color: #e0e0e0;
        }
        h1 {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 16px;
            opacity: 0.6;
        }
        .receipt-wrapper {
            background: white;
            padding: 20px;
            border-radius: 4px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            max-width: ${isA4 ? '210mm' : is58mm ? '58mm' : '80mm'};
        }
        .receipt-wrapper svg {
            width: 100%;
            height: auto;
        }
        .meta {
            margin-top: 16px;
            font-size: 11px;
            opacity: 0.4;
        }
    </style>
</head>
<body>
    <h1>🖨️ Receipt Preview — ${format}</h1>
    <div class="receipt-wrapper">
        ${svg}
    </div>
    <p class="meta">Generated by BootandStrap Dev Tools • ${timestamp}</p>
</body>
</html>`

if (saveOnly) {
    const outPath = path.resolve(`/tmp/receipt-preview-${Date.now()}.html`)
    fs.writeFileSync(outPath, html, 'utf-8')
    console.log(`  ${C.green}✓${C.reset} Saved to: ${C.bold}${outPath}${C.reset}`)
} else {
    const outPath = path.resolve(`/tmp/receipt-preview-${Date.now()}.html`)
    fs.writeFileSync(outPath, html, 'utf-8')
    console.log(`  ${C.green}✓${C.reset} Opening preview in browser...`)
    try {
        execSync(`open "${outPath}"`, { stdio: 'ignore' })
    } catch {
        console.log(`  ${C.dim}Could not open browser. File at: ${outPath}${C.reset}`)
    }
}

console.log()
