#!/usr/bin/env node
/**
 * Downloads relevant product images from Unsplash and uploads to Supabase Storage.
 * Zero dependencies — uses native fetch + Supabase REST API directly.
 *
 * Usage: node scripts/upload-product-images.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Load env vars from .env ──
const envPath = path.resolve(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'product-images'

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
}

// ── Product → Unsplash photo mapping ──
// Each URL is a specific Unsplash photo ID with crop parameters
const PRODUCT_IMAGES = [
    {
        filename: 'naranjas.jpg',
        url: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=800&h=600&fit=crop&q=80',
        product: 'Naranjas de Valencia',
    },
    {
        filename: 'mangos.jpg',
        url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&h=600&fit=crop&q=80',
        product: 'Mangos Kent Premium',
    },
    {
        filename: 'aguacates.jpg',
        url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&h=600&fit=crop&q=80',
        product: 'Aguacates Hass',
    },
    {
        filename: 'limones.jpg',
        url: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=800&h=600&fit=crop&q=80',
        product: 'Limones Ecológicos',
    },
    {
        filename: 'kiwis.jpg',
        url: 'https://images.unsplash.com/photo-1585059895524-72f4a02b40f7?w=800&h=600&fit=crop&q=80',
        product: 'Kiwis Verdes',
    },
    {
        filename: 'granadas.jpg',
        url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&h=600&fit=crop&q=80',
        product: 'Granadas Mollar',
    },
    {
        filename: 'caquis.jpg',
        url: 'https://images.unsplash.com/photo-1604526916829-db4917de7541?w=800&h=600&fit=crop&q=80',
        product: 'Caquis Persimon',
    },
    {
        filename: 'miel-azahar.jpg',
        url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&h=600&fit=crop&q=80',
        product: 'Miel de Azahar',
    },
    {
        filename: 'aceite-oliva.jpg',
        url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&h=600&fit=crop&q=80',
        product: 'Aceite de Oliva Virgen Extra',
    },
    {
        filename: 'caja-mixta.jpg',
        url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=600&fit=crop&q=80',
        product: 'Caja Mixta del Huerto',
    },
    {
        filename: 'caja-citricos.jpg',
        url: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800&h=600&fit=crop&q=80',
        product: 'Caja Cítricos Premium',
    },
]

// ── Supabase Storage REST helpers ──

async function ensureBucket() {
    // List buckets
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    })
    const buckets = await listRes.json()

    if (Array.isArray(buckets) && buckets.some(b => b.name === BUCKET)) {
        console.log(`✅ Bucket "${BUCKET}" already exists`)
        return
    }

    // Create bucket
    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: BUCKET,
            id: BUCKET,
            public: true,
            file_size_limit: 5 * 1024 * 1024,
            allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
        }),
    })

    if (!createRes.ok) {
        const err = await createRes.text()
        console.error(`❌ Failed to create bucket: ${err}`)
        process.exit(1)
    }
    console.log(`✅ Created bucket "${BUCKET}" (public)`)
}

async function uploadFile(filename, buffer) {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`

    const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
        },
        body: buffer,
    })

    if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Upload failed (${res.status}): ${errBody}`)
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`
}

// ── Main ──

async function main() {
    console.log('🪣 Checking bucket...')
    await ensureBucket()
    console.log('')

    let success = 0
    let failed = 0

    for (const item of PRODUCT_IMAGES) {
        process.stdout.write(`📸 ${item.product} (${item.filename})... `)

        try {
            // Download from Unsplash
            const response = await fetch(item.url, { redirect: 'follow' })
            if (!response.ok) {
                console.log(`❌ Download failed: ${response.status}`)
                failed++
                continue
            }

            const buffer = Buffer.from(await response.arrayBuffer())
            process.stdout.write(`${(buffer.length / 1024).toFixed(0)}KB → `)

            // Upload to Supabase
            const publicUrl = await uploadFile(item.filename, buffer)
            console.log(`✅ ${publicUrl}`)
            success++
        } catch (err) {
            console.log(`❌ ${err.message}`)
            failed++
        }
    }

    console.log(`\n🎉 Done! ${success} uploaded, ${failed} failed out of ${PRODUCT_IMAGES.length} total.`)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
