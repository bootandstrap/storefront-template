#!/usr/bin/env tsx
/**
 * Seed Demo Data — Populates a local Medusa instance with realistic test data.
 *
 * Creates:
 *   • 1 Store config (name, default region, default sales channel)
 *   • 1 Region (Europe) with countries + currency
 *   • 1 Sales Channel linked to publishable API key
 *   • 1 Stock Location + Fulfillment Set + Service Zone
 *   • 1 Shipping Option (Standard Delivery)
 *   • 4 Product Categories
 *   • 12 Products with variants and pricing
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts               # Seed (default: http://localhost:9000)
 *   MEDUSA_URL=http://... npx tsx scripts/seed-demo.ts
 *
 * Idempotent: checks for existing data before creating.
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env manually (no dotenv dependency required)
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

const MEDUSA_URL = process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusajs.com'
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || 'supersecret'

// ── Helpers ─────────────────────────────────────────────

let JWT = ''

async function api<T = any>(
    endpoint: string,
    options: { method?: string; body?: object } = {}
): Promise<T> {
    const res = await fetch(`${MEDUSA_URL}${endpoint}`, {
        method: options.method ?? (options.body ? 'POST' : 'GET'),
        headers: {
            'Content-Type': 'application/json',
            ...(JWT ? { 'Authorization': `Bearer ${JWT}` } : {}),
        },
        ...(options.body && { body: JSON.stringify(options.body) }),
        signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        // Don't throw for 409 (already exists) — handle in caller
        if (res.status === 409) return { _conflict: true } as T
        throw new Error(`Medusa ${res.status} ${endpoint}: ${text.slice(0, 300)}`)
    }
    if (res.status === 204) return {} as T
    return res.json()
}

function log(icon: string, msg: string) {
    console.log(`  ${icon} ${msg}`)
}

// ── Data Definitions ────────────────────────────────────

const CATEGORIES = [
    { name: 'Frutas Frescas', handle: 'frutas-frescas', description: 'Frutas de temporada recién recolectadas' },
    { name: 'Verduras', handle: 'verduras', description: 'Verduras frescas del huerto' },
    { name: 'Cestas y Packs', handle: 'cestas-packs', description: 'Cestas variadas y packs familiares' },
    { name: 'Productos Artesanos', handle: 'artesanos', description: 'Mermeladas, aceites y conservas artesanales' },
    { name: 'Frutos Secos', handle: 'frutos-secos', description: 'Frutos secos y semillas seleccionados' },
    { name: 'Lácteos y Huevos', handle: 'lacteos-huevos', description: 'Lácteos frescos y huevos de corral' },
]

interface ProductDef {
    title: string
    handle: string
    description: string
    category: string // handle ref
    variants: Array<{
        title: string
        sku: string
        prices: Array<{ amount: number; currency_code: string }>
        manage_inventory?: boolean
    }>
    weight?: number
    thumbnail?: string
}

const PRODUCTS: ProductDef[] = [
    // ── Frutas ──
    {
        title: 'Naranjas Valencia',
        handle: 'naranjas-valencia',
        description: 'Naranjas dulces de Valencia, ideales para zumo y mesa. Recolectadas a mano, sin tratamientos post-cosecha.',
        category: 'frutas-frescas',
        weight: 5000,
        thumbnail: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=800&q=80&fit=crop',
        variants: [
            { title: '5 kg', sku: 'NAR-VAL-5', prices: [{ amount: 1290, currency_code: 'eur' }, { amount: 1350, currency_code: 'chf' }] },
            { title: '10 kg', sku: 'NAR-VAL-10', prices: [{ amount: 2190, currency_code: 'eur' }, { amount: 2290, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Fresas Ecológicas',
        handle: 'fresas-ecologicas',
        description: 'Fresas cultivadas sin pesticidas. Dulces, aromáticas y de temporada.',
        category: 'frutas-frescas',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&q=80&fit=crop',
        variants: [
            { title: '500g', sku: 'FRE-ECO-500', prices: [{ amount: 490, currency_code: 'eur' }, { amount: 520, currency_code: 'chf' }] },
            { title: '1 kg', sku: 'FRE-ECO-1K', prices: [{ amount: 890, currency_code: 'eur' }, { amount: 950, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Mangos Kent Premium',
        handle: 'mangos-kent',
        description: 'Mangos Kent importados, madurados al sol. Perfectos para smoothies y ensaladas tropicales.',
        category: 'frutas-frescas',
        weight: 1000,
        thumbnail: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80&fit=crop',
        variants: [
            { title: '2 unidades', sku: 'MAN-KNT-2', prices: [{ amount: 590, currency_code: 'eur' }, { amount: 620, currency_code: 'chf' }] },
            { title: '4 unidades', sku: 'MAN-KNT-4', prices: [{ amount: 1090, currency_code: 'eur' }, { amount: 1150, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Aguacates Hass',
        handle: 'aguacates-hass',
        description: 'Aguacates Hass de Málaga, en su punto óptimo de maduración. Cremosos y llenos de sabor.',
        category: 'frutas-frescas',
        weight: 1000,
        thumbnail: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&q=80&fit=crop',
        variants: [
            { title: '4 unidades', sku: 'AGU-HAS-4', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
            { title: '8 unidades', sku: 'AGU-HAS-8', prices: [{ amount: 1190, currency_code: 'eur' }, { amount: 1250, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Limones Ecológicos',
        handle: 'limones-ecologicos',
        description: 'Limones de cultivo ecológico con piel comestible. Perfectos para cocinar y cócteles.',
        category: 'frutas-frescas',
        weight: 2000,
        thumbnail: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=800&q=80&fit=crop',
        variants: [
            { title: '1 kg', sku: 'LIM-ECO-1K', prices: [{ amount: 390, currency_code: 'eur' }, { amount: 420, currency_code: 'chf' }] },
            { title: '3 kg', sku: 'LIM-ECO-3K', prices: [{ amount: 990, currency_code: 'eur' }, { amount: 1050, currency_code: 'chf' }] },
        ],
    },
    // ── Verduras ──
    {
        title: 'Tomates Raf',
        handle: 'tomates-raf',
        description: 'El rey de los tomates. Sabor intenso, textura firme. De la huerta de Almería.',
        category: 'verduras',
        weight: 2000,
        thumbnail: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=800&q=80&fit=crop',
        variants: [
            { title: '1 kg', sku: 'TOM-RAF-1K', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
            { title: '2 kg', sku: 'TOM-RAF-2K', prices: [{ amount: 1190, currency_code: 'eur' }, { amount: 1250, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Espárragos Verdes',
        handle: 'esparragos-verdes',
        description: 'Espárragos verdes frescos, ideales para plancha, vapor o ensaladas. Origen Navarra.',
        category: 'verduras',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=800&q=80&fit=crop',
        variants: [
            { title: 'Manojo (500g)', sku: 'ESP-VER-500', prices: [{ amount: 390, currency_code: 'eur' }, { amount: 420, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Pimientos del Padrón',
        handle: 'pimientos-padron',
        description: 'Unos pican y otros no. Los auténticos pimientos del Padrón gallegos.',
        category: 'verduras',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&q=80&fit=crop',
        variants: [
            { title: '500g', sku: 'PIM-PAD-500', prices: [{ amount: 350, currency_code: 'eur' }, { amount: 380, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Alcachofas de Tudela',
        handle: 'alcachofas-tudela',
        description: 'Alcachofas tiernas de la Ribera de Navarra. Ideales al horno, confitadas o en tortilla.',
        category: 'verduras',
        weight: 1000,
        thumbnail: 'https://images.unsplash.com/photo-1580294672675-91afc51e181e?w=800&q=80&fit=crop',
        variants: [
            { title: '6 unidades', sku: 'ALC-TUD-6', prices: [{ amount: 490, currency_code: 'eur' }, { amount: 520, currency_code: 'chf' }] },
            { title: '12 unidades', sku: 'ALC-TUD-12', prices: [{ amount: 890, currency_code: 'eur' }, { amount: 940, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Zanahorias Baby',
        handle: 'zanahorias-baby',
        description: 'Zanahorias baby crujientes y dulces. Perfectas para snacking saludable y ensaladas.',
        category: 'verduras',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&q=80&fit=crop',
        variants: [
            { title: '500g', sku: 'ZAN-BAB-500', prices: [{ amount: 290, currency_code: 'eur' }, { amount: 310, currency_code: 'chf' }] },
        ],
    },
    // ── Cestas ──
    {
        title: 'Cesta Familiar Semanal',
        handle: 'cesta-familiar',
        description: 'Selección semanal de frutas y verduras de temporada para toda la familia. 8-10 variedades.',
        category: 'cestas-packs',
        weight: 8000,
        thumbnail: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&q=80&fit=crop',
        variants: [
            { title: 'Estándar (6 kg)', sku: 'CST-FAM-STD', prices: [{ amount: 2990, currency_code: 'eur' }, { amount: 3150, currency_code: 'chf' }] },
            { title: 'Grande (10 kg)', sku: 'CST-FAM-GRD', prices: [{ amount: 4490, currency_code: 'eur' }, { amount: 4690, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Pack Smoothie',
        handle: 'pack-smoothie',
        description: 'Todo lo que necesitas para smoothies saludables: plátanos, fresas, espinacas, jengibre y limón.',
        category: 'cestas-packs',
        weight: 3000,
        thumbnail: 'https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=800&q=80&fit=crop',
        variants: [
            { title: 'Pack (3 kg)', sku: 'PCK-SMT-3K', prices: [{ amount: 1890, currency_code: 'eur' }, { amount: 1990, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Cesta Gourmet',
        handle: 'cesta-gourmet',
        description: 'Frutas y verduras premium: aguacates Hass, tomates cherry, rúcula, granada y kale.',
        category: 'cestas-packs',
        weight: 5000,
        thumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80&fit=crop',
        variants: [
            { title: 'Premium (5 kg)', sku: 'CST-GRM-5K', prices: [{ amount: 3990, currency_code: 'eur' }, { amount: 4190, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Pack Ensaladas',
        handle: 'pack-ensaladas',
        description: 'Todo para tus ensaladas: lechuga variada, tomate cherry, pepino, rábanos y vinagreta artesanal.',
        category: 'cestas-packs',
        weight: 2500,
        thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&fit=crop',
        variants: [
            { title: 'Pack 2.5 kg', sku: 'PCK-ENS-25K', prices: [{ amount: 1490, currency_code: 'eur' }, { amount: 1570, currency_code: 'chf' }] },
        ],
    },
    // ── Artesanos ──
    {
        title: 'Mermelada de Naranja Amarga',
        handle: 'mermelada-naranja',
        description: 'Elaborada artesanalmente con naranjas amargas de Sevilla. Sin conservantes.',
        category: 'artesanos',
        weight: 340,
        thumbnail: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80&fit=crop',
        variants: [
            { title: 'Tarro 340g', sku: 'MER-NAR-340', prices: [{ amount: 590, currency_code: 'eur' }, { amount: 620, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Aceite de Oliva Virgen Extra',
        handle: 'aceite-oliva-aove',
        description: 'AOVE de primera prensa en frío. Variedad picual, cosecha temprana. Jaén.',
        category: 'artesanos',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80&fit=crop',
        variants: [
            { title: '500 ml', sku: 'ACE-OLV-500', prices: [{ amount: 890, currency_code: 'eur' }, { amount: 940, currency_code: 'chf' }] },
            { title: '1 litro', sku: 'ACE-OLV-1L', prices: [{ amount: 1490, currency_code: 'eur' }, { amount: 1570, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Miel de Azahar',
        handle: 'miel-azahar',
        description: 'Miel cruda de azahar, recolectada en colmenas de la comarca de la Ribera. Floral y suave.',
        category: 'artesanos',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80&fit=crop',
        variants: [
            { title: 'Tarro 500g', sku: 'MIL-AZH-500', prices: [{ amount: 790, currency_code: 'eur' }, { amount: 840, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Vinagre de Jerez Reserva',
        handle: 'vinagre-jerez',
        description: 'Vinagre de Jerez D.O. envejecido en barricas de roble. Ideal para aliñar y cocinar.',
        category: 'artesanos',
        weight: 375,
        thumbnail: 'https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?w=800&q=80&fit=crop',
        variants: [
            { title: 'Botella 375 ml', sku: 'VIN-JER-375', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
        ],
    },
    // ── Frutos Secos ──
    {
        title: 'Almendras Marcona',
        handle: 'almendras-marcona',
        description: 'Almendras marcona tostadas, la variedad más apreciada del Mediterráneo. Crujientes y aromáticas.',
        category: 'frutos-secos',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=80&fit=crop',
        variants: [
            { title: '250g', sku: 'ALM-MAR-250', prices: [{ amount: 590, currency_code: 'eur' }, { amount: 620, currency_code: 'chf' }] },
            { title: '500g', sku: 'ALM-MAR-500', prices: [{ amount: 990, currency_code: 'eur' }, { amount: 1050, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Nueces de Ronda',
        handle: 'nueces-ronda',
        description: 'Nueces seleccionadas de los nogales de la Serranía de Ronda. Ricas en omega-3.',
        category: 'frutos-secos',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1563412885-73de78e2e4f6?w=800&q=80&fit=crop',
        variants: [
            { title: '500g', sku: 'NUE-RON-500', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Pistachos Tostados',
        handle: 'pistachos-tostados',
        description: 'Pistachos de Castilla-La Mancha, tostados con un toque de sal. Irresistibles.',
        category: 'frutos-secos',
        weight: 300,
        thumbnail: 'https://images.unsplash.com/photo-1525706974897-17be3eb42472?w=800&q=80&fit=crop',
        variants: [
            { title: '300g', sku: 'PIS-TOS-300', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
        ],
    },
    // ── Lácteos y Huevos ──
    {
        title: 'Huevos de Corral',
        handle: 'huevos-corral',
        description: 'Huevos de gallinas criadas en libertad. Yema intensa y sabor auténtico del campo.',
        category: 'lacteos-huevos',
        weight: 750,
        thumbnail: 'https://images.unsplash.com/photo-1569288052389-dac9b01c9c05?w=800&q=80&fit=crop',
        variants: [
            { title: 'Docena (12)', sku: 'HUE-COR-12', prices: [{ amount: 490, currency_code: 'eur' }, { amount: 520, currency_code: 'chf' }] },
            { title: 'Media docena (6)', sku: 'HUE-COR-6', prices: [{ amount: 290, currency_code: 'eur' }, { amount: 310, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Queso Manchego Curado',
        handle: 'queso-manchego',
        description: 'Queso manchego D.O. curado 6 meses. Elaborado con leche cruda de oveja manchega.',
        category: 'lacteos-huevos',
        weight: 350,
        thumbnail: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&q=80&fit=crop',
        variants: [
            { title: 'Cuña 350g', sku: 'QUE-MAN-350', prices: [{ amount: 990, currency_code: 'eur' }, { amount: 1050, currency_code: 'chf' }] },
            { title: 'Media rueda 1 kg', sku: 'QUE-MAN-1K', prices: [{ amount: 2490, currency_code: 'eur' }, { amount: 2620, currency_code: 'chf' }] },
        ],
    },
    {
        title: 'Yogur Natural Artesano',
        handle: 'yogur-artesano',
        description: 'Yogur natural elaborado con leche de pastoreo. Sin azúcares añadidos, cremoso y auténtico.',
        category: 'lacteos-huevos',
        weight: 500,
        thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80&fit=crop',
        variants: [
            { title: 'Pack 4 unidades', sku: 'YOG-ART-4', prices: [{ amount: 390, currency_code: 'eur' }, { amount: 420, currency_code: 'chf' }] },
        ],
    },
]

// ── Main ────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════')
    console.log('  🌱 SEED DEMO DATA')
    console.log(`  Target: ${MEDUSA_URL}`)
    console.log('═══════════════════════════════════════════════════\n')

    // ── 1. Login ──
    console.log('── Login ──')
    const loginRes = await api<{ token?: string }>('/auth/user/emailpass', {
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (!loginRes.token) {
        console.error('❌ Login failed. Is Medusa running? Check MEDUSA_ADMIN_EMAIL/PASSWORD.')
        process.exit(1)
    }
    JWT = loginRes.token
    log('✅', `Logged in as ${ADMIN_EMAIL}`)

    // ── 2. Store Config ──
    console.log('\n── Store ──')
    const { stores } = await api<{ stores: Array<{ id: string; name: string }> }>('/admin/stores')
    const store = stores?.[0]
    if (store) {
        await api(`/admin/stores/${store.id}`, {
            method: 'POST',
            body: { name: 'BootandStrap Demo Store' },
        })
        log('✅', `Store configured: ${store.id}`)
    }

    // ── 3. Sales Channel ──
    console.log('\n── Sales Channel ──')
    const { sales_channels } = await api<{ sales_channels: Array<{ id: string; name: string }> }>('/admin/sales-channels')
    let salesChannelId = sales_channels?.[0]?.id
    if (!salesChannelId) {
        const { sales_channel } = await api<{ sales_channel: { id: string } }>('/admin/sales-channels', {
            body: { name: 'Default', description: 'Default Sales Channel' },
        })
        salesChannelId = sales_channel.id
        log('✅', `Created sales channel: ${salesChannelId}`)
    } else {
        log('✅', `Existing sales channel: ${salesChannelId}`)
    }

    // ── 4. Link API Key → Sales Channel ──
    console.log('\n── API Key ──')
    const { api_keys } = await api<{ api_keys: Array<{ id: string; token: string; type: string }> }>('/admin/api-keys')
    const pubKey = api_keys?.find(k => k.type === 'publishable')
    if (pubKey) {
        try {
            await api(`/admin/api-keys/${pubKey.id}/sales-channels`, {
                body: { add: [salesChannelId] },
            })
        } catch { /* already linked */ }
        log('✅', `Publishable key: ${pubKey.token.slice(0, 20)}...`)
    }

    // ── 5. Region ──
    console.log('\n── Region ──')
    const { regions: existingRegions } = await api<{ regions: Array<{ id: string; name: string }> }>('/admin/regions')
    let regionId = existingRegions?.[0]?.id
    if (!regionId) {
        const { region } = await api<{ region: { id: string } }>('/admin/regions', {
            body: {
                name: 'Europe',
                currency_code: 'eur',
                countries: ['es', 'de', 'fr', 'it', 'pt', 'at', 'ch'],
            },
        })
        regionId = region.id
        log('✅', `Created region: ${regionId}`)
    } else {
        log('✅', `Existing region: ${regionId} (${existingRegions[0].name})`)
    }

    // Set default region on store
    if (store) {
        await api(`/admin/stores/${store.id}`, {
            method: 'POST',
            body: { default_region_id: regionId },
        })
    }

    // ── 6. Stock Location ──
    console.log('\n── Stock Location ──')
    const { stock_locations } = await api<{ stock_locations: Array<{ id: string; name: string }> }>('/admin/stock-locations')
    let stockLocationId = stock_locations?.[0]?.id
    if (!stockLocationId) {
        const { stock_location } = await api<{ stock_location: { id: string } }>('/admin/stock-locations', {
            body: {
                name: 'Almacén Principal',
                address: {
                    address_1: 'Calle del Huerto 1',
                    city: 'Valencia',
                    country_code: 'es',
                    postal_code: '46001',
                },
            },
        })
        stockLocationId = stock_location.id
        log('✅', `Created stock location: ${stockLocationId}`)
    } else {
        log('✅', `Existing stock location: ${stockLocationId}`)
    }

    // Link stock location to sales channel
    try {
        await api(`/admin/stock-locations/${stockLocationId}/sales-channels`, {
            body: { add: [salesChannelId] },
        })
    } catch { /* already linked */ }

    // ── 7. Fulfillment & Shipping ──
    // This section is wrapped in try/catch because the DB may already have
    // fulfillment data from a previous tenant (e.g., Campifruit).
    console.log('\n── Fulfillment & Shipping ──')
    try {
        // Fulfillment providers
        const { fulfillment_providers } = await api<{ fulfillment_providers: Array<{ id: string }> }>('/admin/fulfillment-providers')
        const manualProvider = fulfillment_providers?.find(p => p.id.includes('manual'))
        if (manualProvider) {
            log('✅', `Fulfillment provider: ${manualProvider.id}`)
        }

        // Create fulfillment set via stock location (the only supported way in Medusa v2)
        let fulfillmentSetId: string | undefined
        if (stockLocationId) {
            try {
                const { fulfillment_set } = await api<{ fulfillment_set: { id: string } }>(`/admin/stock-locations/${stockLocationId}/fulfillment-sets`, {
                    body: { name: 'Default Fulfillment', type: 'shipping' },
                })
                fulfillmentSetId = fulfillment_set.id
                log('✅', `Fulfillment set: ${fulfillmentSetId}`)
            } catch {
                // Already exists — fetch from stock location
                const slData = await api<{ stock_location: { fulfillment_sets?: Array<{ id: string }> } }>(
                    `/admin/stock-locations/${stockLocationId}?fields=fulfillment_sets.id`
                )
                fulfillmentSetId = slData.stock_location?.fulfillment_sets?.[0]?.id
                if (fulfillmentSetId) {
                    log('✅', `Fulfillment set (existing): ${fulfillmentSetId}`)
                }
            }
        }

        // Service zone
        if (fulfillmentSetId) {
            try {
                await api(`/admin/fulfillment-sets/${fulfillmentSetId}/service-zones`, {
                    body: {
                        name: 'Europe Zone',
                        geo_zones: [
                            { type: 'country', country_code: 'es' },
                            { type: 'country', country_code: 'de' },
                            { type: 'country', country_code: 'fr' },
                            { type: 'country', country_code: 'it' },
                            { type: 'country', country_code: 'ch' },
                        ],
                    },
                })
                log('✅', 'Service zone created')
            } catch { log('⏭️', 'Service zone (existing or conflict)') }
        }

        // Shipping profile
        const { shipping_profiles } = await api<{ shipping_profiles: Array<{ id: string }> }>('/admin/shipping-profiles')
        let shippingProfileId = shipping_profiles?.[0]?.id
        if (!shippingProfileId) {
            const { shipping_profile } = await api<{ shipping_profile: { id: string } }>('/admin/shipping-profiles', {
                body: { name: 'Default', type: 'default' },
            })
            shippingProfileId = shipping_profile.id
            log('✅', `Shipping profile: ${shippingProfileId}`)
        } else {
            log('✅', `Shipping profile (existing): ${shippingProfileId}`)
        }

        // Shipping option
        const { shipping_options } = await api<{ shipping_options: Array<{ id: string }> }>('/admin/shipping-options')
        if (shipping_options?.length) {
            log('✅', `Shipping options: ${shipping_options.length} existing`)
        } else if (manualProvider && fulfillmentSetId && shippingProfileId) {
            try {
                const fSetData = await api<{ fulfillment_set: { service_zones: Array<{ id: string }> } }>(
                    `/admin/fulfillment-sets/${fulfillmentSetId}?fields=service_zones.id`
                )
                const szId = fSetData.fulfillment_set?.service_zones?.[0]?.id
                if (szId) {
                    await api('/admin/shipping-options', {
                        body: {
                            name: 'Envío Estándar',
                            service_zone_id: szId,
                            shipping_profile_id: shippingProfileId,
                            provider_id: manualProvider.id,
                            price_type: 'flat',
                            type: { label: 'Standard', description: '3-5 días laborables', code: 'standard' },
                            prices: [{ amount: 490, currency_code: 'eur', region_id: regionId }],
                            rules: [],
                        },
                    })
                    log('✅', 'Shipping: Envío Estándar (€4.90)')
                }
            } catch (err) { log('⚠️', `Shipping option: ${err instanceof Error ? err.message : err}`) }
        }
    } catch (err) {
        log('⚠️', `Fulfillment setup (non-critical): ${err instanceof Error ? err.message : err}`)
    }

    // ── 8. Categories ──
    console.log('\n── Categories ──')
    const categoryMap: Record<string, string> = {}
    for (const cat of CATEGORIES) {
        try {
            const { product_category } = await api<{ product_category: { id: string } }>('/admin/product-categories', {
                body: { name: cat.name, handle: cat.handle, description: cat.description, is_active: true, is_internal: false },
            })
            categoryMap[cat.handle] = product_category.id
            log('✅', `${cat.name} → ${product_category.id}`)
        } catch (err) {
            // If already exists, find it
            const { product_categories } = await api<{ product_categories: Array<{ id: string; handle: string }> }>(`/admin/product-categories?handle=${cat.handle}`)
            if (product_categories?.[0]) {
                categoryMap[cat.handle] = product_categories[0].id
                log('⏭️', `${cat.name} (existing)`)
            } else {
                log('⚠️', `${cat.name}: ${err instanceof Error ? err.message : err}`)
            }
        }
    }

    // ── 9. Products ──
    console.log('\n── Products ──')
    for (const prod of PRODUCTS) {
        const { products: existing } = await api<{ products: Array<{ id: string; thumbnail: string | null }> }>(`/admin/products?handle=${prod.handle}`)
        if (existing?.length) {
            // Update thumbnail if product exists but has no image
            if (prod.thumbnail && !existing[0].thumbnail) {
                try {
                    await api(`/admin/products/${existing[0].id}`, {
                        body: {
                            thumbnail: prod.thumbnail,
                            images: [{ url: prod.thumbnail }],
                        },
                    })
                    log('📸', `${prod.title} (updated thumbnail)`)
                } catch {
                    log('⏭️', `${prod.title} (existing, thumbnail update failed)`)
                }
            } else {
                log('⏭️', `${prod.title} (existing)`)
            }
            continue
        }

        try {
            const categoryId = categoryMap[prod.category]
            const { product } = await api<{ product: { id: string; variants: Array<{ id: string }> } }>('/admin/products', {
                body: {
                    title: prod.title,
                    handle: prod.handle,
                    description: prod.description,
                    status: 'published',
                    weight: prod.weight,
                    ...(prod.thumbnail ? { thumbnail: prod.thumbnail } : {}),
                    ...(prod.thumbnail ? { images: [{ url: prod.thumbnail }] } : {}),
                    ...(categoryId ? { categories: [{ id: categoryId }] } : {}),
                    sales_channels: [{ id: salesChannelId }],
                    options: [{ title: 'Tamaño', values: prod.variants.map(v => v.title) }],
                    variants: prod.variants.map(v => ({
                        title: v.title,
                        sku: v.sku,
                        manage_inventory: false,
                        prices: v.prices,
                        options: { 'Tamaño': v.title },
                    })),
                },
            })
            log('✅', `${prod.title} (${prod.variants.length} variants) 📸`)
        } catch (err) {
            log('❌', `${prod.title}: ${err instanceof Error ? err.message : err}`)
        }
    }

    // ── Shared Supabase admin refs (used by Steps 10 + 11) ──
    const sbUrl = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    // ── 10. Tenant → Medusa scope mapping ──
    // Links the dev tenant to the sales channel so the owner panel dashboard
    // can query Medusa data correctly (product counts, orders, etc.)
    console.log('\n── Tenant Scope ──')
    const tenantId = process.env.TENANT_ID
    if (tenantId && salesChannelId) {
        if (sbUrl && sbKey) {
            try {
                const scopeRes = await fetch(`${sbUrl}/rest/v1/tenant_medusa_scope`, {
                    method: 'POST',
                    headers: {
                        'apikey': sbKey,
                        'Authorization': `Bearer ${sbKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates,return=representation',
                    },
                    body: JSON.stringify({
                        tenant_id: tenantId,
                        medusa_sales_channel_id: salesChannelId,
                    }),
                    signal: AbortSignal.timeout(10_000),
                })
                if (scopeRes.ok) {
                    log('✅', `Tenant ${tenantId.slice(0, 8)}... → ${salesChannelId}`)
                } else {
                    const errText = await scopeRes.text().catch(() => '')
                    log('⚠️', `Scope mapping failed: ${scopeRes.status} ${errText.slice(0, 200)}`)
                }
            } catch (err) {
                log('⚠️', `Scope mapping: ${err instanceof Error ? err.message : err}`)
            }
        } else {
            log('⏭️', 'Skipped (SUPABASE_URL or SERVICE_ROLE_KEY not set)')
        }
    } else {
        log('⏭️', `Skipped (TENANT_ID=${tenantId || 'not set'}, salesChannelId=${salesChannelId || 'not set'})`)
    }

    // ── 11. Demo Customer User ──
    // Creates a customer user for testing customer-facing features (cart, checkout,
    // orders, account page). Separate from the owner user (dev@bootandstrap.com).
    // Idempotent: checks if user already exists before creating.
    console.log('\n── Demo Customer ──')
    const DEMO_CUSTOMER_EMAIL = 'customer@demo.local'
    const DEMO_CUSTOMER_PASSWORD = 'demo123456'
    const DEMO_CUSTOMER_NAME = { first_name: 'María', last_name: 'García' }

    // sbUrl and sbKey declared above (shared with Step 10)

    // 11a. Create Supabase Auth user (needed for login flow)
    if (sbUrl && sbKey) {
        try {
            // Check if user already exists via Supabase admin API
            const listRes = await fetch(
                `${sbUrl}/auth/v1/admin/users?page=1&per_page=50`,
                {
                    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` },
                    signal: AbortSignal.timeout(10_000),
                }
            )
            const listData = await listRes.json()
            const existingUser = (listData.users ?? []).find(
                (u: { email?: string }) => u.email === DEMO_CUSTOMER_EMAIL
            )

            if (existingUser) {
                log('⏭️', `Supabase Auth: ${DEMO_CUSTOMER_EMAIL} (already exists)`)
            } else {
                const createRes = await fetch(`${sbUrl}/auth/v1/admin/users`, {
                    method: 'POST',
                    headers: {
                        'apikey': sbKey,
                        'Authorization': `Bearer ${sbKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: DEMO_CUSTOMER_EMAIL,
                        password: DEMO_CUSTOMER_PASSWORD,
                        email_confirm: true,
                        user_metadata: {
                            full_name: `${DEMO_CUSTOMER_NAME.first_name} ${DEMO_CUSTOMER_NAME.last_name}`,
                        },
                    }),
                    signal: AbortSignal.timeout(10_000),
                })
                if (createRes.ok) {
                    log('✅', `Supabase Auth: ${DEMO_CUSTOMER_EMAIL} created`)
                } else {
                    const errText = await createRes.text().catch(() => '')
                    // 422 = user already exists (race condition safety)
                    if (createRes.status === 422) {
                        log('⏭️', `Supabase Auth: ${DEMO_CUSTOMER_EMAIL} (already exists)`)
                    } else {
                        log('⚠️', `Supabase Auth: ${createRes.status} ${errText.slice(0, 200)}`)
                    }
                }
            }
        } catch (err) {
            log('⚠️', `Supabase Auth: ${err instanceof Error ? err.message : err}`)
        }
    } else {
        log('⏭️', 'Supabase Auth: skipped (no SUPABASE_URL or SERVICE_ROLE_KEY)')
    }

    // 11b. Create Medusa customer (needed for /store/orders, /store/customers/me)
    try {
        const { customers } = await api<{ customers: Array<{ id: string; email: string }> }>(
            `/admin/customers?q=${DEMO_CUSTOMER_EMAIL}`
        )
        const existing = customers?.find(c => c.email === DEMO_CUSTOMER_EMAIL)

        if (existing) {
            log('⏭️', `Medusa Customer: ${DEMO_CUSTOMER_EMAIL} (already exists: ${existing.id})`)
        } else {
            const { customer } = await api<{ customer: { id: string } }>('/admin/customers', {
                body: {
                    email: DEMO_CUSTOMER_EMAIL,
                    first_name: DEMO_CUSTOMER_NAME.first_name,
                    last_name: DEMO_CUSTOMER_NAME.last_name,
                },
            })
            log('✅', `Medusa Customer: ${DEMO_CUSTOMER_EMAIL} → ${customer.id}`)
        }
    } catch (err) {
        log('⚠️', `Medusa Customer: ${err instanceof Error ? err.message : err}`)
    }

    log('🔑', `Demo customer login: ${DEMO_CUSTOMER_EMAIL} / ${DEMO_CUSTOMER_PASSWORD}`)

    // ── Summary ──
    console.log('\n═══════════════════════════════════════════════════')
    console.log('  🌱 SEED COMPLETE')
    console.log('═══════════════════════════════════════════════════')
    console.log(`  Products:   ${PRODUCTS.length}`)
    console.log(`  Categories: ${CATEGORIES.length}`)
    console.log(`  Region:     ${regionId}`)
    console.log(`  Sales Channel: ${salesChannelId}`)
    if (pubKey) {
        console.log(`  Publishable Key: ${pubKey.token}`)
    }
    if (tenantId) {
        console.log(`  Tenant Scope: ${tenantId.slice(0, 8)}... → ${salesChannelId}`)
    }
    console.log('')
    console.log('  Storefront:   http://localhost:3000')
    console.log('  Medusa Admin: http://localhost:9000/app')
    console.log('═══════════════════════════════════════════════════')
}

main().catch(err => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
})
