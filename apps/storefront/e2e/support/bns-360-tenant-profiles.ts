import contract from '../../src/lib/governance-contract.json'

export interface Bns360ProfileModule {
    key: string
    tier: string
}

export interface Bns360TenantProfile {
    key: string
    description: string
    modules: Bns360ProfileModule[]
    scenarioKeys: string[]
}

export interface Bns360ModuleCertificationScenario {
    moduleKey: string
    profileKey: string
    marketplaceRoute: string
    configurationRoute: string
    runtimeRoutes: string[]
    requiredEvidence: string[]
}

const CERTIFICATION_EVIDENCE = [
    'marketplace_visibility',
    'commercial_materialization',
    'core_configuration',
    'telemetry_health',
    'primary_journey',
] as const

const MODULE_RUNTIME_ROUTE_MAP: Record<string, string[]> = {
    auth_advanced: ['/es/panel/auth'],
    automation: ['/es/panel/automatizaciones'],
    capacidad: ['/es/panel/capacidad'],
    chatbot: ['/es/panel/chatbot'],
    crm: ['/es/panel/crm'],
    ecommerce: ['/es', '/es/productos', '/es/panel/mi-tienda?tab=productos'],
    email_marketing: ['/es/panel/ajustes?tab=email', '/es/panel/email'],
    i18n: ['/en', '/es/panel/ajustes?tab=tienda'],
    pos: ['/es/panel/pos'],
    pos_kiosk: ['/es/panel/pos'],
    rrss: ['/es/panel/redes-sociales'],
    sales_channels: ['/es/panel/mensajes', '/es/panel/canales', '/es/panel/ajustes?tab=tienda'],
    seo: ['/es/panel/seo', '/es/panel/analiticas'],
}

const MODULE_SETUP_ROUTE_HINTS: Record<string, string[]> = {
    ecommerce: ['/panel/mi-tienda?tab=productos', '/panel/mi-tienda?tab=categorias', '/panel/ajustes?tab=envios'],
    sales_channels: ['/panel/mensajes', '/panel/ajustes?tab=tienda'],
    chatbot: ['/panel/chatbot', '/'],
    pos: ['/panel/pos'],
    pos_kiosk: ['/panel/pos'],
    crm: ['/panel/crm'],
    email_marketing: ['/panel/ajustes?tab=email'],
    i18n: ['/panel/ajustes?tab=tienda'],
    seo: ['/panel/seo', '/panel/analiticas'],
    rrss: ['/panel/redes-sociales'],
    automation: ['/panel/automatizaciones'],
    auth_advanced: ['/panel/auth'],
    capacidad: ['/panel/capacidad'],
}

function prefixEs(route: string): string {
    if (route === '/') {
        return '/es'
    }

    if (route.startsWith('/panel/')) {
        return `/es${route}`
    }

    return route
}

function uniqueRoutes(routes: string[]): string[] {
    return [...new Set(routes)]
}

function getHighestTierModules(): Bns360ProfileModule[] {
    return contract.modules.catalog.map(module => ({
        key: module.key,
        tier: module.tiers[module.tiers.length - 1].key,
    }))
}

function buildModuleRuntimeRoutes(moduleKey: string): string[] {
    const quickActionRoutes = (MODULE_SETUP_ROUTE_HINTS[moduleKey] ?? []).map(prefixEs)

    return uniqueRoutes([
        ...(MODULE_RUNTIME_ROUTE_MAP[moduleKey] ?? []),
        ...quickActionRoutes,
    ])
}

export const BNS_360_TENANT_PROFILES: Bns360TenantProfile[] = [
    {
        key: 'launch_foundation',
        description: 'Disposable launch tenant with the minimum reusable commerce surface for repo -> deploy -> auth -> seed -> handoff.',
        modules: [
            { key: 'ecommerce', tier: 'basic' },
            { key: 'sales_channels', tier: 'basic' },
        ],
        scenarioKeys: [
            'storefront.home',
            'storefront.catalog_navigation',
            'storefront.checkout_handoff',
            'panel.dashboard',
            'panel.catalog_crud',
            'panel.settings_and_auth',
        ],
    },
    {
        key: 'recovery_operator',
        description: 'Tenant prepared for health, backup, restore and degraded-state certification.',
        modules: [
            { key: 'capacidad', tier: 'basic' },
            { key: 'ecommerce', tier: 'basic' },
        ],
        scenarioKeys: [
            'recovery.backup_download_restore',
            'ops.health_readiness_liveness',
        ],
    },
    {
        key: 'pos_operator_full',
        description: 'Tenant with the reusable POS surface enabled for operator and kiosk certification lanes.',
        modules: [
            { key: 'pos', tier: 'enterprise' },
            { key: 'pos_kiosk', tier: 'pro' },
            { key: 'sales_channels', tier: 'pro' },
        ],
        scenarioKeys: [
            'pos.core_checkout',
            'pos.offline_sync',
            'pos.refunds_and_history',
            'module.pos',
            'module.pos_kiosk',
        ],
    },
    {
        key: 'full_catalog_highest_tier',
        description: 'Disposable certification tenant covering the full reusable module catalog at the highest published tier per module.',
        modules: getHighestTierModules(),
        scenarioKeys: contract.modules.catalog.map(module => `module.${module.key}`),
    },
]

export const BNS_360_MODULE_CERTIFICATION_MATRIX: Bns360ModuleCertificationScenario[] =
    contract.modules.catalog.map(module => ({
        moduleKey: module.key,
        profileKey: module.key === 'pos' || module.key === 'pos_kiosk'
            ? 'pos_operator_full'
            : 'full_catalog_highest_tier',
        marketplaceRoute: '/es/panel/modulos',
        configurationRoute: `/es/panel/modulos/${module.key}`,
        runtimeRoutes: buildModuleRuntimeRoutes(module.key),
        requiredEvidence: [...CERTIFICATION_EVIDENCE],
    }))
