/**
 * Template: Restaurant
 *
 * Full-service restaurant with POS, kiosk, and chatbot.
 */

import type { IndustryTemplate } from '../types'

export const restaurantTemplate: IndustryTemplate = {
    id: 'restaurant',
    name: 'La Taberna — Cocina de Mercado',
    industry: 'Restauración',
    description: 'Restaurante con carta digital, POS para sala, kiosco de autoservicio y chatbot de reservas.',
    emoji: '🍽️',

    currency: 'eur',
    country: 'es',
    regionName: 'Europe',
    timezone: 'Europe/Madrid',
    countryPrefix: '+34',

    governance: {
        bundleName: 'Demo Restaurant',
        flagOverrides: {
            enable_ecommerce: true,
            enable_pos: true,
            enable_pos_kiosk: true,
            enable_chatbot: true,
            enable_reviews: true,
            enable_whatsapp_checkout: true,
            enable_cash_on_delivery: true,
            enable_carousel: true,
            enable_analytics: true,
        },
        limitOverrides: {
            max_products: 150,
            max_orders_month: 3000,
        },
        storeConfig: {
            business_name: 'La Taberna',
            description: 'Cocina de mercado con productos de temporada. Pide online o visita nuestro local.',
            contact_phone: '+34 913 456 789',
            primary_color: '#8B4513',
            accent_color: '#D4A574',
            language: 'es',
            store_email: 'reservas@lataberna.demo',
            default_currency: 'eur',
            active_currencies: ['eur'],
            active_languages: ['es'],
        },
    },

    shipping: {
        standardLabel: 'Recogida en local (15-30 min)',
        standardPrice: 0,
        expressLabel: 'Delivery (30-45 min)',
        expressPrice: 350,
    },

    categories: [
        { name: 'Entrantes', handle: 'entrantes', description: 'Para abrir boca' },
        { name: 'Principales', handle: 'principales', description: 'Platos fuertes de la casa' },
        { name: 'Postres', handle: 'postres', description: 'El broche de oro' },
        { name: 'Bebidas', handle: 'bebidas', description: 'Vinos, cervezas y refrescos' },
        { name: 'Menú del Día', handle: 'menu-del-dia', description: 'Menú completo a precio cerrado' },
    ],

    products: [
        {
            title: 'Croquetas de Jamón Ibérico',
            handle: 'croquetas-jamon',
            description: 'Croquetas caseras de jamón ibérico de bellota. Crujientes por fuera, cremosas por dentro.',
            category: 'entrantes',
            thumbnail: 'https://images.unsplash.com/photo-1614735241165-6756e1df61ab?w=400&h=400&fit=crop',
            variants: [
                { title: 'Ración (8 uds)', sku: 'CRQ-8', prices: [{ amount: 1290, currency_code: 'eur' }] },
                { title: 'Media ración (4 uds)', sku: 'CRQ-4', prices: [{ amount: 750, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Ensalada César con Pollo',
            handle: 'ensalada-cesar',
            description: 'Lechuga romana, pollo a la plancha, parmesano y nuestra salsa césar casera.',
            category: 'entrantes',
            thumbnail: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=400&fit=crop',
            variants: [
                { title: 'Individual', sku: 'ENS-IND', prices: [{ amount: 990, currency_code: 'eur' }] },
                { title: 'Para compartir', sku: 'ENS-COM', prices: [{ amount: 1590, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Entrecot de Vaca Madurada',
            handle: 'entrecot-vaca',
            description: 'Entrecot de vaca madurada 45 días, a la brasa. Acompañado de patatas panaderas.',
            category: 'principales',
            thumbnail: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=400&fit=crop',
            variants: [
                { title: '300g', sku: 'ENT-300', prices: [{ amount: 2490, currency_code: 'eur' }] },
                { title: '500g', sku: 'ENT-500', prices: [{ amount: 3490, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Lubina a la Espalda',
            handle: 'lubina-espalda',
            description: 'Lubina salvaje abierta al horno con ajo y perejil. Pescado del día.',
            category: 'principales',
            thumbnail: 'https://images.unsplash.com/photo-1534766555764-ce878a4e947e?w=400&h=400&fit=crop',
            variants: [
                { title: 'Ración', sku: 'LUB-RAC', prices: [{ amount: 1890, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Risotto de Setas',
            handle: 'risotto-setas',
            description: 'Risotto cremoso con boletus y shiitake, finalizado con trufa negra.',
            category: 'principales',
            thumbnail: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=400&fit=crop',
            variants: [
                { title: 'Ración', sku: 'RIS-RAC', prices: [{ amount: 1590, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Tarta de Queso Vasca',
            handle: 'tarta-queso',
            description: 'Nuestra famosa tarta de queso burned. Textura cremosa y sabor intenso.',
            category: 'postres',
            thumbnail: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=400&fit=crop',
            variants: [
                { title: 'Porción', sku: 'TQV-POR', prices: [{ amount: 690, currency_code: 'eur' }] },
                { title: 'Tarta completa (8 porc)', sku: 'TQV-ENT', prices: [{ amount: 3990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Tiramisú de la Casa',
            handle: 'tiramisu',
            description: 'Tiramisú con mascarpone importado y café de especialidad.',
            category: 'postres',
            thumbnail: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=400&fit=crop',
            variants: [
                { title: 'Porción', sku: 'TIR-POR', prices: [{ amount: 690, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Vino Tinto Rioja Reserva',
            handle: 'vino-rioja',
            description: 'Rioja Reserva 2019. Tempranillo 90%, Garnacha 10%. 14 meses en barrica.',
            category: 'bebidas',
            thumbnail: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400&h=400&fit=crop',
            variants: [
                { title: 'Copa', sku: 'VIN-COP', prices: [{ amount: 550, currency_code: 'eur' }] },
                { title: 'Botella', sku: 'VIN-BOT', prices: [{ amount: 2290, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Cerveza Artesana IPA',
            handle: 'cerveza-ipa',
            description: 'Cerveza artesanal IPA de cervecería local. Cítrica y lupulada.',
            category: 'bebidas',
            thumbnail: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop',
            variants: [
                { title: 'Caña', sku: 'CRV-CAN', prices: [{ amount: 350, currency_code: 'eur' }] },
                { title: 'Pinta', sku: 'CRV-PIN', prices: [{ amount: 550, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Menú del Día Completo',
            handle: 'menu-dia',
            description: 'Primer plato + segundo plato + postre + bebida. Consultar opciones del día.',
            category: 'menu-del-dia',
            thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
            variants: [
                { title: 'Menú completo', sku: 'MND-COM', prices: [{ amount: 1590, currency_code: 'eur' }] },
                { title: 'Menú ejecutivo', sku: 'MND-EJE', prices: [{ amount: 2290, currency_code: 'eur' }] },
            ],
        },
    ],

    customers: [
        { first_name: 'Rodrigo', last_name: 'Pérez Molina', email: 'rodrigo.perez@bootandstrap.demo', phone: '+34 611 100 100' },
        { first_name: 'Claudia', last_name: 'Martín Iglesias', email: 'claudia.martin@bootandstrap.demo', phone: '+34 622 200 200' },
        { first_name: 'Fernando', last_name: 'López Aguilar', email: 'fernando.lopez@bootandstrap.demo', phone: '+34 633 300 300' },
        { first_name: 'Beatriz', last_name: 'Sánchez Ríos', email: 'beatriz.sanchez@bootandstrap.demo', phone: '+34 644 400 400' },
        { first_name: 'Víctor', last_name: 'Hernández Pizarro', email: 'victor.hernandez@bootandstrap.demo', phone: '+34 655 500 500' },
        { first_name: 'Alicia', last_name: 'García Estévez', email: 'alicia.garcia@bootandstrap.demo', phone: '+34 666 600 600' },
        { first_name: 'Tomás', last_name: 'Fernández Méndez', email: 'tomas.fernandez@bootandstrap.demo', phone: '+34 677 700 700' },
        { first_name: 'Raquel', last_name: 'Díaz Bustamante', email: 'raquel.diaz@bootandstrap.demo', phone: '+34 688 800 800' },
        { first_name: 'Iñigo', last_name: 'Moreno Caballero', email: 'inigo.moreno@bootandstrap.demo', phone: '+34 699 900 900' },
        { first_name: 'Silvia', last_name: 'Álvarez Herrera', email: 'silvia.alvarez@bootandstrap.demo', phone: '+34 610 010 010' },
        { first_name: 'Alberto', last_name: 'Romero Durán', email: 'alberto.romero@bootandstrap.demo', phone: '+34 621 021 021' },
        { first_name: 'Teresa', last_name: 'Jiménez Solís', email: 'teresa.jimenez@bootandstrap.demo', phone: '+34 632 032 032' },
    ],

    orderPattern: {
        count: 60,
        daysSpread: 30,
        statusDistribution: { completed: 0.8, pending: 0.15, canceled: 0.05 },
        itemsPerOrder: [2, 5],
        quantityPerItem: [1, 2],
    },

    moduleConfig: {
        pos: {
            default_payment_methods: ['cash', 'card'],
            enable_kiosk: true,
            enable_shifts: true,
        },
        chatbot: {
            welcome_message: '¡Hola! 🍽️ Bienvenido/a a La Taberna. ¿Quieres hacer una reserva o ver nuestro menú?',
            auto_responses: true,
        },
    },
}
