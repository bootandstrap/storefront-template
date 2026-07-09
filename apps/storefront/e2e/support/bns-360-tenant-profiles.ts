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
    functionalEvidence: Bns360FunctionalEvidenceTarget[]
}

const CERTIFICATION_EVIDENCE = [
    'marketplace_visibility',
    'commercial_materialization',
    'core_configuration',
    'telemetry_health',
    'primary_journey',
] as const

export type Bns360FunctionalEvidenceKind =
    | 'crud_journey'
    | 'grant_unlock'
    | 'limit_enforcement'
    | 'module_primary_journey'
    | 'runtime_config'
    | 'api_health'

export interface Bns360FunctionalEvidenceTarget {
    kind: Bns360FunctionalEvidenceKind
    target: string
    reversible: boolean
    routes?: string[]
    expectedJsonPaths?: string[]
}

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

const MODULE_FUNCTIONAL_EVIDENCE_MAP: Record<string, Bns360FunctionalEvidenceTarget[]> = {
    auth_advanced: [
        { kind: 'grant_unlock', target: 'enable_auth_advanced gates /panel/auth', reversible: true },
        { kind: 'runtime_config', target: 'OAuth/provider flags reflected in auth panel config', reversible: true },
    ],
    automation: [
        { kind: 'runtime_config', target: 'notification channel config persists tenant-scoped values', reversible: true },
        { kind: 'module_primary_journey', target: 'event-to-channel mapping can be edited and rendered', reversible: true },
    ],
    capacidad: [
        {
            kind: 'api_health',
            target: '/api/panel/vault and capacity limits are reachable when granted',
            reversible: true,
            routes: ['/api/panel/vault'],
        },
        { kind: 'limit_enforcement', target: 'traffic/storage/backup limits reflected from plan_limits', reversible: true },
    ],
    chatbot: [
        { kind: 'runtime_config', target: 'chatbot config persists and changes panel/runtime behavior', reversible: true },
        { kind: 'limit_enforcement', target: 'max_chatbot_messages_month enforced by chat API', reversible: true },
    ],
    crm: [
        { kind: 'crud_journey', target: 'tenant-scoped CRM contact create/update/delete', reversible: true },
    ],
    ecommerce: [
        { kind: 'crud_journey', target: 'Medusa product/category create/update/delete through panel/API', reversible: true },
        { kind: 'module_primary_journey', target: 'storefront catalog reflects Medusa changes', reversible: true },
    ],
    email_marketing: [
        { kind: 'runtime_config', target: 'email sender/domain/template config persists without leaking secrets', reversible: true },
        { kind: 'limit_enforcement', target: 'max_email_sends_month reflected in module usage', reversible: true },
    ],
    i18n: [
        { kind: 'runtime_config', target: 'language/currency config changes rendered locale behavior', reversible: true },
    ],
    pos: [
        { kind: 'module_primary_journey', target: 'POS cart and checkout flow completes without physical hardware', reversible: true },
        { kind: 'grant_unlock', target: 'enable_pos gates /panel/pos', reversible: true },
    ],
    pos_kiosk: [
        { kind: 'module_primary_journey', target: 'kiosk mode path is available through POS surface', reversible: true },
        { kind: 'grant_unlock', target: 'pos_kiosk depends on POS grant and does not expose standalone /pos route', reversible: true },
    ],
    rrss: [
        { kind: 'runtime_config', target: 'social links persist and render on storefront surfaces', reversible: true },
    ],
    sales_channels: [
        { kind: 'runtime_config', target: 'payment/channel config persists and affects checkout options', reversible: true },
        { kind: 'grant_unlock', target: 'sales channel routes unlock from grants', reversible: true },
    ],
    seo: [
        { kind: 'runtime_config', target: 'SEO metadata config persists and renders in public page metadata', reversible: true },
        { kind: 'module_primary_journey', target: 'analytics/SEO panels load tenant-scoped Medusa counts', reversible: true },
    ],
}

const MODULE_SETUP_ROUTE_HINTS: Record<string, string[]> = {
    ecommerce: ['/panel/mi-tienda?tab=productos', '/panel/mi-tienda?tab=categorias', '/panel/ajustes?tab=envios'],
    sales_channels: ['/panel/mensajes', '/panel/ajustes?tab=tienda'],
    chatbot: ['/panel/chatbot', '/'],
    pos: ['/panel/pos'],
    pos_kiosk: ['/panel/pos'],
    crm: ['/panel/crm'],
    email_marketing: ['/panel/ajustes?tab=email'],
    i18n: ['/panel/ajustes?tab=idiomas'],
    seo: ['/panel/seo', '/panel/ajustes?tab=analiticas'],
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
        scenarioKeys: [
            'governance.central_policy_read',
            'commerce.modules_marketplace_and_limits',
            'pos.core_checkout',
            'pos.offline_sync',
            'pos.refunds_and_history',
            ...contract.modules.catalog.map(module => `module.${module.key}`),
        ],
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
        functionalEvidence: MODULE_FUNCTIONAL_EVIDENCE_MAP[module.key] ?? [],
    }))
