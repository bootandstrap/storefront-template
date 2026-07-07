import {
    BNS_360_MODULE_CERTIFICATION_MATRIX,
    type Bns360FunctionalEvidenceTarget,
} from './support/bns-360-tenant-profiles'

export interface Bns360RuntimeScenario {
    key: string
    domain: 'storefront' | 'panel' | 'recovery' | 'ops' | 'commerce' | 'pos' | 'modules'
    routes: string[]
    requiresAuth?: boolean
    transport?: 'page' | 'api'
    profileKey?: string
    apiHeadersEnv?: Record<string, string>
    functionalEvidence?: Bns360FunctionalEvidenceTarget[]
}

export const BNS_360_REQUIRED_MODULE_KEYS = [
    'auth_advanced',
    'automation',
    'capacidad',
    'chatbot',
    'crm',
    'ecommerce',
    'email_marketing',
    'i18n',
    'pos',
    'pos_kiosk',
    'rrss',
    'sales_channels',
    'seo',
] as const

export const BNS_360_RUNTIME_MATRIX: Bns360RuntimeScenario[] = [
    {
        key: 'storefront.home',
        domain: 'storefront',
        routes: ['/es'],
    },
    {
        key: 'storefront.catalog_navigation',
        domain: 'storefront',
        routes: ['/es/productos', '/es/categorias'],
    },
    {
        key: 'storefront.checkout_handoff',
        domain: 'storefront',
        routes: ['/es/carrito', '/es/checkout'],
    },
    {
        key: 'panel.dashboard',
        domain: 'panel',
        routes: ['/es/panel'],
        requiresAuth: true,
    },
    {
        key: 'panel.catalog_crud',
        domain: 'panel',
        routes: ['/es/panel/catalogo', '/es/panel/productos', '/es/panel/categorias'],
        requiresAuth: true,
    },
    {
        key: 'panel.orders_customers_inventory',
        domain: 'panel',
        routes: ['/es/panel/pedidos', '/es/panel/clientes', '/es/panel/inventario'],
        requiresAuth: true,
    },
    {
        key: 'panel.settings_and_auth',
        domain: 'panel',
        routes: ['/es/panel/ajustes', '/es/panel/auth', '/es/panel/tienda'],
        requiresAuth: true,
    },
    {
        key: 'recovery.backup_download_restore',
        domain: 'recovery',
        routes: ['/api/panel/vault', '/api/panel/vault/download', '/api/panel/vault/restore'],
        requiresAuth: true,
        transport: 'api',
    },
    {
        key: 'ops.health_readiness_liveness',
        domain: 'ops',
        routes: ['/api/health', '/api/health/ready', '/api/health/live', '/api/v1/governance/health'],
        transport: 'api',
        apiHeadersEnv: {
            'x-health-token': 'BNS_360_HEALTH_CHECK_TOKEN',
        },
    },
    {
        key: 'commerce.modules_marketplace_and_limits',
        domain: 'commerce',
        routes: ['/es/panel/modulos', '/es/panel/suscripcion'],
        requiresAuth: true,
        functionalEvidence: [
            {
                kind: 'grant_unlock',
                target: '/api/module-purchase -> BSWEB /api/commercial-checkout -> grants materialization',
                reversible: true,
            },
            {
                kind: 'limit_enforcement',
                target: '/api/panel/limits reflects BSWEB materialized plan_limits after grant change',
                reversible: true,
                routes: ['/api/panel/limits'],
            },
        ],
    },
    {
        key: 'pos.core_checkout',
        domain: 'pos',
        routes: ['/es/panel/pos'],
        requiresAuth: true,
    },
    {
        key: 'pos.offline_sync',
        domain: 'pos',
        routes: ['/es/panel/pos'],
        requiresAuth: true,
    },
    {
        key: 'pos.refunds_and_history',
        domain: 'pos',
        routes: ['/es/panel/ventas', '/es/panel/devoluciones'],
        requiresAuth: true,
    },
    ...BNS_360_MODULE_CERTIFICATION_MATRIX.map(moduleScenario => ({
        key: `module.${moduleScenario.moduleKey}`,
        domain: 'modules' as const,
        routes: [
            moduleScenario.marketplaceRoute,
            moduleScenario.configurationRoute,
            ...moduleScenario.runtimeRoutes,
        ],
        requiresAuth: true,
        profileKey: moduleScenario.profileKey,
    })),
]

export { BNS_360_MODULE_CERTIFICATION_MATRIX } from './support/bns-360-tenant-profiles'
