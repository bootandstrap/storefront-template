#!/usr/bin/env npx tsx
/**
 * seed-content.ts — Seeds Supabase-stored content for demo tenants
 *
 * Handles carousel slides, CMS pages, promotions, chatbot FAQs,
 * and newsletter subscribers. These are stored in Supabase (not Medusa).
 *
 * Designed to run AFTER seed-demo.ts which handles Medusa products/orders.
 *
 * Usage:
 *   npx tsx scripts/seed-content.ts                        # All content types
 *   npx tsx scripts/seed-content.ts --only=carousel,pages  # Specific types
 *   npx tsx scripts/seed-content.ts --template=campifruit  # Use campifruit data
 *
 * Called automatically from seed-demo.ts when --full flag is used.
 *
 * @module scripts/seed-content
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

// ── Supabase Client ──────────────────────────────────────────

let createClient: typeof import('@supabase/supabase-js').createClient
try {
    createClient = require('@supabase/supabase-js').createClient
} catch {
    const storefrontPath = path.join(__dirname, '../apps/storefront/node_modules/@supabase/supabase-js')
    createClient = require(storefrontPath).createClient
}

function getSupabase() {
    const url = process.env.GOVERNANCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.GOVERNANCE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing GOVERNANCE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return createClient(url, key)
}

function log(icon: string, msg: string) {
    console.log(`  ${icon} ${msg}`)
}

// ── Content Data ─────────────────────────────────────────────

interface ContentTemplate {
    carousel: Array<{
        title: string
        subtitle: string
        image_url: string
        link_url: string
        sort_order: number
        active: boolean
    }>
    pages: Array<{
        title: string
        slug: string
        content: string
        published: boolean
        meta_title: string
        meta_description: string
    }>
    promotions: Array<{
        code: string
        description: string
        type: 'percentage' | 'fixed'
        value: number
        currency?: string
        min_order_amount?: number
        max_uses?: number
        is_disabled: boolean
        starts_at: string
        ends_at: string
    }>
    chatbot_faqs: Array<{
        question: string
        answer: string
        category: string
        sort_order: number
    }>
    newsletter_subscribers: Array<{
        email: string
        first_name: string
        subscribed: boolean
    }>
}

const CAMPIFRUIT_CONTENT: ContentTemplate = {
    carousel: [
        {
            title: '🍓 Fresas del Campo',
            subtitle: 'Frescas, dulces y naturales — directo de nuestra finca',
            image_url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=1200&q=80&fit=crop',
            link_url: '/es/productos?category=fresas',
            sort_order: 1,
            active: true,
        },
        {
            title: '🫐 Moras Artesanales',
            subtitle: 'Cultivo orgánico — ricas en antioxidantes',
            image_url: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=1200&q=80&fit=crop',
            link_url: '/es/productos?category=moras',
            sort_order: 2,
            active: true,
        },
        {
            title: '🍑 Temporada de Duraznos',
            subtitle: 'Madurados en la finca — jugosos y aromáticos',
            image_url: 'https://images.unsplash.com/photo-1595124421725-a7b24abe6935?w=1200&q=80&fit=crop',
            link_url: '/es/productos?category=duraznos',
            sort_order: 3,
            active: true,
        },
        {
            title: '🍍 Piña Gold Premium',
            subtitle: 'Cosechada en punto ideal — dulce y refrescante',
            image_url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=1200&q=80&fit=crop',
            link_url: '/es/productos?category=pina',
            sort_order: 4,
            active: true,
        },
    ],
    pages: [
        {
            title: 'Sobre Nosotros',
            slug: 'sobre-nosotros',
            content: `# Campifruit — Del Campo a tu Mesa

Somos una empresa familiar dedicada al cultivo y distribución de frutas frescas desde hace más de 15 años.

## Nuestra Historia

Nacimos en el corazón de la región cafetera de Colombia, donde la altitud y el clima crean condiciones perfectas para el cultivo de fresas, moras, brevas y duraznos.

## Nuestros Valores

- 🌱 **Cultivo responsable** — Prácticas sostenibles que respetan la tierra
- 🤝 **Comercio justo** — Trabajamos directamente con familias campesinas
- 🚚 **Frescura garantizada** — De la finca a tu puerta en menos de 24 horas
- ♻️ **Empaques eco-friendly** — Materiales 100% reciclables

## Certificaciones

Contamos con certificación BPA (Buenas Prácticas Agrícolas) y estamos en proceso de certificación orgánica.`,
            published: true,
            meta_title: 'Sobre Campifruit — Frutas Frescas del Campo',
            meta_description: 'Conoce la historia de Campifruit, empresa familiar dedicada al cultivo de frutas frescas en Colombia.',
        },
        {
            title: 'Política de Envíos',
            slug: 'envios',
            content: `# Política de Envíos

## Cobertura

Realizamos envíos a toda Colombia a través de servicio refrigerado.

## Tiempos de Entrega

| Zona | Tiempo |
|------|--------|
| Bogotá y alrededores | 12-24 horas |
| Principales ciudades | 24-48 horas |
| Otras zonas | 48-72 horas |

## Costo de Envío

- **Pedidos desde $50.000 COP**: Envío gratis
- **Pedidos menores**: $8.900 COP envío estándar

## Empaque

Todos nuestros productos van en empaque refrigerado para garantizar la cadena de frío.`,
            published: true,
            meta_title: 'Envíos — Campifruit',
            meta_description: 'Información sobre plazos, cobertura y costos de envío de frutas frescas.',
        },
        {
            title: 'Preguntas Frecuentes',
            slug: 'faq',
            content: `# Preguntas Frecuentes

## ¿Cómo garantizan la frescura?

Cosechamos bajo pedido y enviamos en empaque refrigerado en menos de 24 horas.

## ¿Aceptan devoluciones?

Si los productos no llegan en perfecto estado, hacemos reemplazo o devolución completa.

## ¿Tienen punto de venta físico?

Sí, puedes visitarnos en nuestra finca-tienda en Cundinamarca. Agenda tu visita por WhatsApp.

## ¿Hacen envío internacional?

Por el momento solo realizamos envíos dentro de Colombia.`,
            published: true,
            meta_title: 'FAQ — Campifruit',
            meta_description: 'Preguntas frecuentes sobre frutas frescas, envíos y devoluciones.',
        },
    ],
    promotions: [
        {
            code: 'BIENVENIDO10',
            description: '10% de descuento en tu primera compra',
            type: 'percentage',
            value: 10,
            min_order_amount: 20000,
            max_uses: 100,
            is_disabled: false,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            code: 'FRESA2X1',
            description: 'Compra 2 tarrinas de fresas, la segunda a mitad de precio',
            type: 'percentage',
            value: 25,
            min_order_amount: 13000,
            max_uses: 50,
            is_disabled: false,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            code: 'ENVIOGRATIS',
            description: 'Envío gratis en pedidos desde $30.000',
            type: 'fixed',
            value: 8900,
            currency: 'cop',
            min_order_amount: 30000,
            max_uses: 200,
            is_disabled: false,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ],
    chatbot_faqs: [
        { question: '¿Cuál es el horario de atención?', answer: 'Atendemos de lunes a sábado de 7:00 AM a 6:00 PM (hora Colombia). Domingos y festivos de 8:00 AM a 2:00 PM.', category: 'general', sort_order: 1 },
        { question: '¿Cómo puedo hacer un pedido?', answer: 'Puedes hacer tu pedido directamente en nuestra tienda online o por WhatsApp. Aceptamos pagos con tarjeta, transferencia bancaria y contra-entrega.', category: 'pedidos', sort_order: 2 },
        { question: '¿Cuánto tarda el envío?', answer: 'En Bogotá entregamos en 12-24 horas. En otras ciudades principales, 24-48 horas. Zonas rurales: 48-72 horas.', category: 'envios', sort_order: 3 },
        { question: '¿Las frutas son orgánicas?', answer: 'Nuestras frutas se cultivan con prácticas de agricultura responsable. Estamos en proceso de certificación orgánica, pero ya cumplimos con BPA (Buenas Prácticas Agrícolas).', category: 'productos', sort_order: 4 },
        { question: '¿Qué pasa si llega un producto en mal estado?', answer: 'Si algún producto no cumple con nuestros estándares de calidad, hacemos reemplazo o devolución completa sin costo. Solo envíanos una foto por WhatsApp.', category: 'devoluciones', sort_order: 5 },
        { question: '¿Tienen precio al por mayor?', answer: 'Sí, manejamos precios especiales para restaurantes, hoteles y tiendas. Contáctanos por WhatsApp para una cotización personalizada.', category: 'ventas', sort_order: 6 },
        { question: '¿Cómo conservo las frutas en casa?', answer: 'Las fresas y moras: mantener refrigeradas (4-6°C), consumir en 3-5 días. Piña: temperatura ambiente hasta madurar, luego refrigerar. Duraznos: a temperatura ambiente hasta que estén suaves.', category: 'productos', sort_order: 7 },
    ],
    newsletter_subscribers: [
        { email: 'maria.garcia@example.com', first_name: 'María', subscribed: true },
        { email: 'carlos.lopez@example.com', first_name: 'Carlos', subscribed: true },
        { email: 'ana.martinez@example.com', first_name: 'Ana', subscribed: true },
        { email: 'pedro.ruiz@example.com', first_name: 'Pedro', subscribed: true },
        { email: 'laura.torres@example.com', first_name: 'Laura', subscribed: true },
        { email: 'demo@campifruit.com', first_name: 'Demo', subscribed: true },
    ],
}

const GENERIC_CONTENT: ContentTemplate = {
    carousel: [
        {
            title: '🛍️ Bienvenido a nuestra tienda',
            subtitle: 'Descubre productos frescos y de calidad',
            image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&fit=crop',
            link_url: '/es/productos',
            sort_order: 1,
            active: true,
        },
        {
            title: '🚚 Envío gratuito',
            subtitle: 'En pedidos superiores a €50',
            image_url: 'https://images.unsplash.com/photo-1543168256-418811576931?w=1200&q=80&fit=crop',
            link_url: '/es/productos',
            sort_order: 2,
            active: true,
        },
    ],
    pages: [
        {
            title: 'Sobre Nosotros',
            slug: 'sobre-nosotros',
            content: '# Sobre Nosotros\n\nSomos una tienda comprometida con la calidad y el servicio al cliente.',
            published: true,
            meta_title: 'Sobre Nosotros',
            meta_description: 'Conoce nuestra historia y valores.',
        },
    ],
    promotions: [
        {
            code: 'DEMO10',
            description: '10% de descuento (código demo)',
            type: 'percentage',
            value: 10,
            min_order_amount: 0,
            max_uses: 999,
            is_disabled: false,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ],
    chatbot_faqs: [
        { question: '¿Cuál es el horario?', answer: 'Atendemos de lunes a viernes, 9:00 a 18:00.', category: 'general', sort_order: 1 },
        { question: '¿Hacen envíos?', answer: 'Sí, enviamos a toda la zona. Envío gratis en pedidos mayores a €50.', category: 'envios', sort_order: 2 },
    ],
    newsletter_subscribers: [
        { email: 'demo-sub-1@bootandstrap.demo', first_name: 'Demo', subscribed: true },
        { email: 'demo-sub-2@bootandstrap.demo', first_name: 'Test', subscribed: true },
    ],
}

const CONTENT_TEMPLATES: Record<string, ContentTemplate> = {
    'campifruit': CAMPIFRUIT_CONTENT,
    'fresh-produce': GENERIC_CONTENT,
}

// ── Seeders ──────────────────────────────────────────────────

async function seedCarousel(supabase: ReturnType<typeof createClient>, tenantId: string, data: ContentTemplate['carousel']) {
    // Clear existing
    await supabase.from('carousel_slides').delete().eq('tenant_id', tenantId)

    const rows = data.map(s => ({ ...s, tenant_id: tenantId }))
    const { error } = await supabase.from('carousel_slides').insert(rows)
    if (error) log('⚠️', `Carousel: ${error.message}`)
    else log('✅', `Carousel: ${data.length} slides seeded`)
}

async function seedPages(supabase: ReturnType<typeof createClient>, tenantId: string, data: ContentTemplate['pages']) {
    await supabase.from('cms_pages').delete().eq('tenant_id', tenantId)

    const rows = data.map(p => ({ ...p, tenant_id: tenantId }))
    const { error } = await supabase.from('cms_pages').insert(rows)
    if (error) log('⚠️', `CMS Pages: ${error.message}`)
    else log('✅', `CMS Pages: ${data.length} pages seeded`)
}

async function seedPromotions(supabase: ReturnType<typeof createClient>, tenantId: string, data: ContentTemplate['promotions']) {
    await supabase.from('promotions').delete().eq('tenant_id', tenantId)

    const rows = data.map(p => ({ ...p, tenant_id: tenantId }))
    const { error } = await supabase.from('promotions').insert(rows)
    if (error) log('⚠️', `Promotions: ${error.message}`)
    else log('✅', `Promotions: ${data.length} promo codes seeded`)
}

async function seedChatbotFaqs(supabase: ReturnType<typeof createClient>, tenantId: string, data: ContentTemplate['chatbot_faqs']) {
    await supabase.from('chatbot_faqs').delete().eq('tenant_id', tenantId)

    const rows = data.map(f => ({ ...f, tenant_id: tenantId }))
    const { error } = await supabase.from('chatbot_faqs').insert(rows)
    if (error) log('⚠️', `Chatbot FAQs: ${error.message}`)
    else log('✅', `Chatbot FAQs: ${data.length} FAQs seeded`)
}

async function seedNewsletter(supabase: ReturnType<typeof createClient>, tenantId: string, data: ContentTemplate['newsletter_subscribers']) {
    await supabase.from('newsletter_subscribers').delete().eq('tenant_id', tenantId)

    const rows = data.map(s => ({
        ...s,
        tenant_id: tenantId,
        subscribed_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('newsletter_subscribers').insert(rows)
    if (error) log('⚠️', `Newsletter: ${error.message}`)
    else log('✅', `Newsletter: ${data.length} subscribers seeded`)
}

// ── Public API ───────────────────────────────────────────────

export async function seedContent(
    tenantId: string,
    templateId: string,
    only?: string[],
    logger: (icon: string, msg: string) => void = log,
): Promise<void> {
    const template = CONTENT_TEMPLATES[templateId] || GENERIC_CONTENT
    const supabase = getSupabase()
    const all = !only || only.length === 0

    // Override internal logger
    const originalLog = log
    // @ts-expect-error -- reassigning module-level log for injection
    // eslint-disable-next-line no-global-assign
    log = logger

    try {
        if (all || only?.includes('carousel'))
            await seedCarousel(supabase, tenantId, template.carousel)

        if (all || only?.includes('pages'))
            await seedPages(supabase, tenantId, template.pages)

        if (all || only?.includes('promotions'))
            await seedPromotions(supabase, tenantId, template.promotions)

        if (all || only?.includes('chatbot'))
            await seedChatbotFaqs(supabase, tenantId, template.chatbot_faqs)

        if (all || only?.includes('newsletter'))
            await seedNewsletter(supabase, tenantId, template.newsletter_subscribers)
    } finally {
        // @ts-expect-error -- restore original
        log = originalLog
    }
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2)
    const tenantId = process.env.TENANT_ID
    if (!tenantId) {
        console.error('❌ TENANT_ID is required. Run seed-demo.ts first or set in .env')
        process.exit(1)
    }

    const templateArg = args.find(a => a.startsWith('--template='))
    const templateId = templateArg?.split('=')[1] || process.env.DEMO_TEMPLATE || 'campifruit'

    const onlyArg = args.find(a => a.startsWith('--only='))
    const only = onlyArg?.split('=')[1]?.split(',')

    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  📦 CONTENT SEEDER — ${templateId}`)
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`  Tenant:   ${tenantId}`)
    console.log(`  Types:    ${only?.join(', ') || 'ALL'}`)
    console.log('')

    await seedContent(tenantId, templateId, only)

    console.log('')
    console.log('  ✅ Content seed complete!')
    console.log('')
}

// Run standalone only when directly executed
if (require.main === module) {
    main().catch(err => {
        console.error('❌ Fatal error:', err)
        process.exit(1)
    })
}
