/**
 * Static preview generator — renders all templates × all layouts
 * 
 * Usage: cd apps/storefront && npx tsx src/emails/preview-all.tsx
 * Output: apps/storefront/email-previews/ directory with HTML files
 */

import { render } from '@react-email/render'
import * as React from 'react'
import * as fs from 'fs'
import * as path from 'path'
import { EMAIL_DESIGNS } from './email-template-registry'

// Layouts
import MinimalLayout from './layouts/MinimalLayout'
import BrandLayout from './layouts/BrandLayout'
import ModernLayout from './layouts/ModernLayout'

// Templates
import OrderConfirmation from './OrderConfirmation'
import OrderShipped from './OrderShipped'
import OrderDelivered from './OrderDelivered'
import OrderCancelled from './OrderCancelled'
import PaymentFailed from './PaymentFailed'
import RefundProcessed from './RefundProcessed'
import LowStockAlert from './LowStockAlert'
import Welcome from './Welcome'
import PasswordReset from './PasswordReset'
import AccountVerification from './AccountVerification'
import ReviewRequest from './ReviewRequest'
import AbandonedCart from './AbandonedCart'

const layouts = [
    { name: 'minimal', Component: MinimalLayout },
    { name: 'brand', Component: BrandLayout },
    { name: 'modern', Component: ModernLayout },
] as const

const templates = [
    { name: 'OrderConfirmation', Component: OrderConfirmation },
    { name: 'OrderShipped', Component: OrderShipped },
    { name: 'OrderDelivered', Component: OrderDelivered },
    { name: 'OrderCancelled', Component: OrderCancelled },
    { name: 'PaymentFailed', Component: PaymentFailed },
    { name: 'RefundProcessed', Component: RefundProcessed },
    { name: 'LowStockAlert', Component: LowStockAlert },
    { name: 'Welcome', Component: Welcome },
    { name: 'PasswordReset', Component: PasswordReset },
    { name: 'AccountVerification', Component: AccountVerification },
    { name: 'ReviewRequest', Component: ReviewRequest },
    { name: 'AbandonedCart', Component: AbandonedCart },
] as const

async function main() {
    const outDir = path.resolve(__dirname, '../../email-previews')
    fs.mkdirSync(outDir, { recursive: true })

    let indexHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Email Previews — All Templates × All Layouts</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 32px; }
  h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .subtitle { color: #888; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px; }
  .card { background: #141414; border: 1px solid #252525; border-radius: 12px; overflow: hidden; transition: border-color 0.2s; }
  .card:hover { border-color: #444; }
  .card a { text-decoration: none; color: inherit; display: block; }
  .card .preview { height: 240px; overflow: hidden; background: #1a1a1a; position: relative; }
  .card .preview iframe { width: 200%; height: 200%; transform: scale(0.5); transform-origin: top left; border: none; pointer-events: none; }
  .card .info { padding: 16px; }
  .card .name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
  .card .layout { font-size: 12px; color: #888; }
  .section-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #ccc; border-bottom: 1px solid #222; padding-bottom: 8px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 10px; font-weight: 600; margin-left: 8px; }
  .badge-free { background: #1e3a1e; color: #4ade80; }
  .badge-basic { background: #1e2a3e; color: #60a5fa; }
  .badge-pro { background: #3e1e3e; color: #c084fc; }
</style>
</head><body>
<h1>📧 Email Design System</h1>
<p class="subtitle">${templates.length} templates × ${layouts.length} layouts = ${templates.length * layouts.length} combinations</p>
`

    let total = 0
    let errors = 0

    for (const layout of layouts) {
        const badge = layout.name === 'minimal' ? 'free' : layout.name === 'brand' ? 'basic' : 'pro'
        const design = EMAIL_DESIGNS.find(d => d.slug === layout.name)
        const label = design?.price_label || 'FREE'
        indexHtml += `<h2 class="section-title">${layout.name.charAt(0).toUpperCase() + layout.name.slice(1)} Layout <span class="badge badge-${badge}">${label}</span></h2>\n<div class="grid">\n`

        for (const template of templates) {
            const fileName = `${template.name}-${layout.name}.html`
            try {
                const html = await render(
                    React.createElement(template.Component, {
                        Layout: layout.Component,
                        storeName: 'CampiFruit',
                        storeUrl: 'https://campifruit.com',
                        brandColor: '#2D5016',
                    } as any)
                )
                fs.writeFileSync(path.join(outDir, fileName), html)
                indexHtml += `  <div class="card"><a href="${fileName}" target="_blank">
    <div class="preview"><iframe src="${fileName}" loading="lazy"></iframe></div>
    <div class="info"><div class="name">${template.name}</div><div class="layout">${layout.name}</div></div>
  </a></div>\n`
                total++
                console.log(`  ✅ ${fileName}`)
            } catch (e) {
                errors++
                console.error(`  ❌ ${fileName}: ${e instanceof Error ? e.message : e}`)
            }
        }
        indexHtml += `</div>\n`
    }

    indexHtml += `</body></html>`
    fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml)

    console.log(`\n📊 Generated: ${total} HTMLs, ${errors} errors`)
    console.log(`📂 Output: ${outDir}/index.html`)
    console.log(`🌐 Open: file://${outDir}/index.html`)
}

main().catch(console.error)
