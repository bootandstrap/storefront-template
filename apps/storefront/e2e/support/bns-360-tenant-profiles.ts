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
    | 'backup_restore_journey'
    | 'checkout_payment_collection_journey'
    | 'crud_journey'
    | 'customer_account_journey'
    | 'customer_panel_operations_journey'
    | 'grant_unlock'
    | 'hardware_terminal_certification'
    | 'limit_enforcement'
    | 'module_primary_journey'
    | 'owner_panel_operations_journey'
    | 'order_lifecycle_journey'
    | 'runtime_config'
    | 'api_health'
    | 'terminal_simulator_journey'
    | 'virtual_printer_lab'

export interface Bns360FunctionalEvidenceTarget {
    kind: Bns360FunctionalEvidenceKind
    target: string
    reversible: boolean
    scope?: 'sandbox' | 'simulator' | 'read_only' | 'live_mutation' | 'hardware'
    gate?: 'none' | 'owner_auth' | 'customer_auth' | 'test_mode_keys' | 'human_authorization' | 'physical_reader'
    routes?: string[]
    method?: 'GET' | 'POST'
    expectedJsonPaths?: string[]
    expectedJsonValues?: Record<string, string | number | boolean | null>
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
    sales_channels: ['/es/panel/canales', '/es/panel/ajustes?tab=tienda'],
    seo: ['/es/panel/seo', '/es/panel/analiticas'],
}

