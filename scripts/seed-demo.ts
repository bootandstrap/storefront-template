#!/usr/bin/env tsx
/**
 * seed-demo.ts — SOTA Local Demo Seeder
 *
 * Rewritten 2026-03-24 to replicate BSWEB/seed-business-data.ts pattern.
 * Clean → Categories → Products → Customers → Orders → Governance.
 *
 * Uses the fresh-produce template data (20 products, 6 categories) inlined
 * from BSWEB/industry-templates.ts (cross-repo import not possible).
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts                  # Full seed (clean + seed all)
 *   npx tsx scripts/seed-demo.ts --clean-only     # Just wipe products (no re-seed)
 *   npx tsx scripts/seed-demo.ts --skip-orders    # Seed products but skip orders
 *   npx tsx scripts/seed-demo.ts --template=fashion  # (future: different template)
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

// ── Types (mirroring industry-templates.ts) ──────────────────

interface CategoryDef {
    name: string
    handle: string
    description: string
}

interface VariantDef {
    title: string
    sku: string
    prices: Array<{ amount: number; currency_code: string }>
}

interface ProductDef {
    title: string
    handle: string
    description: string
    category: string
    variants: VariantDef[]
    weight?: number
    thumbnail?: string
}

interface DemoTemplate {
    id: string
    name: string
    storeName: string
    categories: CategoryDef[]
    products: ProductDef[]
}

// ── Fresh-Produce Template (from BSWEB industry-templates.ts) ─

const FRESH_PRODUCE: DemoTemplate = {
    id: 'fresh-produce',
    name: 'Frutas y Verduras',
    storeName: 'Frutas Frescas del Campo',
    categories: [
        { name: 'Frutas Frescas', handle: 'frutas-frescas', description: 'Frutas de temporada recién recolectadas' },
        { name: 'Verduras', handle: 'verduras', description: 'Verduras frescas del huerto' },
        { name: 'Cestas y Packs', handle: 'cestas-packs', description: 'Cestas variadas y packs familiares' },
        { name: 'Productos Artesanos', handle: 'artesanos', description: 'Mermeladas, aceites y conservas artesanales' },
        { name: 'Frutos Secos', handle: 'frutos-secos', description: 'Frutos secos y semillas seleccionados' },
        { name: 'Lácteos y Huevos', handle: 'lacteos-huevos', description: 'Lácteos frescos y huevos de corral' },
    ],
    products: [
        {
            title: 'Naranjas Valencia', handle: 'naranjas-valencia',
            description: 'Naranjas dulces de Valencia, ideales para zumo y mesa. Recolectadas a mano.',
            category: 'frutas-frescas', weight: 5000,
            thumbnail: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=800&q=80&fit=crop',
            variants: [
                { title: '5 kg', sku: 'NAR-VAL-5', prices: [{ amount: 1290, currency_code: 'eur' }, { amount: 1350, currency_code: 'chf' }] },
                { title: '10 kg', sku: 'NAR-VAL-10', prices: [{ amount: 2190, currency_code: 'eur' }, { amount: 2290, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Fresas Ecológicas', handle: 'fresas-ecologicas',
            description: 'Fresas cultivadas sin pesticidas. Dulces, aromáticas y de temporada.',
            category: 'frutas-frescas', weight: 500,
            thumbnail: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&q=80&fit=crop',
            variants: [
                { title: '500g', sku: 'FRE-ECO-500', prices: [{ amount: 490, currency_code: 'eur' }, { amount: 520, currency_code: 'chf' }] },
                { title: '1 kg', sku: 'FRE-ECO-1K', prices: [{ amount: 890, currency_code: 'eur' }, { amount: 950, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Aguacates Hass', handle: 'aguacates-hass',
            description: 'Aguacates Hass de Málaga, en su punto óptimo de maduración.',
            category: 'frutas-frescas', weight: 1000,
            thumbnail: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&q=80&fit=crop',
            variants: [
                { title: '4 unidades', sku: 'AGU-HAS-4', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
                { title: '8 unidades', sku: 'AGU-HAS-8', prices: [{ amount: 1190, currency_code: 'eur' }, { amount: 1250, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Tomates Raf', handle: 'tomates-raf',
            description: 'El rey de los tomates. Sabor intenso, textura firme. Almería.',
            category: 'verduras', weight: 2000,
            thumbnail: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=800&q=80&fit=crop',
            variants: [
                { title: '1 kg', sku: 'TOM-RAF-1K', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
                { title: '2 kg', sku: 'TOM-RAF-2K', prices: [{ amount: 1190, currency_code: 'eur' }, { amount: 1250, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Espárragos Verdes', handle: 'esparragos-verdes',
            description: 'Espárragos verdes frescos de Navarra. Ideales para plancha o vapor.',
            category: 'verduras', weight: 500,
            thumbnail: 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=800&q=80&fit=crop',
            variants: [
                { title: 'Manojo (500g)', sku: 'ESP-VER-500', prices: [{ amount: 390, currency_code: 'eur' }, { amount: 420, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Cesta Familiar Semanal', handle: 'cesta-familiar',
            description: 'Selección semanal de frutas y verduras de temporada. 8-10 variedades.',
            category: 'cestas-packs', weight: 8000,
            thumbnail: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&q=80&fit=crop',
            variants: [
                { title: 'Estándar (6 kg)', sku: 'CST-FAM-STD', prices: [{ amount: 2990, currency_code: 'eur' }, { amount: 3150, currency_code: 'chf' }] },
                { title: 'Grande (10 kg)', sku: 'CST-FAM-GRD', prices: [{ amount: 4490, currency_code: 'eur' }, { amount: 4690, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Aceite de Oliva Virgen Extra', handle: 'aceite-oliva-aove',
            description: 'AOVE de primera prensa en frío. Variedad picual, cosecha temprana. Jaén.',
            category: 'artesanos', weight: 500,
            thumbnail: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80&fit=crop',
            variants: [
                { title: '500 ml', sku: 'ACE-OLV-500', prices: [{ amount: 890, currency_code: 'eur' }, { amount: 940, currency_code: 'chf' }] },
                { title: '1 litro', sku: 'ACE-OLV-1L', prices: [{ amount: 1490, currency_code: 'eur' }, { amount: 1570, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Almendras Marcona', handle: 'almendras-marcona',
            description: 'Almendras marcona tostadas, la variedad más apreciada del Mediterráneo.',
            category: 'frutos-secos', weight: 500,
            thumbnail: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=80&fit=crop',
            variants: [
                { title: '250g', sku: 'ALM-MAR-250', prices: [{ amount: 590, currency_code: 'eur' }, { amount: 620, currency_code: 'chf' }] },
                { title: '500g', sku: 'ALM-MAR-500', prices: [{ amount: 990, currency_code: 'eur' }, { amount: 1050, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Huevos de Corral', handle: 'huevos-corral',
            description: 'Huevos de gallinas criadas en libertad. Yema intensa y sabor auténtico.',
            category: 'lacteos-huevos', weight: 750,
            thumbnail: 'https://images.unsplash.com/photo-1569288052389-dac9b01c9c05?w=800&q=80&fit=crop',
            variants: [
                { title: 'Docena (12)', sku: 'HUE-COR-12', prices: [{ amount: 490, currency_code: 'eur' }, { amount: 520, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Queso Manchego Curado', handle: 'queso-manchego',
            description: 'Queso manchego D.O. curado 6 meses. Leche cruda de oveja manchega.',
            category: 'lacteos-huevos', weight: 350,
            thumbnail: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&q=80&fit=crop',
            variants: [
                { title: 'Cuña 350g', sku: 'QUE-MAN-350', prices: [{ amount: 990, currency_code: 'eur' }, { amount: 1050, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Miel de Azahar', handle: 'miel-azahar',
            description: 'Miel cruda de azahar recolectada en colmenas de la Ribera. Floral y suave.',
            category: 'artesanos', weight: 500,
            thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80&fit=crop',
            variants: [
                { title: 'Tarro 500g', sku: 'MIL-AZH-500', prices: [{ amount: 790, currency_code: 'eur' }, { amount: 840, currency_code: 'chf' }] },
                { title: 'Tarro 1 kg', sku: 'MIL-AZH-1K', prices: [{ amount: 1390, currency_code: 'eur' }, { amount: 1460, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Mermelada Naranja Amarga', handle: 'mermelada-naranja',
            description: 'Elaborada artesanalmente con naranjas amargas de Sevilla. Sin conservantes.',
            category: 'artesanos', weight: 340,
            thumbnail: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80&fit=crop',
            variants: [
                { title: 'Tarro 340g', sku: 'MER-NAR-340', prices: [{ amount: 590, currency_code: 'eur' }, { amount: 620, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Setas Shiitake Frescas', handle: 'setas-shiitake',
            description: 'Shiitake cultivadas en roble. Sabor umami intenso, textura carnosa.',
            category: 'verduras', weight: 250,
            thumbnail: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=800&q=80&fit=crop',
            variants: [
                { title: '250g', sku: 'SET-SHI-250', prices: [{ amount: 490, currency_code: 'eur' }, { amount: 520, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Hierbas Aromáticas Frescas', handle: 'hierbas-aromaticas',
            description: 'Mix de albahaca, perejil, cilantro y menta. Cultivo ecológico en maceta.',
            category: 'verduras', weight: 100,
            thumbnail: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80&fit=crop',
            variants: [
                { title: 'Mix 4 variedades', sku: 'HIE-ARO-MIX', prices: [{ amount: 390, currency_code: 'eur' }, { amount: 420, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Arándanos Ecológicos', handle: 'arandanos-eco',
            description: 'Arándanos frescos de Huelva. Ricos en antioxidantes y vitamina C.',
            category: 'frutas-frescas', weight: 250,
            thumbnail: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=800&q=80&fit=crop',
            variants: [
                { title: '250g', sku: 'ARA-ECO-250', prices: [{ amount: 390, currency_code: 'eur' }, { amount: 420, currency_code: 'chf' }] },
                { title: '500g', sku: 'ARA-ECO-500', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Pistachos Tostados', handle: 'pistachos-tostados',
            description: 'Pistachos de Castilla-La Mancha, tostados con toque de sal.',
            category: 'frutos-secos', weight: 300,
            thumbnail: 'https://images.unsplash.com/photo-1525706974897-17be3eb42472?w=800&q=80&fit=crop',
            variants: [
                { title: '300g', sku: 'PIS-TOS-300', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Nueces de Ronda', handle: 'nueces-ronda',
            description: 'Nueces seleccionadas de la Serranía de Ronda. Ricas en omega-3.',
            category: 'frutos-secos', weight: 500,
            thumbnail: 'https://images.unsplash.com/photo-1563412885-73de78e2e4f6?w=800&q=80&fit=crop',
            variants: [
                { title: '500g', sku: 'NUE-RON-500', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Yogur Natural Artesano', handle: 'yogur-artesano',
            description: 'Yogur de leche de pastoreo. Sin azúcares añadidos, cremoso y auténtico.',
            category: 'lacteos-huevos', weight: 500,
            thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80&fit=crop',
            variants: [
                { title: 'Pack 4 uds', sku: 'YOG-ART-4', prices: [{ amount: 390, currency_code: 'eur' }, { amount: 420, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Cesta Gourmet Premium', handle: 'cesta-gourmet',
            description: 'Selección premium: aguacates, cherry, rúcula, granada y kale.',
            category: 'cestas-packs', weight: 5000,
            thumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80&fit=crop',
            variants: [
                { title: 'Premium (5 kg)', sku: 'CST-GRM-5K', prices: [{ amount: 3990, currency_code: 'eur' }, { amount: 4190, currency_code: 'chf' }] },
            ],
        },
        {
            title: 'Vinagre de Jerez Reserva', handle: 'vinagre-jerez',
            description: 'Vinagre de Jerez D.O. envejecido en barricas de roble.',
            category: 'artesanos', weight: 375,
            thumbnail: 'https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?w=800&q=80&fit=crop',
            variants: [
                { title: 'Botella 375 ml', sku: 'VIN-JER-375', prices: [{ amount: 690, currency_code: 'eur' }, { amount: 720, currency_code: 'chf' }] },
            ],
        },
    ],
}

// ── Demo Customers ──────────────────────────────────────────

const DEMO_CUSTOMERS = [
    { first: 'María', last: 'García López', email: 'demo-customer-1@bootandstrap.demo' },
    { first: 'Carlos', last: 'Martínez Ruiz', email: 'demo-customer-2@bootandstrap.demo' },
    { first: 'Laura', last: 'Fernández Torres', email: 'demo-customer-3@bootandstrap.demo' },
    { first: 'Pablo', last: 'Sánchez Moreno', email: 'demo-customer-4@bootandstrap.demo' },
    { first: 'Ana', last: 'Rodríguez Jiménez', email: 'demo-customer-5@bootandstrap.demo' },
    { first: 'Javier', last: 'López Hernández', email: 'demo-customer-6@bootandstrap.demo' },
]

// ── Template Registry ────────────────────────────────────────

const TEMPLATES: Record<string, DemoTemplate> = {
    'fresh-produce': FRESH_PRODUCE,
}

// ── Medusa API Client ────────────────────────────────────────

class MedusaClient {
    private jwt = ''
    constructor(private readonly baseUrl: string) {}

    async login(email: string, password: string): Promise<void> {
        const res = await this.request<{ token?: string }>('/auth/user/emailpass', {
            body: { email, password },
        })
        if (!res.token) throw new Error('Medusa login failed — no token returned')
        this.jwt = res.token
    }

    async request<T = any>(
        endpoint: string,
        options: { method?: string; body?: object } = {}
    ): Promise<T> {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method: options.method ?? (options.body ? 'POST' : 'GET'),
            headers: {
                'Content-Type': 'application/json',
                ...(this.jwt ? { 'Authorization': `Bearer ${this.jwt}` } : {}),
            },
            ...(options.body && { body: JSON.stringify(options.body) }),
            signal: AbortSignal.timeout(30_000),
        })

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            if (res.status === 409) return { _conflict: true } as T
            throw new Error(`Medusa ${res.status} ${endpoint}: ${text.slice(0, 300)}`)
        }
        if (res.status === 204) return {} as T
        return res.json()
    }
}

// ── Logger ───────────────────────────────────────────────────

function log(icon: string, msg: string) {
    console.log(`  ${icon} ${msg}`)
}

// ── Step 1: Clean Existing Data ──────────────────────────────

async function cleanExistingData(client: MedusaClient): Promise<void> {
    log('🧹', 'Cleaning existing data...')

    // Delete all products first (FK → categories)
    let deletedProducts = 0
    try {
        const { products } = await client.request<{ products: Array<{ id: string; title: string }> }>(
            '/admin/products?limit=100&fields=id,title'
        )
        if (products?.length) {
            for (const p of products) {
                try {
                    await client.request(`/admin/products/${p.id}`, { method: 'DELETE' })
                    deletedProducts++
                } catch { /* skip individual errors */ }
            }
            log('🧹', `Deleted ${deletedProducts}/${products.length} products`)
        }
    } catch (err) {
        log('⚠️', `Product cleanup: ${err instanceof Error ? err.message : err}`)
    }

    // Delete all categories
    let deletedCategories = 0
    try {
        const { product_categories } = await client.request<{ product_categories: Array<{ id: string; name: string }> }>(
            '/admin/product-categories?limit=100&fields=id,name'
        )
        if (product_categories?.length) {
            for (const c of product_categories) {
                try {
                    await client.request(`/admin/product-categories/${c.id}`, { method: 'DELETE' })
                    deletedCategories++
                } catch { /* may have children */ }
            }
            log('🧹', `Deleted ${deletedCategories}/${product_categories.length} categories`)
        }
    } catch (err) {
        log('⚠️', `Category cleanup: ${err instanceof Error ? err.message : err}`)
    }

    if (deletedProducts === 0 && deletedCategories === 0) {
        log('✅', 'No stale data — fresh Medusa instance')
    }
}

