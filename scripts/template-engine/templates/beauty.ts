/**
 * Template: Beauty / Spa
 *
 * Beauty salon and spa with CRM loyalty, POS, and product sales.
 */

import type { IndustryTemplate } from '../types'

export const beautyTemplate: IndustryTemplate = {
    id: 'beauty',
    name: 'Aura — Beauty & Spa',
    industry: 'Belleza / Spa',
    description: 'Centro de belleza con venta de productos, tratamientos, POS y programa de fidelización.',
    emoji: '💅',

    currency: 'eur',
    country: 'es',
    regionName: 'Europe',
    timezone: 'Europe/Madrid',
    countryPrefix: '+34',

    governance: {
        bundleName: 'Demo Beauty',
        flagOverrides: {
            enable_ecommerce: true,
            enable_pos: true,
            enable_crm: true,
            enable_reviews: true,
            enable_whatsapp_checkout: true,
            enable_cash_on_delivery: true,
            enable_carousel: true,
            enable_analytics: true,
        },
        limitOverrides: {
            max_products: 200,
            max_orders_month: 1500,
            max_customers: 3000,
        },
        storeConfig: {
            business_name: 'Aura Beauty & Spa',
            description: 'Centro de belleza integral. Tratamientos faciales, corporales y venta de cosmética premium.',
            contact_phone: '+34 916 789 012',
            primary_color: '#4A0E3D',
            accent_color: '#E8A0BF',
            language: 'es',
            store_email: 'citas@aurabeauty.demo',
            default_currency: 'eur',
            active_currencies: ['eur'],
            active_languages: ['es'],
        },
    },

    shipping: {
        standardLabel: 'Envío estándar (3-5 días)',
        standardPrice: 495,
        expressLabel: 'Envío express (24h)',
        expressPrice: 990,
    },

    categories: [
        { name: 'Tratamientos Faciales', handle: 'tratamientos-faciales', description: 'Limpieza, hidratación y rejuvenecimiento' },
        { name: 'Tratamientos Corporales', handle: 'tratamientos-corporales', description: 'Masajes, envolturas y tratamientos reductores' },
        { name: 'Cosmética Facial', handle: 'cosmetica-facial', description: 'Cremas, sérum y cuidado diario' },
        { name: 'Cosmética Capilar', handle: 'cosmetica-capilar', description: 'Champús, mascarillas y tratamientos capilares' },
        { name: 'Packs y Bonos', handle: 'packs-bonos', description: 'Packs regalo y bonos de sesiones' },
    ],

    products: [
        {
            title: 'Limpieza Facial Profunda',
            handle: 'limpieza-facial',
            description: 'Tratamiento completo: doble limpieza, exfoliación enzimática, extracción, mascarilla y sérum.',
            category: 'tratamientos-faciales',
            thumbnail: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop',
            variants: [
                { title: 'Sesión individual (60 min)', sku: 'LFP-1', prices: [{ amount: 6500, currency_code: 'eur' }], manage_inventory: false },
                { title: 'Bono 3 sesiones', sku: 'LFP-3', prices: [{ amount: 17500, currency_code: 'eur' }], manage_inventory: false },
            ],
        },
        {
            title: 'Hidratación Flash con Vitamina C',
            handle: 'hidratacion-flash',
            description: 'Tratamiento express con ácido hialurónico y vitamina C. Piel luminosa en 30 minutos.',
            category: 'tratamientos-faciales',
            thumbnail: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=400&fit=crop',
            variants: [
                { title: 'Sesión (30 min)', sku: 'HFC-1', prices: [{ amount: 4500, currency_code: 'eur' }], manage_inventory: false },
            ],
        },
        {
            title: 'Masaje Relajante Cuerpo Completo',
            handle: 'masaje-relajante',
            description: 'Masaje con aceites esenciales para liberar tensión y recuperar el bienestar.',
            category: 'tratamientos-corporales',
            thumbnail: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop',
            variants: [
                { title: '60 minutos', sku: 'MRC-60', prices: [{ amount: 5990, currency_code: 'eur' }], manage_inventory: false },
                { title: '90 minutos', sku: 'MRC-90', prices: [{ amount: 7990, currency_code: 'eur' }], manage_inventory: false },
            ],
        },
        {
            title: 'Envoltura Corporal Detox',
            handle: 'envoltura-detox',
            description: 'Tratamiento corporal con algas marinas y arcilla verde. Desintoxica y tonifica.',
            category: 'tratamientos-corporales',
            thumbnail: 'https://images.unsplash.com/photo-1519823551278-64ac92734314?w=400&h=400&fit=crop',
            variants: [
                { title: 'Sesión (75 min)', sku: 'ENV-75', prices: [{ amount: 8990, currency_code: 'eur' }], manage_inventory: false },
            ],
        },
        {
            title: 'Sérum Ácido Hialurónico Puro',
            handle: 'serum-hialuronico',
            description: 'Sérum facial con ácido hialurónico de triple peso molecular. Hidratación profunda.',
            category: 'cosmetica-facial',
            thumbnail: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
            variants: [
                { title: '30ml', sku: 'SHA-30', prices: [{ amount: 3990, currency_code: 'eur' }] },
                { title: '50ml', sku: 'SHA-50', prices: [{ amount: 5490, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Crema Hidratante SPF30',
            handle: 'crema-spf30',
            description: 'Crema facial hidratante con protección solar SPF30. Uso diario.',
            category: 'cosmetica-facial',
            thumbnail: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop',
            variants: [
                { title: '50ml', sku: 'CSP-50', prices: [{ amount: 2890, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Contorno de Ojos Retinol',
            handle: 'contorno-retinol',
            description: 'Tratamiento para el contorno de ojos con retinol encapsulado. Antiarrugas y antiojeras.',
            category: 'cosmetica-facial',
            thumbnail: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop',
            variants: [
                { title: '15ml', sku: 'COR-15', prices: [{ amount: 3490, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Champú Reparador Keratina',
            handle: 'champu-keratina',
            description: 'Champú profesional con keratina hidrolizada. Repara y fortalece el cabello dañado.',
            category: 'cosmetica-capilar',
            thumbnail: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400&h=400&fit=crop',
            variants: [
                { title: '250ml', sku: 'CHK-250', prices: [{ amount: 1990, currency_code: 'eur' }] },
                { title: '500ml', sku: 'CHK-500', prices: [{ amount: 2990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Mascarilla Capilar Nutritiva',
            handle: 'mascarilla-capilar',
            description: 'Mascarilla nutritiva con aceite de argán y manteca de karité.',
            category: 'cosmetica-capilar',
            thumbnail: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400&h=400&fit=crop',
            variants: [
                { title: '200ml', sku: 'MCN-200', prices: [{ amount: 2490, currency_code: 'eur' }] },
                { title: '400ml', sku: 'MCN-400', prices: [{ amount: 3990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Pack Experiencia Relax',
            handle: 'pack-relax',
            description: 'Pack completo: masaje relajante 60min + tratamiento facial + acceso spa. El regalo perfecto.',
            category: 'packs-bonos',
            thumbnail: 'https://images.unsplash.com/photo-1540555700478-4be289fbec6f?w=400&h=400&fit=crop',
            variants: [
                { title: 'Individual', sku: 'PKR-1', prices: [{ amount: 12990, currency_code: 'eur' }], manage_inventory: false },
                { title: 'Pareja', sku: 'PKR-2', prices: [{ amount: 22990, currency_code: 'eur' }], manage_inventory: false },
            ],
            tags: ['regalo', 'bestseller'],
        },
        {
            title: 'Bono 5 Sesiones Laser',
            handle: 'bono-laser',
            description: 'Bono de 5 sesiones de depilación láser. Zona a elegir. Tecnología diodo 808nm.',
            category: 'packs-bonos',
            thumbnail: 'https://images.unsplash.com/photo-1598524374920-12c437c13106?w=400&h=400&fit=crop',
            variants: [
                { title: 'Zona pequeña', sku: 'BLZ-PQ', prices: [{ amount: 19990, currency_code: 'eur' }], manage_inventory: false },
                { title: 'Zona grande', sku: 'BLZ-GR', prices: [{ amount: 29990, currency_code: 'eur' }], manage_inventory: false },
                { title: 'Body completo', sku: 'BLZ-BC', prices: [{ amount: 59990, currency_code: 'eur' }], manage_inventory: false },
            ],
        },
        {
            title: 'Aceite Esencial Lavanda Bio',
            handle: 'aceite-lavanda',
            description: 'Aceite esencial de lavanda orgánica. Ideal para aromaterapia y tratamientos.',
            category: 'cosmetica-facial',
            thumbnail: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop',
            variants: [
                { title: '15ml', sku: 'AEL-15', prices: [{ amount: 1290, currency_code: 'eur' }] },
            ],
        },
    ],

    customers: [
        { first_name: 'Inés', last_name: 'Montero Gil', email: 'ines.montero@bootandstrap.demo', phone: '+34 611 201 201' },
        { first_name: 'Marina', last_name: 'Castillo Ruiz', email: 'marina.castillo@bootandstrap.demo', phone: '+34 622 202 202' },
        { first_name: 'Eva', last_name: 'Prieto Soto', email: 'eva.prieto@bootandstrap.demo', phone: '+34 633 203 203' },
        { first_name: 'Rocío', last_name: 'Calderón Vidal', email: 'rocio.calderon@bootandstrap.demo', phone: '+34 644 204 204' },
        { first_name: 'Pilar', last_name: 'Ramos Aguilera', email: 'pilar.ramos@bootandstrap.demo', phone: '+34 655 205 205' },
        { first_name: 'Alejandra', last_name: 'Méndez Novo', email: 'alejandra.mendez@bootandstrap.demo', phone: '+34 666 206 206' },
        { first_name: 'Rosa', last_name: 'Pérez Cabrera', email: 'rosa.perez@bootandstrap.demo', phone: '+34 677 207 207' },
        { first_name: 'David', last_name: 'Herrero Conde', email: 'david.herrero@bootandstrap.demo', phone: '+34 688 208 208' },
        { first_name: 'Julia', last_name: 'Gutiérrez Valle', email: 'julia.gutierrez@bootandstrap.demo', phone: '+34 699 209 209' },
        { first_name: 'Irene', last_name: 'Campos Prado', email: 'irene.campos@bootandstrap.demo', phone: '+34 610 210 210' },
        { first_name: 'Lorena', last_name: 'Nieto Arias', email: 'lorena.nieto@bootandstrap.demo', phone: '+34 621 211 211' },
        { first_name: 'Diana', last_name: 'Mora Solana', email: 'diana.mora@bootandstrap.demo', phone: '+34 632 212 212' },
        { first_name: 'Paloma', last_name: 'Reyes Castaño', email: 'paloma.reyes@bootandstrap.demo', phone: '+34 643 213 213' },
        { first_name: 'Adriana', last_name: 'Ortega Pascual', email: 'adriana.ortega@bootandstrap.demo', phone: '+34 654 214 214' },
    ],

    orderPattern: {
        count: 45,
        daysSpread: 60,
        statusDistribution: { completed: 0.75, pending: 0.2, canceled: 0.05 },
        itemsPerOrder: [1, 3],
        quantityPerItem: [1, 2],
    },

    moduleConfig: {
        pos: {
            default_payment_methods: ['cash', 'card'],
            enable_kiosk: false,
            enable_shifts: true,
        },
        crm: {
            enable_loyalty: true,
            loyalty_stamps_target: 10,
        },
    },
}
