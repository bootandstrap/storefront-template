#!/usr/bin/env tsx
/**
 * patch-product-images.ts — Update existing Medusa products with thumbnail URLs
 *
 * Reads campifruit-image-urls.json and patches each product's thumbnail
 * via the Medusa Admin API. No re-seed needed.
 *
 * Usage: npx tsx scripts/patch-product-images.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Load .env ────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) process.env[key] = val
    }
}

const MEDUSA_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusa-test.com'
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || 'supersecret'

// ── Helpers ─────────────────────────────────────────────────

async function getAdminToken(): Promise<string> {
    const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })
    if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`)
    const data = await res.json()
    return data.token
}

async function listProducts(token: string): Promise<any[]> {
    const res = await fetch(`${MEDUSA_URL}/admin/products?limit=50&fields=id,handle,title,thumbnail`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`List products failed: ${res.status}`)
    const data = await res.json()
    return data.products
}

async function updateProductThumbnail(token: string, productId: string, thumbnailUrl: string): Promise<boolean> {
    const res = await fetch(`${MEDUSA_URL}/admin/products/${productId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ thumbnail: thumbnailUrl }),
    })
    return res.ok
}

// ── Main ────────────────────────────────────────────────────

async function main() {
    console.log('🖼️  Patch Product Images')
    console.log(`   Medusa: ${MEDUSA_URL}`)
    console.log('')

    // Load image map
    const mapPath = path.resolve(__dirname, 'campifruit-image-urls.json')
    const imageMap: Record<string, string> = JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
    console.log(`   📋 ${Object.keys(imageMap).length} image URLs loaded`)

    // Auth
    const token = await getAdminToken()
    console.log('   🔐 Admin authenticated')

    // Get products
    const products = await listProducts(token)
    console.log(`   📦 ${products.length} products found in Medusa`)
    console.log('')

    let patched = 0
    let skipped = 0
    let notFound = 0

    for (const product of products) {
        const handle = product.handle
        
        // Try exact match first, then fallback to partial match
        let imageUrl = imageMap[handle]
        if (!imageUrl) {
            // Try matching by checking if any key is contained in the handle
            const matchingKey = Object.keys(imageMap).find(key => handle?.includes(key) || key.includes(handle))
            if (matchingKey) imageUrl = imageMap[matchingKey]
        }

        if (!imageUrl) {
            console.log(`   ⏭️  ${product.title} (${handle}) — no image mapping`)
            notFound++
            continue
        }

        if (product.thumbnail === imageUrl) {
            console.log(`   ✅ ${product.title} — already has correct thumbnail`)
            skipped++
            continue
        }

        const ok = await updateProductThumbnail(token, product.id, imageUrl)
        if (ok) {
            console.log(`   🖼️  ${product.title} — thumbnail updated`)
            patched++
        } else {
            console.log(`   ❌ ${product.title} — update FAILED`)
        }
    }

    console.log('')
    console.log(`   Done: ${patched} patched, ${skipped} skipped, ${notFound} unmapped`)
}

main().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
})
