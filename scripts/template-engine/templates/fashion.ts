/**
 * Template: Fashion (Urban Fashion Store)
 *
 * Modern urban fashion brand with CRM and email marketing.
 */

import type { IndustryTemplate } from '../types'

export const fashionTemplate: IndustryTemplate = {
    id: 'fashion',
    name: 'UrbanThreads — Moda Urbana',
    industry: 'Moda',
    description: 'Tienda de moda urbana con CRM, fidelización y campañas de email marketing.',
    emoji: '👗',

    currency: 'eur',
    country: 'es',
    regionName: 'Europe',
    timezone: 'Europe/Madrid',
    countryPrefix: '+34',

    governance: {
        bundleName: 'Demo Fashion',
        flagOverrides: {
            enable_ecommerce: true,
            enable_crm: true,
            enable_email_templates: true,
            enable_reviews: true,
            enable_whatsapp_checkout: true,
            enable_online_payments: true,
            enable_carousel: true,
            enable_analytics: true,
            enable_multi_language: true,
        },
        limitOverrides: {
            max_products: 300,
            max_orders_month: 2000,
            max_customers: 5000,
            max_email_sends_month: 5000,
        },
        storeConfig: {
            business_name: 'UrbanThreads',
            description: 'Moda urbana contemporánea. Estilo, calidad y actitud.',
            contact_phone: '+34 910 123 456',
            primary_color: '#1A1A2E',
            accent_color: '#E94560',
            language: 'es',
            store_email: 'hola@urbanthreads.demo',
            default_currency: 'eur',
            active_currencies: ['eur'],
            active_languages: ['es', 'en'],
        },
    },

    shipping: {
        standardLabel: 'Envío estándar (3-5 días)',
        standardPrice: 499,
        expressLabel: 'Envío 24h',
        expressPrice: 990,
    },

    categories: [
        { name: 'Camisetas', handle: 'camisetas', description: 'Camisetas y tops para todas las ocasiones' },
        { name: 'Pantalones', handle: 'pantalones', description: 'Jeans, chinos y pantalones de vestir' },
        { name: 'Chaquetas', handle: 'chaquetas', description: 'Chaquetas, abrigos y sobrecamisas' },
        { name: 'Zapatillas', handle: 'zapatillas', description: 'Sneakers y calzado urbano' },
        { name: 'Accesorios', handle: 'accesorios', description: 'Complementos que completan tu look' },
    ],

    products: [
        {
            title: 'Camiseta Oversize Essential',
            handle: 'camiseta-oversize',
            description: 'Camiseta oversize de algodón orgánico 220gsm. Corte relajado y caída perfecta.',
            category: 'camisetas',
            thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
            variants: [
                { title: 'S — Blanco', sku: 'CMO-S-WH', prices: [{ amount: 3490, currency_code: 'eur' }] },
                { title: 'M — Blanco', sku: 'CMO-M-WH', prices: [{ amount: 3490, currency_code: 'eur' }] },
                { title: 'L — Negro', sku: 'CMO-L-BK', prices: [{ amount: 3490, currency_code: 'eur' }] },
                { title: 'XL — Negro', sku: 'CMO-XL-BK', prices: [{ amount: 3490, currency_code: 'eur' }] },
            ],
            tags: ['bestseller', 'orgánico'],
        },
        {
            title: 'Jeans Slim Raw Denim',
            handle: 'jeans-slim-raw',
            description: 'Jeans slim fit en raw denim japonés 14oz. Se adaptan a tu cuerpo con el uso.',
            category: 'pantalones',
            thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
            variants: [
                { title: '30', sku: 'JNS-30', prices: [{ amount: 8990, currency_code: 'eur' }] },
                { title: '32', sku: 'JNS-32', prices: [{ amount: 8990, currency_code: 'eur' }] },
                { title: '34', sku: 'JNS-34', prices: [{ amount: 8990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Bomber Jacket Nylon',
            handle: 'bomber-nylon',
            description: 'Bomber jacket en nylon técnico con forro satinado. Essential para la transición.',
            category: 'chaquetas',
            thumbnail: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
            variants: [
                { title: 'M — Olive', sku: 'BMB-M-OL', prices: [{ amount: 12990, currency_code: 'eur' }] },
                { title: 'L — Olive', sku: 'BMB-L-OL', prices: [{ amount: 12990, currency_code: 'eur' }] },
                { title: 'L — Black', sku: 'BMB-L-BK', prices: [{ amount: 12990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Sneakers Urban Low',
            handle: 'sneakers-low',
            description: 'Zapatillas minimalistas de piel con suela vulcanizada. Comodidad y estilo.',
            category: 'zapatillas',
            thumbnail: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
            variants: [
                { title: '40 — White', sku: 'SNK-40-WH', prices: [{ amount: 9990, currency_code: 'eur' }] },
                { title: '42 — White', sku: 'SNK-42-WH', prices: [{ amount: 9990, currency_code: 'eur' }] },
                { title: '43 — Black', sku: 'SNK-43-BK', prices: [{ amount: 9990, currency_code: 'eur' }] },
                { title: '44 — Black', sku: 'SNK-44-BK', prices: [{ amount: 9990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Sudadera Hoodie Premium',
            handle: 'hoodie-premium',
            description: 'Sudadera con capucha en French Terry 350gsm. Tacto premium, ajuste perfecto.',
            category: 'camisetas',
            thumbnail: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
            variants: [
                { title: 'M — Gris', sku: 'HOO-M-GR', prices: [{ amount: 6990, currency_code: 'eur' }] },
                { title: 'L — Gris', sku: 'HOO-L-GR', prices: [{ amount: 6990, currency_code: 'eur' }] },
                { title: 'L — Negro', sku: 'HOO-L-BK', prices: [{ amount: 6990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Chinos Relaxed Fit',
            handle: 'chinos-relaxed',
            description: 'Chinos en sarga de algodón con corte relaxed. Versatilidad total.',
            category: 'pantalones',
            thumbnail: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop',
            variants: [
                { title: '30 — Beige', sku: 'CHN-30-BE', prices: [{ amount: 5490, currency_code: 'eur' }] },
                { title: '32 — Beige', sku: 'CHN-32-BE', prices: [{ amount: 5490, currency_code: 'eur' }] },
                { title: '32 — Navy', sku: 'CHN-32-NV', prices: [{ amount: 5490, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Gorra Six Panel',
            handle: 'gorra-six-panel',
            description: 'Gorra de seis paneles en algodón washed. Logo bordado sutil.',
            category: 'accesorios',
            thumbnail: 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400&h=400&fit=crop',
            variants: [
                { title: 'Único — Negro', sku: 'GOR-BK', prices: [{ amount: 2490, currency_code: 'eur' }] },
                { title: 'Único — Stone', sku: 'GOR-ST', prices: [{ amount: 2490, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Mochila Roll-Top',
            handle: 'mochila-rolltop',
            description: 'Mochila roll-top en cordura impermeable. Capacidad 22L expandible.',
            category: 'accesorios',
            thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
            variants: [
                { title: 'Negro', sku: 'MOC-BK', prices: [{ amount: 7990, currency_code: 'eur' }] },
                { title: 'Olive', sku: 'MOC-OL', prices: [{ amount: 7990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Polo Piqué Classic',
            handle: 'polo-pique',
            description: 'Polo de piqué en algodón orgánico con cuello contrastado.',
            category: 'camisetas',
            thumbnail: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&h=400&fit=crop',
            variants: [
                { title: 'S — White', sku: 'POL-S-WH', prices: [{ amount: 4490, currency_code: 'eur' }] },
                { title: 'M — Navy', sku: 'POL-M-NV', prices: [{ amount: 4490, currency_code: 'eur' }] },
                { title: 'L — White', sku: 'POL-L-WH', prices: [{ amount: 4490, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Sobrecamisa Flannel',
            handle: 'sobrecamisa-flannel',
            description: 'Sobrecamisa en flannel de algodón a cuadros. Capa perfecta para entretiempo.',
            category: 'chaquetas',
            thumbnail: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop',
            variants: [
                { title: 'M', sku: 'SBC-M', prices: [{ amount: 6990, currency_code: 'eur' }] },
                { title: 'L', sku: 'SBC-L', prices: [{ amount: 6990, currency_code: 'eur' }] },
                { title: 'XL', sku: 'SBC-XL', prices: [{ amount: 6990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Bermudas Cargo',
            handle: 'bermudas-cargo',
            description: 'Bermudas cargo en ripstop ligero. Bolsillos funcionales, estilo militar moderno.',
            category: 'pantalones',
            thumbnail: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop',
            variants: [
                { title: '30 — Khaki', sku: 'BER-30-KH', prices: [{ amount: 4990, currency_code: 'eur' }] },
                { title: '32 — Khaki', sku: 'BER-32-KH', prices: [{ amount: 4990, currency_code: 'eur' }] },
                { title: '34 — Olive', sku: 'BER-34-OL', prices: [{ amount: 4990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Cinturón Cuero Premium',
            handle: 'cinturon-cuero',
            description: 'Cinturón de piel de curtición vegetal con hebilla metálica cepillada.',
            category: 'accesorios',
            thumbnail: 'https://images.unsplash.com/photo-1553704571-c32d20e6c56f?w=400&h=400&fit=crop',
            variants: [
                { title: '85cm', sku: 'CIN-85', prices: [{ amount: 3990, currency_code: 'eur' }] },
                { title: '95cm', sku: 'CIN-95', prices: [{ amount: 3990, currency_code: 'eur' }] },
                { title: '105cm', sku: 'CIN-105', prices: [{ amount: 3990, currency_code: 'eur' }] },
            ],
        },
    ],

    customers: [
        { first_name: 'Hugo', last_name: 'Martín Vega', email: 'hugo.martin@bootandstrap.demo', phone: '+34 611 001 001' },
        { first_name: 'Valentina', last_name: 'López Rey', email: 'valentina.lopez@bootandstrap.demo', phone: '+34 622 002 002' },
        { first_name: 'Mateo', last_name: 'García Ramos', email: 'mateo.garcia@bootandstrap.demo', phone: '+34 633 003 003' },
        { first_name: 'Olivia', last_name: 'Sánchez Pardo', email: 'olivia.sanchez@bootandstrap.demo', phone: '+34 644 004 004' },
        { first_name: 'Lucas', last_name: 'Fernández Cruz', email: 'lucas.fernandez@bootandstrap.demo', phone: '+34 655 005 005' },
        { first_name: 'Emma', last_name: 'Díaz Ortega', email: 'emma.diaz@bootandstrap.demo', phone: '+34 666 006 006' },
        { first_name: 'Daniel', last_name: 'Moreno Rubio', email: 'daniel.moreno@bootandstrap.demo', phone: '+34 677 007 007' },
        { first_name: 'Paula', last_name: 'Álvarez Ibáñez', email: 'paula.alvarez@bootandstrap.demo', phone: '+34 688 008 008' },
        { first_name: 'Leo', last_name: 'Jiménez Cano', email: 'leo.jimenez@bootandstrap.demo', phone: '+34 699 009 009' },
        { first_name: 'Sara', last_name: 'Herrero Blázquez', email: 'sara.herrero@bootandstrap.demo', phone: '+34 610 010 010' },
        { first_name: 'Adrián', last_name: 'Romero Sierra', email: 'adrian.romero@bootandstrap.demo', phone: '+34 621 011 011' },
        { first_name: 'Noa', last_name: 'Torres Pascual', email: 'noa.torres@bootandstrap.demo', phone: '+34 632 012 012' },
        { first_name: 'Álvaro', last_name: 'Navarro Esteban', email: 'alvaro.navarro@bootandstrap.demo', phone: '+34 643 013 013' },
        { first_name: 'Mía', last_name: 'Santos Fuentes', email: 'mia.santos@bootandstrap.demo', phone: '+34 654 014 014' },
        { first_name: 'Iker', last_name: 'Gil Campos', email: 'iker.gil@bootandstrap.demo', phone: '+34 665 015 015' },
        { first_name: 'Lola', last_name: 'Calvo Guerrero', email: 'lola.calvo@bootandstrap.demo', phone: '+34 676 016 016' },
        { first_name: 'Marc', last_name: 'Ortiz Peña', email: 'marc.ortiz@bootandstrap.demo', phone: '+34 687 017 017' },
        { first_name: 'Vega', last_name: 'Delgado Luna', email: 'vega.delgado@bootandstrap.demo', phone: '+34 698 018 018' },
    ],

    orderPattern: {
        count: 50,
        daysSpread: 90,
        statusDistribution: { completed: 0.65, pending: 0.25, canceled: 0.1 },
        itemsPerOrder: [1, 3],
        quantityPerItem: [1, 2],
    },

    moduleConfig: {
        crm: {
            enable_loyalty: true,
            loyalty_stamps_target: 8,
        },
    },
}
