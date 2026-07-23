import {
    BNS_360_MODULE_CERTIFICATION_MATRIX,
    type Bns360FunctionalEvidenceTarget,
} from './support/bns-360-tenant-profiles'

export interface Bns360RuntimeScenario {
    key: string
    domain: 'storefront' | 'panel' | 'customer' | 'recovery' | 'ops' | 'governance' | 'commerce' | 'pos' | 'modules'
    routes: string[]
    requiresAuth?: boolean
    authRole?: 'owner' | 'customer'
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

const POS_OFFLINE_SYNC_FUNCTIONAL_EVIDENCE: Bns360FunctionalEvidenceTarget = {
    kind: 'terminal_simulator_journey',
    target: 'POS offline queue and sync simulator verifies idempotent zero-pending sync without external mutation',
    reversible: true,
    scope: 'simulator',
    gate: 'owner_auth',
    routes: ['/api/panel/bns-360/pos-primary'],
    method: 'POST',
    expectedJsonPaths: [
        'status',
        'runtime.offlineSync.queuedSales',
        'runtime.offlineSync.syncMode',
        'runtime.offlineSync.idempotencyKeyPresent',
        'runtime.offlineSync.pendingAfterSync',
        'runtime.terminalSimulator.mode',
        'runtime.terminalSimulator.liveMutation',
        'cleanup.status',
        'residue.zero',
    ],
    expectedJsonValues: {
        status: 'verified',
        'runtime.offlineSync.syncMode': 'simulator',
        'runtime.offlineSync.idempotencyKeyPresent': true,
        'runtime.offlineSync.pendingAfterSync': 0,
        'runtime.terminalSimulator.mode': 'simulator',
        'runtime.terminalSimulator.liveMutation': false,
        'cleanup.status': 'verified',
        'residue.zero': true,
    },
}

const POS_REFUNDS_HISTORY_FUNCTIONAL_EVIDENCE: Bns360FunctionalEvidenceTarget = {
    kind: 'terminal_simulator_journey',
    target: 'POS refund boundary and sales history simulator verify readable history without physical hardware or live refunds',
    reversible: true,
    scope: 'simulator',
    gate: 'owner_auth',
    routes: ['/api/panel/bns-360/pos-primary'],
    method: 'POST',
    expectedJsonPaths: [
        'status',
        'runtime.refundsAndHistory.historyReadable',
        'runtime.refundsAndHistory.refundBoundary',
        'runtime.refundsAndHistory.liveMutation',
        'runtime.refundsAndHistory.receiptLinked',
        'runtime.terminalSimulator.hardwareRequired',
        'cleanup.status',
        'residue.zero',
    ],
    expectedJsonValues: {
        status: 'verified',
        'runtime.refundsAndHistory.historyReadable': true,
        'runtime.refundsAndHistory.refundBoundary': 'simulator_only',
        'runtime.refundsAndHistory.liveMutation': false,
        'runtime.refundsAndHistory.receiptLinked': true,
        'runtime.terminalSimulator.hardwareRequired': false,
        'cleanup.status': 'verified',
        'residue.zero': true,
    },
}

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
        key: 'panel.owner_operations',
        domain: 'panel',
        routes: ['/es/panel', '/es/panel/ajustes', '/es/panel/modulos'],
        requiresAuth: true,
        authRole: 'owner',
        functionalEvidence: [
            {
                kind: 'owner_panel_operations_journey',
                target: 'Owner can authenticate, open core panel surfaces and read tenant-scoped operational limits',
                reversible: false,
                gate: 'owner_auth',
                routes: [
                    '/es/panel',
                    '/es/panel/ajustes',
                    '/es/panel/modulos',
                    '/es/panel/mi-tienda?tab=productos',
                    '/es/panel/mi-tienda?tab=inventario',
                ],
            },
        ],
    },
    {
        key: 'customer.account_operations',
        domain: 'customer',
        routes: ['/es/cuenta', '/es/cuenta/direcciones', '/es/cuenta/pedidos'],
        requiresAuth: true,
        authRole: 'customer',
        functionalEvidence: [
            {
                kind: 'customer_panel_operations_journey',
                target: 'QA customer can authenticate, open account/address/order panels and is blocked from owner panel',
                reversible: false,
                gate: 'customer_auth',
                routes: ['/es/cuenta', '/es/cuenta/direcciones', '/es/cuenta/pedidos'],
            },
        ],
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
        routes: ['/api/panel/vault'],
        requiresAuth: true,
        transport: 'api',
        functionalEvidence: [
            {
                kind: 'backup_restore_journey',
                target: '/api/panel/vault/download and /api/panel/vault/restore require backup ids/payloads and must be certified through a reversible backup/restore journey',
                reversible: true,
                scope: 'simulator',
                gate: 'owner_auth',
                routes: ['/api/panel/bns-360/backup-restore-primary'],
                method: 'POST',
                expectedJsonPaths: [
                    'status',
                    'runtime.backup.metadataReadable',
                    'runtime.backup.payloadRedacted',
                    'runtime.restoreDryRun.safe',
                    'runtime.restoreDryRun.mutation',
                    'cleanup.status',
                    'residue.zero',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'runtime.backup.metadataReadable': true,
                    'runtime.backup.payloadRedacted': true,
                    'runtime.restoreDryRun.safe': true,
                    'runtime.restoreDryRun.mutation': false,
                    'cleanup.status': 'verified',
                    'residue.zero': true,
                },
            },
        ],
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
        key: 'governance.central_policy_read',
        domain: 'governance',
        routes: ['/api/panel/limits?resources=products,categories,badges'],
        requiresAuth: true,
        transport: 'api',
        functionalEvidence: [
            {
                kind: 'runtime_config',
                target: 'get_tenant_governance materializes plan_limits into panel policy limits',
                reversible: false,
                routes: ['/api/panel/limits?resources=products,categories,badges'],
                expectedJsonPaths: [
                    'products.limitKey',
                    'products.limit',
                    'categories.limitKey',
                    'categories.limit',
                    'badges.limitKey',
                    'badges.limit',
                ],
            },
        ],
    },
    {
        key: 'commerce.modules_marketplace_and_limits',
        domain: 'commerce',
        routes: ['/es/panel/modulos', '/es/panel/ajustes?tab=suscripcion'],
        requiresAuth: true,
        functionalEvidence: [
            {
                kind: 'grant_unlock',
                target: '/api/module-purchase -> BSWEB /api/commercial-checkout -> grants materialization',
                reversible: true,
            },
            {
                kind: 'runtime_config',
                target: 'central grants materialized into active tenant modules',
                reversible: false,
                routes: ['/api/panel/modules/grants/self-test?required=contract'],
                expectedJsonPaths: [
                    'status',
                    'summary.requiredCount',
                    'summary.activeCount',
                    'summary.missingCount',
                    'modules.0.key',
                ],
                expectedJsonValues: {
                    status: 'verified',
                    'summary.missingCount': 0,
                },
            },
            {
                kind: 'limit_enforcement',
                target: '/api/panel/limits reflects BSWEB materialized plan_limits after grant change',
                reversible: true,
                routes: ['/api/panel/limits?resources=products,categories,badges'],
                expectedJsonPaths: [
                    'products.limitKey',
                    'products.limit',
                    'categories.limitKey',
                    'categories.limit',
                    'badges.limitKey',
                    'badges.limit',
                ],
            },
        ],
    },
    {
        key: 'pos.core_checkout',
        domain: 'pos',
        routes: ['/es/panel/pos'],
        requiresAuth: true,
        functionalEvidence: [
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
        ],
    },
    {
        key: 'pos.offline_sync',
        domain: 'pos',
        routes: ['/es/panel/pos'],
        requiresAuth: true,
        functionalEvidence: [
            POS_OFFLINE_SYNC_FUNCTIONAL_EVIDENCE,
        ],
    },
    {
        key: 'pos.refunds_and_history',
        domain: 'pos',
        routes: ['/es/panel/ventas', '/es/panel/devoluciones'],
        requiresAuth: true,
        functionalEvidence: [
            POS_REFUNDS_HISTORY_FUNCTIONAL_EVIDENCE,
        ],
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
        functionalEvidence: moduleScenario.functionalEvidence,
    })),
]

export { BNS_360_MODULE_CERTIFICATION_MATRIX } from './support/bns-360-tenant-profiles'