const MODULE_FUNCTIONAL_EVIDENCE_MAP: Record<string, Bns360FunctionalEvidenceTarget[]> = {
    auth_advanced: [
        {
            kind: 'grant_unlock',
            target: 'enable_auth_advanced gates /panel/auth through materialized product grants',
            reversible: true,
            routes: ['/api/panel/modules/grants/self-test?required=auth_advanced'],
            method: 'GET',
            expectedJsonPaths: [
                'status',
                'summary.requiredCount',
                'summary.activeCount',
                'summary.missingCount',
                'modules.0.key',
            ],
            expectedJsonValues: {
                status: 'verified',
                'summary.requiredCount': 1,
                'summary.missingCount': 0,
            },
        },
        { kind: 'runtime_config', target: 'OAuth/provider flags reflected in auth panel config', reversible: true },
    ],
    automation: [
        {
            kind: 'module_primary_journey',
            target: 'event-to-channel mapping can be edited and rendered',
            reversible: true,
            routes: ['/api/panel/bns-360/automation-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.webhook.enabled',
                'runtime.webhook.urlHost',
                'runtime.webhook.secretRedacted',
                'runtime.eventMapping.orderPlaced',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.webhook.secretRedacted': true,
                'cleanup.status': 'verified',
            },
        },
    ],
    capacidad: [
        {
            kind: 'api_health',
            target: '/api/panel/vault and capacity limits are reachable when granted',
            reversible: true,
            routes: ['/api/panel/vault'],
        },
        {
            kind: 'limit_enforcement',
            target: '/api/panel/vault reflects storage capacity from materialized plan_limits',
            reversible: true,
            routes: ['/api/panel/vault'],
            expectedJsonPaths: [
                'usage.total.mb',
                'limit_mb',
                'usage_percent',
            ],
        },
    ],
    chatbot: [
        {
            kind: 'module_primary_journey',
            target: 'chatbot owner config changes render in runtime and roll back',
            reversible: true,
            routes: ['/api/panel/bns-360/chatbot-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.chatbotName',
                'runtime.welcomeMessage',
                'usage.limit',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'cleanup.status': 'verified',
            },
        },
        { kind: 'runtime_config', target: 'chatbot config persists and changes panel/runtime behavior', reversible: true },
        {
            kind: 'limit_enforcement',
            target: 'max_chatbot_messages_month exposed by authenticated chat usage API',
            reversible: true,
            routes: ['/api/chat/usage'],
            expectedJsonPaths: [
                'messageCount',
                'limit',
                'authenticated',
            ],
            expectedJsonValues: {
                authenticated: true,
            },
        },
    ],
    crm: [
        {
            kind: 'crud_journey',
            target: 'tenant-scoped CRM contact create/update/delete',
            reversible: true,
            routes: ['/api/panel/bns-360/crm-crud'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
    ],
    ecommerce: [
        {
            kind: 'crud_journey',
            target: 'tenant-scoped Medusa product create/update/delete through panel API',
            reversible: true,
            scope: 'sandbox',
            gate: 'owner_auth',
            routes: ['/api/panel/bns-360/ecommerce-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.product.id',
                'runtime.product.handle',
                'runtime.product.status',
                'runtime.certificationCoverage.productCrud',
                'runtime.certificationCoverage.checkoutPaymentCollection',
                'runtime.certificationCoverage.customerAccount',
                'runtime.certificationCoverage.orderLifecycle',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.product.status': 'draft',
                'runtime.certificationCoverage.productCrud': 'verified',
                'runtime.certificationCoverage.checkoutPaymentCollection': 'manual_required',
                'runtime.certificationCoverage.customerAccount': 'manual_required',
                'runtime.certificationCoverage.orderLifecycle': 'manual_required',
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
        {
            kind: 'module_primary_journey',
            target: 'storefront catalog reflects a Medusa product mutation before rollback',
            reversible: true,
            scope: 'sandbox',
            gate: 'owner_auth',
            routes: ['/api/panel/bns-360/ecommerce-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.catalog.readableAfterCreate',
                'runtime.catalog.updatedTitle',
                'runtime.certificationCoverage.storefrontCatalog',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.catalog.readableAfterCreate': true,
                'runtime.certificationCoverage.storefrontCatalog': 'verified',
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
        {
            kind: 'checkout_payment_collection_journey',
            target: 'Medusa cart completion links payment collection/session to an order through storefront checkout',
            reversible: true,
            scope: 'simulator',
            gate: 'test_mode_keys',
            routes: ['/api/panel/bns-360/checkout-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runtime.cart.created',
                'runtime.cart.itemAttached',
                'runtime.paymentCollection.status',
                'runtime.paymentCollection.providerMode',
                'runtime.paymentCollection.paymentSessionInitialized',
                'runtime.paymentCollection.liveMutation',
                'runtime.order.completed',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.paymentCollection.status': 'verified',
                'runtime.paymentCollection.providerMode': 'simulator',
                'runtime.paymentCollection.liveMutation': false,
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
        {
            kind: 'customer_account_journey',
            target: 'Store customer can authenticate, manage address data and read orders without cross-tenant leakage',
            reversible: true,
            scope: 'sandbox',
            gate: 'owner_auth',
            routes: ['/api/panel/bns-360/customer-account-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runtime.customer.canaryCreated',
                'runtime.customer.authenticated',
                'runtime.address.created',
                'runtime.address.updated',
                'runtime.address.deleted',
                'runtime.orderRead.tenantScoped',
                'runtime.crossTenantLeakage',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.crossTenantLeakage': false,
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
        {
            kind: 'order_lifecycle_journey',
            target: 'Medusa order lifecycle covers placement, fulfillment/cancel boundary, refund/return boundary and analytics subscribers',
            reversible: true,
            scope: 'simulator',
            gate: 'test_mode_keys',
            routes: ['/api/panel/bns-360/order-lifecycle-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runtime.orderPlaced',
                'runtime.paymentCollectionLinked',
                'runtime.fulfillmentBoundary',
                'runtime.cancelBoundary',
                'runtime.refundReturnBoundary',
                'runtime.subscriberEvents.orderPlaced',
                'runtime.subscriberEvents.analyticsRecorded',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.paymentCollectionLinked': true,
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
    ],
    email_marketing: [
        {
            kind: 'runtime_config',
            target: 'email sender/domain/template config persists without leaking secrets',
            reversible: true,
            routes: ['/api/panel/bns-360/email-marketing-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'runtime.preferences.templateDesign',
                'runtime.secretRedacted',
                'cleanup.status',
            ],
            expectedJsonValues: {
                'runtime.secretRedacted': true,
                'cleanup.status': 'verified',
            },
        },
        {
            kind: 'limit_enforcement',
            target: 'max_email_sends_month reflected in module usage',
            reversible: true,
            routes: ['/api/panel/bns-360/email-marketing-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'runtime.limits.maxEmailSendsMonth',
                'cleanup.status',
            ],
            expectedJsonValues: {
                'cleanup.status': 'verified',
            },
        },
        {
            kind: 'module_primary_journey',
            target: 'email preferences and automations persist without leaking provider secrets',
            reversible: true,
            routes: ['/api/panel/bns-360/email-marketing-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.preferences.templateDesign',
                'runtime.automation.reviewRequestEnabled',
                'runtime.limits.maxEmailSendsMonth',
                'runtime.secretRedacted',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.secretRedacted': true,
                'cleanup.status': 'verified',
            },
        },
    ],
    i18n: [
        {
            kind: 'module_primary_journey',
            target: 'language/currency config changes rendered locale behavior',
            reversible: true,
            routes: ['/api/panel/bns-360/i18n-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.language',
                'runtime.storefrontLanguage',
                'runtime.defaultCurrency',
                'runtime.publicHtmlLang',
                'limits.maxLanguages',
                'limits.maxCurrencies',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.language': 'de',
                'runtime.storefrontLanguage': 'de',
                'runtime.defaultCurrency': 'chf',
                'runtime.publicHtmlLang': 'de',
                'cleanup.status': 'verified',
            },
        },
    ],
    pos: [
        {
            kind: 'module_primary_journey',
            target: 'POS cart, payment selection and receipt tooling complete without physical hardware',
            reversible: true,
            scope: 'simulator',
            gate: 'owner_auth',
            routes: ['/api/panel/bns-360/pos-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.cart.itemCount',
                'runtime.cart.total',
                'runtime.paymentMethods.enabledIds',
                'runtime.terminalSimulator.mode',
                'runtime.terminalSimulator.paymentIntentUsage',
                'runtime.virtualPrinter.jobs.0.type',
                'runtime.virtualPrinter.jobs.1.type',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.terminalSimulator.mode': 'simulator',
                'runtime.terminalSimulator.paymentIntentUsage': 'card_present',
                'runtime.virtualPrinter.jobs.0.type': 'sale_receipt',
                'runtime.virtualPrinter.jobs.1.type': 'cash_drawer',
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
        {
            kind: 'terminal_simulator_journey',
            target: 'Stripe Terminal simulator validates reader discovery, card_present payment lifecycle and refund boundary',
            reversible: true,
            scope: 'simulator',
            gate: 'test_mode_keys',
            routes: ['/api/panel/bns-360/pos-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runtime.terminalSimulator.provider',
                'runtime.terminalSimulator.mode',
                'runtime.terminalSimulator.paymentIntentUsage',
                'runtime.terminalSimulator.steps',
                'runtime.terminalSimulator.liveMutation',
                'runtime.terminalSimulator.hardwareRequired',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.terminalSimulator.provider': 'stripe_terminal',
                'runtime.terminalSimulator.mode': 'simulator',
                'runtime.terminalSimulator.paymentIntentUsage': 'card_present',
                'runtime.terminalSimulator.liveMutation': false,
                'runtime.terminalSimulator.hardwareRequired': false,
            },
        },
        {
            kind: 'hardware_terminal_certification',
            target: 'Physical POS reader certification requires provider, location, reader id and explicit payment/refund authorization',
            reversible: true,
            scope: 'hardware',
            gate: 'human_authorization',
        },
        {
            kind: 'virtual_printer_lab',
            target: 'POS receipt and cash-drawer tooling verifies through virtual printer lab',
            reversible: true,
            routes: ['/api/panel/pos/virtual-printer/self-test?printerId=thermal-80mm&openCashDrawer=1'],
            expectedJsonPaths: [
                'status',
                'printer.id',
                'jobs.0.type',
                'jobs.0.text',
                'jobs.1.type',
            ],
        },
        { kind: 'grant_unlock', target: 'enable_pos gates /panel/pos', reversible: true },
    ],
    pos_kiosk: [
        {
            kind: 'module_primary_journey',
            target: 'kiosk mode is materialized through the POS runtime surface',
            reversible: true,
            routes: ['/api/panel/bns-360/pos-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runtime.kiosk.available',
                'runtime.kiosk.idleTimer',
                'cleanup.status',
                'residue.zero',
            ],
            expectedJsonValues: {
                status: 'verified',
                'runtime.kiosk.available': true,
                'cleanup.status': 'verified',
                'residue.zero': true,
            },
        },
        { kind: 'grant_unlock', target: 'pos_kiosk depends on POS grant and does not expose standalone /pos route', reversible: true },
    ],
    rrss: [
        {
            kind: 'module_primary_journey',
            target: 'social links persist and render in public JSON-LD sameAs',
            reversible: true,
            routes: ['/api/panel/bns-360/rrss-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.socialFacebook',
                'runtime.socialInstagram',
                'runtime.sameAs',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'cleanup.status': 'verified',
            },
        },
    ],
    sales_channels: [
        {
            kind: 'module_primary_journey',
            target: 'payment/channel config persists and affects checkout options',
            reversible: true,
            routes: ['/api/panel/bns-360/sales-channels-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.paymentMethods.enabledIds',
                'runtime.channelConfig.preferredContact',
                'runtime.channelConfig.whatsappGreetingRedacted',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'cleanup.status': 'verified',
            },
        },
        { kind: 'grant_unlock', target: 'sales channel routes unlock from grants', reversible: true },
    ],
    seo: [
        {
            kind: 'module_primary_journey',
            target: 'SEO metadata config changes render in public page metadata',
            reversible: true,
            routes: ['/api/panel/bns-360/seo-primary'],
            method: 'POST',
            expectedJsonPaths: [
                'status',
                'runId',
                'runtime.metaTitle',
                'runtime.metaDescription',
                'runtime.publicTitle',
                'runtime.publicDescription',
                'runtime.publicOgTitle',
                'runtime.publicOgDescription',
                'cleanup.status',
            ],
            expectedJsonValues: {
                status: 'verified',
                'cleanup.status': 'verified',
            },
        },
    ],
}

const MODULE_SETUP_ROUTE_HINTS: Record<string, string[]> = {
    ecommerce: ['/panel/mi-tienda?tab=productos', '/panel/mi-tienda?tab=categorias', '/panel/ajustes?tab=envios'],
    sales_channels: ['/panel/canales', '/panel/ajustes?tab=tienda'],
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