// ── Step 2: Seed Categories ──────────────────────────────────

const categoryIdCache = new Map<string, string>()

async function seedCategories(client: MedusaClient, categories: CategoryDef[]): Promise<number> {
    let created = 0
    for (const cat of categories) {
        try {
            const { product_category } = await client.request<{ product_category: { id: string } }>(
                '/admin/product-categories',
                { body: { name: cat.name, handle: cat.handle, description: cat.description, is_active: true, is_internal: false } }
            )
            categoryIdCache.set(cat.handle, product_category.id)
            created++
            log('✅', `Category: ${cat.name}`)
        } catch {
            // Already exists — look up
            const { product_categories } = await client.request<{ product_categories: Array<{ id: string; handle: string }> }>(
                `/admin/product-categories?handle=${cat.handle}`
            )
            if (product_categories?.[0]) {
                categoryIdCache.set(cat.handle, product_categories[0].id)
                log('⏭️', `Category: ${cat.name} (existing)`)
            }
        }
    }
    return created
}

// ── Step 3: Seed Products ────────────────────────────────────

async function seedProducts(client: MedusaClient, template: DemoTemplate, salesChannelId: string): Promise<number> {
    let created = 0

    for (const prod of template.products) {
        // Check if already exists
        const { products: existing } = await client.request<{ products: Array<{ id: string; thumbnail: string | null }> }>(
            `/admin/products?handle=${prod.handle}`
        )
        if (existing?.length) {
            // Update thumbnail if missing
            if (prod.thumbnail && !existing[0].thumbnail) {
                try {
                    await client.request(`/admin/products/${existing[0].id}`, {
                        body: { thumbnail: prod.thumbnail, images: [{ url: prod.thumbnail }] },
                    })
                    log('📸', `${prod.title} (updated thumbnail)`)
                } catch {
                    log('⏭️', `${prod.title} (existing)`)
                }
            } else {
                log('⏭️', `${prod.title} (existing)`)
            }
            continue
        }

        try {
            const categoryId = categoryIdCache.get(prod.category)
            await client.request('/admin/products', {
                body: {
                    title: prod.title,
                    handle: prod.handle,
                    description: prod.description,
                    status: 'published',
                    weight: prod.weight,
                    ...(prod.thumbnail ? { thumbnail: prod.thumbnail, images: [{ url: prod.thumbnail }] } : {}),
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
            created++
            log('✅', `${prod.title} (${prod.variants.length} variants)`)
        } catch (err) {
            log('⚠️', `${prod.title}: ${err instanceof Error ? err.message : err}`)
        }
    }

    return created
}

// ── Step 4: Seed Demo Customers ──────────────────────────────

async function seedCustomers(client: MedusaClient): Promise<number> {
    let created = 0

    for (const cust of DEMO_CUSTOMERS) {
        try {
            const { customers } = await client.request<{ customers: Array<{ id: string; email: string }> }>(
                `/admin/customers?q=${cust.email}`
            )
            if (customers?.find(c => c.email === cust.email)) {
                log('⏭️', `Customer: ${cust.first} ${cust.last} (existing)`)
                continue
            }

            await client.request('/admin/customers', {
                body: { email: cust.email, first_name: cust.first, last_name: cust.last },
            })
            created++
            log('✅', `Customer: ${cust.first} ${cust.last}`)
        } catch (err) {
            log('⚠️', `Customer ${cust.first}: ${err instanceof Error ? err.message : err}`)
        }
    }

    return created
}

// ── Step 5: Seed Demo Orders ─────────────────────────────────

async function seedOrders(client: MedusaClient, regionId: string, count: number = 10): Promise<number> {
    // Fetch products + variants for order items
    const { products } = await client.request<{
        products: Array<{
            id: string
            title: string
            variants: Array<{ id: string; title: string }>
        }>
    }>('/admin/products?limit=50')

    if (!products?.length) {
        log('⚠️', 'No products available — cannot create orders')
        return 0
    }

    // Fetch customers
    const { customers } = await client.request<{
        customers: Array<{ id: string; email: string }>
    }>('/admin/customers?limit=20')

    let created = 0
    const now = Date.now()

    for (let i = 0; i < count; i++) {
        try {
            // Pick random product and variant
            const product = products[Math.floor(Math.random() * products.length)]
            const variant = product.variants?.[Math.floor(Math.random() * (product.variants?.length || 1))]
            if (!variant) continue

            // Pick random customer (or fallback email)
            const customer = customers?.length
                ? customers[Math.floor(Math.random() * customers.length)]
                : null

            // Spread orders over last 30 days
            const daysAgo = Math.floor(Math.random() * 30)
            const orderDate = new Date(now - daysAgo * 86_400_000)

            const { draft_order } = await client.request<{ draft_order: { id: string } }>(
                '/admin/draft-orders',
                {
                    body: {
                        region_id: regionId,
                        ...(customer ? { customer_id: customer.id } : {
                            email: `order-${i + 1}@demo.local`,
                        }),
                        items: [{
                            variant_id: variant.id,
                            quantity: Math.floor(Math.random() * 3) + 1,
                        }],
                        shipping_methods: [],
                        metadata: {
                            demo_seed: true,
                            seed_date: orderDate.toISOString(),
                            seed_index: i,
                        },
                    },
                }
            )

            if (draft_order?.id) {
                created++
                if (created % 5 === 0 || created === count) {
                    log('✅', `Orders: ${created}/${count} created`)
                }
            }
        } catch (err) {
            log('⚠️', `Order #${i + 1}: ${err instanceof Error ? err.message : err}`)
        }
    }

    return created
}

// ── Step 6: Stock Location Setup ─────────────────────────────

async function ensureStockLocation(client: MedusaClient, salesChannelId: string): Promise<string | undefined> {
    try {
        const { stock_locations } = await client.request<{ stock_locations: Array<{ id: string }> }>('/admin/stock-locations')
        let stockLocationId = stock_locations?.[0]?.id

        if (!stockLocationId) {
            const { stock_location } = await client.request<{ stock_location: { id: string } }>('/admin/stock-locations', {
                body: { name: 'Almacén Principal', address: { country_code: 'es' } },
            })
            stockLocationId = stock_location?.id
            log('✅', `Stock location created: ${stockLocationId}`)
        } else {
            log('✅', `Stock location: ${stockLocationId}`)
        }

        // Link to sales channel (idempotent)
        if (stockLocationId) {
            await client.request(`/admin/stock-locations/${stockLocationId}/sales-channels`, {
                body: { add: [salesChannelId] },
            })
            log('✅', 'Stock location linked to sales channel')
        }

        return stockLocationId
    } catch (err) {
        log('⚠️', `Stock location: ${err instanceof Error ? err.message : err}`)
        return undefined
    }
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

async function main() {
    const args = process.argv.slice(2)
    const cleanOnly = args.includes('--clean-only')
    const skipOrders = args.includes('--skip-orders')
    const templateArg = args.find(a => a.startsWith('--template='))?.split('=')[1] || 'fresh-produce'

    const template = TEMPLATES[templateArg]
    if (!template) {
        console.error(`❌ Unknown template: "${templateArg}". Available: ${Object.keys(TEMPLATES).join(', ')}`)
        process.exit(1)
    }

    const MEDUSA_URL = process.env.MEDUSA_ADMIN_URL || process.env.MEDUSA_URL || 'http://localhost:9000'
    const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || 'admin@medusa-test.com'
    const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || 'supersecret'
    const TENANT_ID = process.env.TENANT_ID || ''

    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  🌱 DEMO SEEDER — ${template.name}`)
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  Template:   ${template.id} (${template.products.length} products, ${template.categories.length} categories)`)
    console.log(`  Medusa:     ${MEDUSA_URL}`)
    console.log(`  Mode:       ${cleanOnly ? 'CLEAN ONLY' : skipOrders ? 'PRODUCTS ONLY' : 'FULL (products + customers + orders)'}`)
    if (TENANT_ID) console.log(`  Tenant:     ${TENANT_ID}`)
    console.log('')

    const startTime = performance.now()
    const client = new MedusaClient(MEDUSA_URL)

    // ── Login ──
    log('🔑', `Logging into Medusa...`)
    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        log('✅', 'Authenticated')
    } catch (err) {
        log('❌', `Login failed: ${err instanceof Error ? err.message : err}`)
        log('💡', 'Make sure Medusa is running and admin user exists')
        process.exit(1)
    }

    // ── Clean ──
    await cleanExistingData(client)
    if (cleanOnly) {
        const elapsed = Math.round(performance.now() - startTime)
        console.log(`\n  ✅ Clean complete (${elapsed}ms)`)
        return
    }

    // ── Store Config ──
    const { stores } = await client.request<{ stores: Array<{ id: string }> }>('/admin/stores')
    const storeId = stores?.[0]?.id
    if (storeId) {
        await client.request(`/admin/stores/${storeId}`, {
            method: 'POST',
            body: { name: template.storeName },
        })
        log('✅', `Store name: "${template.storeName}"`)
    }

    // ── Sales Channel ──
    const { sales_channels } = await client.request<{ sales_channels: Array<{ id: string }> }>('/admin/sales-channels')
    const salesChannelId = sales_channels?.[0]?.id
    if (!salesChannelId) {
        log('❌', 'No sales channel found — Medusa not fully initialized')
        process.exit(1)
    }
    log('✅', `Sales channel: ${salesChannelId}`)

    // ── Region ──
    const { regions } = await client.request<{ regions: Array<{ id: string; name: string }> }>('/admin/regions')
    const regionId = regions?.[0]?.id
    if (!regionId) {
        log('❌', 'No region found')
        process.exit(1)
    }
    log('✅', `Region: ${regionId}`)

    // ── Stock Location ──
    await ensureStockLocation(client, salesChannelId)

    // ── Seed Categories ──
    console.log('\n  ── Categories ──')
    const categoriesSeeded = await seedCategories(client, template.categories)

    // ── Seed Products ──
    console.log('\n  ── Products ──')
    const productsSeeded = await seedProducts(client, template, salesChannelId)

    // ── Seed Customers ──
    let customersSeeded = 0
    if (!skipOrders) {
        console.log('\n  ── Customers ──')
        customersSeeded = await seedCustomers(client)
    }

    // ── Seed Orders ──
    let ordersSeeded = 0
    if (!skipOrders) {
        console.log('\n  ── Orders ──')
        ordersSeeded = await seedOrders(client, regionId, 10)
    }

    // ── Governance ──
    // seedGovernance is self-sufficient: auto-provisions tenant if TENANT_ID is missing
    console.log('\n  ── Governance ──')
    try {
        const { seedGovernance } = require('./seed-governance')
        const effectiveTenantId = await seedGovernance(TENANT_ID || null, template.id, log)
        if (effectiveTenantId && !TENANT_ID) {
            log('📝', `TENANT_ID auto-provisioned: ${effectiveTenantId}`)
            log('💡', 'Written to .env — restart storefront to pick it up')
        }
    } catch (err) {
        log('⚠️', `Governance: ${err instanceof Error ? err.message : err}`)
    }

    // ── Summary ──
    const elapsed = Math.round(performance.now() - startTime)
    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  🎉 DEMO SEED COMPLETE`)
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  Template:     ${template.name} (${template.id})`)
    console.log(`  Categories:   ${categoriesSeeded} created, ${template.categories.length} total`)
    console.log(`  Products:     ${productsSeeded} created, ${template.products.length} total`)
    console.log(`  Customers:    ${customersSeeded} created`)
    console.log(`  Orders:       ${ordersSeeded} created`)
    console.log(`  Time:         ${elapsed}ms (${(elapsed / 1000).toFixed(1)}s)`)
    console.log('')
    console.log('  📋 Next steps:')
    console.log('     1. Open storefront:  http://localhost:3000/es')
    console.log('     2. Owner panel:      http://localhost:3000/es/panel')
    console.log('     3. POS:              http://localhost:3000/es/panel/pos')
    console.log('═══════════════════════════════════════════════════════════════')
}

main().catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
})
