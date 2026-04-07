#!/usr/bin/env tsx
/**
 * seed-campifruit-images.ts — Upload Campifruit product images to Medusa
 *
 * Reads PNGs from the client's local photo directory, uploads them
 * to Medusa via the Admin API `/admin/uploads`, and outputs a JSON
 * map of { filename → url } for use by seed-demo.ts.
 *
 * Usage:
 *   npx tsx scripts/seed-campifruit-images.ts
 *   npx tsx scripts/seed-campifruit-images.ts --dry-run  # list files only
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

// ── Config ───────────────────────────────────────────────────

const SOURCE_DIR = '/Users/webnorka/DESARROLLO/CAMPIFRUT/REC.GRAFICOS/Fotos Pagina/JPG'
const MEDUSA_URL = process.env.MEDUSA_ADMIN_URL || process.env.MEDUSA_URL || 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusajs.com'
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || 'supersecret'

// Map: source filename → clean product slug for Medusa
// We select ONE representative image per product
const IMAGE_MAP: Record<string, string> = {
    // Fresas
    'FRESA.png':              'fresa-fresca',
    'FRESA 250.png':          'fresa-250g',
    'Fresa 500.png':          'fresa-500g',
    // Moras
    'MORA 250.png':           'mora-250g',
    'mora 500.png':           'mora-500g',
    // Brevas
    'BREVAS.png':             'breva-fresca',
    'BREVA 250.png':          'breva-250g',
    'BREVAS 500.png':         'breva-500g',
    'BREVAS 1000.png':        'breva-1000g',
    // Duraznos
    'durazno 1.png':          'durazno-fresco',
    'durazno 250.png':        'durazno-250g',
    'DURAZNO 500.png':        'durazno-500g',
    // Piña
    'PIÑAS.png':              'pina-entera',
    'PIÑA 250.png':           'pina-250g',
    'PIÑA 1000.png':          'pina-1000g',
    'PIÑA EN RODAJAS.png':    'pina-rodajas',
    'PIÑA RODAJA 1000.png':   'pina-rodajas-1000g',
    'PIÑA CUBO.png':          'pina-cubos',
    'piña cubo 1.png':        'pina-cubos-1',
    'PIÑA TROZOS.png':        'pina-trozos',
    // Elaborados
    'GLASE DE FRESA.png':     'glase-fresa',
    'GLASE DE MORA.png':      'glase-mora',
    'MERMELADA MORA 1.png':   'mermelada-mora',
    'mermelada de mora.png':  'mermelada-mora-alt',
    // Extra gallery images (for additional product images)
    'FRESAS.png':             'fresas-galeria',
    'FRESA 1.png':            'fresa-1-galeria',
    '2 FRESA 500.png':        'fresa-500-alt',
    'BREVAS 1.png':           'brevas-1-galeria',
    'BREVAS 2.png':           'brevas-2-galeria',
    'DURAZNO 2.png':          'durazno-2-galeria',
    'DURAZNO 3.png':          'durazno-3-galeria',
    'DURAZNO 4.png':          'durazno-4-galeria',
    'PIÑA 1.png':             'pina-1-galeria',
    'PIÑA 3.png':             'pina-3-galeria',
    'PIÑA 4.png':             'pina-4-galeria',
    'PIÑA 5.png':             'pina-5-galeria',
    'PIÑA 6.png':             'pina-6-galeria',
    'PIÑA 7.png':             'pina-7-galeria',
    'PIÑA 8.png':             'pina-8-galeria',
    'piña 1000g.png':         'pina-1000g-alt',
    'PIÑA EN RODAJA 1.png':   'pina-rodaja-1',
    'PIÑA EN RODAJA 2.png':   'pina-rodaja-2',
    'PIÑA EN RODAJAS 3.png':  'pina-rodajas-3',
    'GLASSE FRESA.png':       'glase-fresa-alt',
    'GLASE MORA.png':         'glase-mora-alt',
}

// ── Logger ───────────────────────────────────────────────────

function log(icon: string, msg: string) {
    console.log(`  ${icon} ${msg}`)
}

// ── Medusa Auth ──────────────────────────────────────────────

let jwt = ''

async function login(): Promise<void> {
    const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })
    if (!res.ok) throw new Error(`Login failed: ${res.status}`)
    const data = await res.json() as { token?: string }
    if (!data.token) throw new Error('No token returned')
    jwt = data.token
}

// ── Upload to Medusa ─────────────────────────────────────────

async function uploadImage(filePath: string, slug: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath)
    const fileName = `${slug}.png`

    // Medusa v2 upload endpoint expects multipart/form-data
    const boundary = '----CampiFruitUpload' + Date.now()
    const CRLF = '\r\n'

    const header = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="files"; filename="${fileName}"`,
        `Content-Type: image/png`,
        '',
    ].join(CRLF)

    const footer = `${CRLF}--${boundary}--${CRLF}`

    const headerBuffer = Buffer.from(header + CRLF)
    const footerBuffer = Buffer.from(footer)
    const body = Buffer.concat([headerBuffer, fileBuffer, footerBuffer])

    const res = await fetch(`${MEDUSA_URL}/admin/uploads`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`)
    }

    const data = await res.json() as { files: Array<{ id: string; url: string }> }
    return data.files?.[0]?.url || ''
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2)
    const dryRun = args.includes('--dry-run')

    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('  📸 CAMPIFRUIT IMAGE UPLOADER')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  Source:   ${SOURCE_DIR}`)
    console.log(`  Medusa:   ${MEDUSA_URL}`)
    console.log(`  Mode:     ${dryRun ? 'DRY RUN' : 'UPLOAD'}`)
    console.log(`  Images:   ${Object.keys(IMAGE_MAP).length} mapped`)
    console.log('')

    // Validate source directory
    if (!fs.existsSync(SOURCE_DIR)) {
        log('❌', `Source directory not found: ${SOURCE_DIR}`)
        process.exit(1)
    }

    // List available files — normalize Unicode (macOS uses NFD, our map keys are NFC)
    const allFilesRaw = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'))
    // Build NFC → original filename map for lookup
    const nfcToOriginal = new Map<string, string>()
    for (const f of allFilesRaw) {
        nfcToOriginal.set(f.normalize('NFC'), f)
    }
    const allFiles = [...nfcToOriginal.keys()]
    log('📂', `Found ${allFiles.length} PNG files in source`)

    // Filter to mapped files (normalize map keys to NFC too)
    const filesToUpload: Array<[string, string, string]> = [] // [mapKey, originalFilename, slug]
    for (const [filename, slug] of Object.entries(IMAGE_MAP)) {
        const nfc = filename.normalize('NFC')
        const original = nfcToOriginal.get(nfc)
        if (!original) {
            log('⚠️', `Mapped file not found: ${filename}`)
        } else {
            filesToUpload.push([filename, original, slug])
        }
    }

    log('📋', `${filesToUpload.length} files to upload`)
    console.log('')

    if (dryRun) {
        for (const [mapKey, originalFilename, slug] of filesToUpload) {
            const stat = fs.statSync(path.join(SOURCE_DIR, originalFilename))
            log('📄', `${mapKey} → ${slug} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`)
        }
        console.log('\n  ℹ️  Dry run complete. Remove --dry-run to upload.')
        return
    }

    // Authenticate
    log('🔑', 'Logging into Medusa...')
    await login()
    log('✅', 'Authenticated')
    console.log('')

    // Upload each image
    const urlMap: Record<string, string> = {}
    let success = 0
    let failed = 0

    for (const [mapKey, originalFilename, slug] of filesToUpload) {
        const filePath = path.join(SOURCE_DIR, originalFilename)
        const stat = fs.statSync(filePath)
        const sizeMB = (stat.size / 1024 / 1024).toFixed(1)

        process.stdout.write(`  📸 ${mapKey} (${sizeMB}MB) → `)

        try {
            const url = await uploadImage(filePath, slug)
            urlMap[slug] = url
            console.log(`✅ ${url}`)
            success++
        } catch (err) {
            console.log(`❌ ${err instanceof Error ? err.message : err}`)
            failed++
        }
    }

    // Write URL map to a JSON file for seed-demo.ts to consume
    const mapPath = path.resolve(__dirname, 'campifruit-image-urls.json')
    fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2))

    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  🎉 UPLOAD COMPLETE`)
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  Success:    ${success}`)
    console.log(`  Failed:     ${failed}`)
    console.log(`  URL map:    ${mapPath}`)
    console.log('═══════════════════════════════════════════════════════════════')
}

main().catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
})
