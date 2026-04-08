/**
 * Template: Tech / SaaS B2B
 *
 * Digital product store with automation, CRM, and chatbot.
 */

import type { IndustryTemplate } from '../types'

export const techTemplate: IndustryTemplate = {
    id: 'tech',
    name: 'NovaTech — Digital Solutions',
    industry: 'Tech / SaaS',
    description: 'Tienda de productos digitales y licencias SaaS con automatizaciones y CRM.',
    emoji: '💻',

    currency: 'eur',
    country: 'es',
    regionName: 'Europe',
    timezone: 'Europe/Madrid',
    countryPrefix: '+34',
    additionalCurrencies: ['usd'],

    governance: {
        bundleName: 'Demo Tech',
        flagOverrides: {
            enable_ecommerce: true,
            enable_crm: true,
            enable_chatbot: true,
            enable_automation: true,
            enable_email_templates: true,
            enable_reviews: true,
            enable_online_payments: true,
            enable_carousel: true,
            enable_analytics: true,
            enable_multi_language: true,
            enable_sales_channels: true,
        },
        limitOverrides: {
            max_products: 50,
            max_orders_month: 500,
            max_customers: 2000,
            max_email_sends_month: 10000,
        },
        storeConfig: {
            business_name: 'NovaTech',
            description: 'Soluciones digitales para empresas. Software, licencias y consultoría tecnológica.',
            contact_phone: '+34 915 678 900',
            primary_color: '#0F172A',
            accent_color: '#6366F1',
            language: 'es',
            store_email: 'sales@novatech.demo',
            default_currency: 'eur',
            active_currencies: ['eur', 'usd'],
            active_languages: ['es', 'en'],
        },
    },

    shipping: {
        standardLabel: 'Entrega digital (inmediata)',
        standardPrice: 0,
        expressLabel: 'Setup prioritario (24h)',
        expressPrice: 4990,
    },

    categories: [
        { name: 'Software', handle: 'software', description: 'Licencias y suscripciones de software' },
        { name: 'Hardware', handle: 'hardware', description: 'Equipamiento y dispositivos' },
        { name: 'Consultoría', handle: 'consultoria', description: 'Servicios de consultoría y formación' },
        { name: 'Cloud', handle: 'cloud', description: 'Servicios cloud y hosting' },
    ],

    products: [
        {
            title: 'NovaSuite Business — Licencia Anual',
            handle: 'novasuite-business',
            description: 'Suite completa de productividad empresarial. Incluye: email corporativo, storage, colaboración en tiempo real y analytics.',
            category: 'software',
            thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop',
            variants: [
                { title: 'Starter (5 usuarios)', sku: 'NVS-STR', prices: [{ amount: 29900, currency_code: 'eur' }, { amount: 34900, currency_code: 'usd' }] },
                { title: 'Business (25 usuarios)', sku: 'NVS-BIZ', prices: [{ amount: 99900, currency_code: 'eur' }, { amount: 114900, currency_code: 'usd' }] },
                { title: 'Enterprise (ilimitado)', sku: 'NVS-ENT', prices: [{ amount: 249900, currency_code: 'eur' }, { amount: 289900, currency_code: 'usd' }] },
            ],
            tags: ['digital', 'subscription'],
        },
        {
            title: 'Antivirus Pro Corporate',
            handle: 'antivirus-corporate',
            description: 'Protección avanzada contra malware, ransomware y amenazas zero-day para toda la organización.',
            category: 'software',
            thumbnail: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=400&fit=crop',
            variants: [
                { title: '10 puestos/año', sku: 'AVP-10', prices: [{ amount: 14990, currency_code: 'eur' }] },
                { title: '50 puestos/año', sku: 'AVP-50', prices: [{ amount: 59990, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Servidor Dell PowerEdge T350',
            handle: 'dell-server-t350',
            description: 'Servidor torre ideal para PYMES. Xeon E-2314, 16GB ECC, 1TB SSD.',
            category: 'hardware',
            thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=400&fit=crop',
            variants: [
                { title: 'Config. Base', sku: 'SRV-BASE', prices: [{ amount: 179900, currency_code: 'eur' }] },
                { title: 'Config. Avanzada', sku: 'SRV-ADV', prices: [{ amount: 299900, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Consultoría Cloud Migration',
            handle: 'cloud-migration',
            description: 'Servicio de consultoría para migrar tu infraestructura a la nube. Auditoría + plan + ejecución.',
            category: 'consultoria',
            thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=400&fit=crop',
            variants: [
                { title: 'Auditoría (5 días)', sku: 'CLM-AUD', prices: [{ amount: 490000, currency_code: 'eur' }] },
                { title: 'Migración completa', sku: 'CLM-FUL', prices: [{ amount: 1500000, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Hosting VPS Premium',
            handle: 'vps-premium',
            description: 'VPS con NVMe SSD, 99.9% uptime SLA, backups diarios y monitorización 24/7.',
            category: 'cloud',
            thumbnail: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop',
            variants: [
                { title: '4 vCPU / 8GB / 200GB', sku: 'VPS-S', prices: [{ amount: 4990, currency_code: 'eur' }], manage_inventory: false },
                { title: '8 vCPU / 16GB / 500GB', sku: 'VPS-M', prices: [{ amount: 9990, currency_code: 'eur' }], manage_inventory: false },
                { title: '16 vCPU / 32GB / 1TB', sku: 'VPS-L', prices: [{ amount: 19990, currency_code: 'eur' }], manage_inventory: false },
            ],
            tags: ['cloud', 'subscription'],
        },
        {
            title: 'Microsoft 365 Business',
            handle: 'microsoft-365',
            description: 'Licencia completa de Microsoft 365 Business Premium. Teams, Office, OneDrive.',
            category: 'software',
            thumbnail: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=400&h=400&fit=crop',
            variants: [
                { title: '1 usuario/año', sku: 'M365-1', prices: [{ amount: 26400, currency_code: 'eur' }] },
                { title: '10 usuarios/año', sku: 'M365-10', prices: [{ amount: 237600, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Formación Ciberseguridad Equipos',
            handle: 'formacion-ciber',
            description: 'Curso intensivo de ciberseguridad para equipos. 16 horas lectivas, certificado incluido.',
            category: 'consultoria',
            thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=400&fit=crop',
            variants: [
                { title: 'Grupo (hasta 15 pers.)', sku: 'FCB-GRP', prices: [{ amount: 299000, currency_code: 'eur' }] },
            ],
        },
        {
            title: 'Backup Cloud Empresarial',
            handle: 'backup-cloud',
            description: 'Backup automático en la nube con cifrado AES-256. Restauración instantánea.',
            category: 'cloud',
            thumbnail: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&h=400&fit=crop',
            variants: [
                { title: '100GB/mes', sku: 'BCK-100', prices: [{ amount: 1990, currency_code: 'eur' }], manage_inventory: false },
                { title: '1TB/mes', sku: 'BCK-1T', prices: [{ amount: 7990, currency_code: 'eur' }], manage_inventory: false },
            ],
        },
    ],

    customers: [
        { first_name: 'Roberto', last_name: 'Ingeniería SL', email: 'roberto@bootandstrap.demo', phone: '+34 911 100 100' },
        { first_name: 'Sandra', last_name: 'Tech Solutions', email: 'sandra@bootandstrap.demo', phone: '+34 922 200 200' },
        { first_name: 'Miguel Ángel', last_name: 'Consultores', email: 'miguelangel@bootandstrap.demo', phone: '+34 933 300 300' },
        { first_name: 'Patricia', last_name: 'Digital Lab', email: 'patricia@bootandstrap.demo', phone: '+34 944 400 400' },
        { first_name: 'Enrique', last_name: 'DataCorp', email: 'enrique@bootandstrap.demo', phone: '+34 955 500 500' },
        { first_name: 'Marta', last_name: 'Cloud Partners', email: 'marta@bootandstrap.demo', phone: '+34 966 600 600' },
        { first_name: 'Jesús', last_name: 'CyberGuard', email: 'jesus@bootandstrap.demo', phone: '+34 977 700 700' },
        { first_name: 'Cristina', last_name: 'NetSolutions', email: 'cristina@bootandstrap.demo', phone: '+34 988 800 800' },
        { first_name: 'Óscar', last_name: 'InfoSys Pro', email: 'oscar@bootandstrap.demo', phone: '+34 999 900 900' },
        { first_name: 'Nuria', last_name: 'WebForce', email: 'nuria@bootandstrap.demo', phone: '+34 910 010 010' },
    ],

    orderPattern: {
        count: 25,
        daysSpread: 90,
        statusDistribution: { completed: 0.8, pending: 0.15, canceled: 0.05 },
        itemsPerOrder: [1, 2],
        quantityPerItem: [1, 5],
    },

    moduleConfig: {
        chatbot: {
            welcome_message: '¡Hola! 💻 Soy el asistente de NovaTech. ¿Necesitas ayuda con nuestros productos o servicios?',
            auto_responses: true,
        },
        crm: {
            enable_loyalty: false,
            loyalty_stamps_target: 0,
        },
    },
}
