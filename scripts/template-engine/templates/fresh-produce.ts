/**
 * Template: Fresh Produce (Campifruit/Frutas y Verduras)
 *
 * Refactored from the original CAMPIFRUIT seed data.
 * Organic fruit & vegetable shop with POS and chatbot.
 */

import type { IndustryTemplate } from '../types'

export const freshProduceTemplate: IndustryTemplate = {
    id: 'fresh-produce',
    name: 'Campifruit — Organic Market',
    industry: 'Frutas y Verduras',
    description: 'Tienda de frutas y verduras orgánicas con POS presencial y chatbot de atención.',
    emoji: '🍊',

    currency: 'eur',
    country: 'es',
    regionName: 'Europe',
    timezone: 'Europe/Madrid',
    countryPrefix: '+34',
    additionalCurrencies: [],

    governance: {
        modules: [
            { module: 'ecommerce', tier: 'pro' },
            { module: 'pos', tier: 'pro' },
            { module: 'sales_channels', tier: 'pro' },
            { module: 'chatbot', tier: 'basic' },
            { module: 'email_marketing', tier: 'basic' },
            { module: 'seo', tier: 'medio' },
        ],
        flagOverrides: {
            enable_ecommerce: true,
            enable_pos: true,
            enable_chatbot: true,
            enable_reviews: true,
            enable_whatsapp_checkout: true,
            enable_cash_on_delivery: true,
            enable_carousel: true,
            enable_analytics: true,
        },
        limitOverrides: {
            max_products: 200,
            max_orders_month: 1000,
        },
        storeConfig: {
            business_name: 'Campifruit',
            description: 'Frutas y verduras orgánicas directas del campo a tu mesa.',
            contact_phone: '+34 612 345 678',
            primary_color: '#2D5016',
            accent_color: '#8BC34A',
            language: 'es',
            store_email: 'hola@campifruit.demo',
            default_currency: 'eur',
            active_currencies: ['eur'],
            active_languages: ['es', 'en'],
        },
    },

    shipping: {
        standardLabel: 'Envío estándar (3-5 días)',
        standardPrice: 399,
        expressLabel: 'Envío express (24h)',
        expressPrice: 899,
    },

    categories: [
        { name: 'Frutas', handle: 'frutas', description: 'Frutas frescas de temporada' },
        { name: 'Verduras', handle: 'verduras', description: 'Verduras orgánicas del día' },
        { name: 'Cestas', handle: 'cestas', description: 'Cestas preparadas con variedad' },
        { name: 'Zumos Naturales', handle: 'zumos', description: 'Zumos recién exprimidos' },
    ],

    products: [
        {
            title: 'Naranjas de Valencia',
            handle: 'naranjas-valencia',
            description: 'Naranjas dulces recién cogidas de los campos de Valencia. Perfectas para zumo o consumo directo.',
            category: 'frutas',
            thumbnail: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=400&fit=crop',
            variants: [
                { title: 'Caja 5kg', sku: 'NAR-5KG', prices: [{ amount: 1290, currency_code: 'eur' }] },
                { title: 'Caja 10kg', sku: 'NAR-10KG', prices: [{ amount: 2190, currency_code: 'eur' }] },
            ],
            tags: ['orgánico', 'temporada'],
        },
        {
            title: 'Fresas de Huelva',
            handle: 'fresas-huelva',
            description: 'Fresas frescas, dulces y aromáticas de la tierra onubense.',
            category: 'frutas',
            thumbnail: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=400&fit=crop',
            variants: [
                { title: '500g', sku: 'FRE-500', prices: [{ amount: 450, currency_code: 'eur' }] },
                { title: '1kg', sku: 'FRE-1KG', prices: [{ amount: 790, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Manzanas Fuji',
            handle: 'manzanas-fuji',
            description: 'Manzanas crujientes y dulces tipo Fuji, cultivadas sin pesticidas.',
            category: 'frutas',
            thumbnail: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop',
            variants: [
                { title: 'Bolsa 1kg', sku: 'MAN-1KG', prices: [{ amount: 390, currency_code: 'eur' }] },
                { title: 'Caja 3kg', sku: 'MAN-3KG', prices: [{ amount: 990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Tomates Rama',
            handle: 'tomates-rama',
            description: 'Tomates en rama madurados al sol con sabor intenso a huerta.',
            category: 'verduras',
            thumbnail: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400&h=400&fit=crop',
            variants: [
                { title: '1kg', sku: 'TOM-1KG', prices: [{ amount: 350, currency_code: 'eur' }] },
                { title: '2kg', sku: 'TOM-2KG', prices: [{ amount: 590, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Pimientos del Padrón',
            handle: 'pimientos-padron',
            description: 'Los auténticos pimientos del Padrón. Unos pican y otros no.',
            category: 'verduras',
            thumbnail: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=400&fit=crop',
            variants: [
                { title: '250g', sku: 'PAD-250', prices: [{ amount: 290, currency_code: 'eur' }] },
                { title: '500g', sku: 'PAD-500', prices: [{ amount: 490, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Lechuga Iceberg',
            handle: 'lechuga-iceberg',
            description: 'Lechuga fresca y crujiente, recogida esta mañana.',
            category: 'verduras',
            thumbnail: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=400&fit=crop',
            variants: [
                { title: 'Unidad', sku: 'LEC-UND', prices: [{ amount: 120, currency_code: 'eur' }] },
                { title: 'Pack 3', sku: 'LEC-3PK', prices: [{ amount: 290, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Aguacates Hass',
            handle: 'aguacates-hass',
            description: 'Aguacates Hass perfectos, cremosos y llenos de sabor.',
            category: 'frutas',
            thumbnail: 'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?w=400&h=400&fit=crop',
            variants: [
                { title: 'Pack 3', sku: 'AGU-3PK', prices: [{ amount: 590, currency_code: 'eur' }] },
                { title: 'Pack 6', sku: 'AGU-6PK', prices: [{ amount: 990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Cesta Familiar',
            handle: 'cesta-familiar',
            description: 'Cesta semanal con variedad de frutas y verduras para toda la familia (7-8kg aprox).',
            category: 'cestas',
            thumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
            variants: [
                { title: 'Estándar', sku: 'CES-STD', prices: [{ amount: 2490, currency_code: 'eur' }] },
                { title: 'Premium', sku: 'CES-PRE', prices: [{ amount: 3490, currency_code: 'eur' }] },
            ],
            tags: ['bestseller'],
        },
        {
            title: 'Cesta Solo Frutas',
            handle: 'cesta-frutas',
            description: 'Cesta con 5 variedades de fruta de temporada (5kg aprox).',
            category: 'cestas',
            thumbnail: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop',
            variants: [
                { title: 'Mediana', sku: 'CFR-MED', prices: [{ amount: 1890, currency_code: 'eur' }] },
                { title: 'Grande', sku: 'CFR-GRN', prices: [{ amount: 2890, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Zumo de Naranja Natural',
            handle: 'zumo-naranja',
            description: 'Zumo exprimido de nuestras naranjas de Valencia. Sin azúcar añadido.',
            category: 'zumos',
            thumbnail: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop',
            variants: [
                { title: '500ml', sku: 'ZUM-500', prices: [{ amount: 390, currency_code: 'eur' }] },
                { title: '1L', sku: 'ZUM-1L', prices: [{ amount: 650, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Limones Ecológicos',
            handle: 'limones-eco',
            description: 'Limones sin tratar, de cultivo ecológico certificado.',
            category: 'frutas',
            thumbnail: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=400&fit=crop',
            variants: [
                { title: 'Malla 1kg', sku: 'LIM-1KG', prices: [{ amount: 290, currency_code: 'eur' }] },
                { title: 'Caja 3kg', sku: 'LIM-3KG', prices: [{ amount: 690, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Zanahorias Baby',
            handle: 'zanahorias-baby',
            description: 'Zanahorias baby dulces y tiernas, listas para comer o cocinar.',
            category: 'verduras',
            thumbnail: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop',
            variants: [
                { title: '400g', sku: 'ZAN-400', prices: [{ amount: 250, currency_code: 'eur' }] },
                { title: '800g', sku: 'ZAN-800', prices: [{ amount: 420, currency_code: 'eur' }] },
            ],
        },
    ],

    customers: [
        { first_name: 'María', last_name: 'García López', email: 'maria.garcia@bootandstrap.demo', phone: '+34 611 222 333' },
        { first_name: 'Carlos', last_name: 'Rodríguez Martín', email: 'carlos.rodriguez@bootandstrap.demo', phone: '+34 622 333 444' },
        { first_name: 'Ana', last_name: 'Martínez Ruiz', email: 'ana.martinez@bootandstrap.demo', phone: '+34 633 444 555' },
        { first_name: 'Javier', last_name: 'Fernández Díaz', email: 'javier.fernandez@bootandstrap.demo', phone: '+34 644 555 666' },
        { first_name: 'Laura', last_name: 'Hernández Sánchez', email: 'laura.hernandez@bootandstrap.demo', phone: '+34 655 666 777' },
        { first_name: 'Pablo', last_name: 'Jiménez Torres', email: 'pablo.jimenez@bootandstrap.demo', phone: '+34 666 777 888' },
        { first_name: 'Sofía', last_name: 'Morales Castro', email: 'sofia.morales@bootandstrap.demo', phone: '+34 677 888 999' },
        { first_name: 'Diego', last_name: 'Alonso Gil', email: 'diego.alonso@bootandstrap.demo', phone: '+34 688 999 000' },
        { first_name: 'Elena', last_name: 'Navarro Romero', email: 'elena.navarro@bootandstrap.demo', phone: '+34 699 000 111' },
        { first_name: 'Miguel', last_name: 'Serrano Blanco', email: 'miguel.serrano@bootandstrap.demo', phone: '+34 610 111 222' },
        { first_name: 'Carmen', last_name: 'Vega Ortiz', email: 'carmen.vega@bootandstrap.demo', phone: '+34 621 222 333' },
        { first_name: 'Alejandro', last_name: 'Ruiz Molina', email: 'alejandro.ruiz@bootandstrap.demo', phone: '+34 632 333 444' },
        { first_name: 'Isabel', last_name: 'Núñez Bravo', email: 'isabel.nunez@bootandstrap.demo', phone: '+34 643 444 555' },
        { first_name: 'Andrés', last_name: 'Santos Peña', email: 'andres.santos@bootandstrap.demo', phone: '+34 654 555 666' },
        { first_name: 'Lucía', last_name: 'Domínguez Flores', email: 'lucia.dominguez@bootandstrap.demo', phone: '+34 665 666 777' },
    ],

    orderPattern: {
        count: 40,
        daysSpread: 60,
        statusDistribution: { completed: 0.7, pending: 0.2, canceled: 0.1 },
        itemsPerOrder: [1, 4],
        quantityPerItem: [1, 3],
    },

    moduleConfig: {
        pos: {
            default_payment_methods: ['cash', 'card'],
            enable_kiosk: false,
            enable_shifts: true,
        },
        chatbot: {
            welcome_message: '¡Hola! 🍊 Bienvenido/a a Campifruit. ¿En qué puedo ayudarte?',
            auto_responses: true,
        },
    },
}
