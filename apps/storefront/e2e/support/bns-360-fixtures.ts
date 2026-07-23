import { dirname } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, type APIRequestContext, type Page, type Response } from '@playwright/test'
import type { Bns360FunctionalEvidenceTarget } from './bns-360-tenant-profiles'

export const BNS_360_LANG = process.env.BNS_360_LANG || 'es'
export const BNS_360_OWNER_EMAIL = process.env.BNS_360_OWNER_EMAIL || process.env.PANEL_TEST_EMAIL || process.env.E2E_OWNER_EMAIL
export const BNS_360_OWNER_PASSWORD = process.env.BNS_360_OWNER_PASSWORD || process.env.PANEL_TEST_PASSWORD || process.env.E2E_OWNER_PASSWORD
export const BNS_360_CUSTOMER_EMAIL = process.env.BNS_360_CUSTOMER_EMAIL || process.env.E2E_CUSTOMER_EMAIL
export const BNS_360_CUSTOMER_PASSWORD = process.env.BNS_360_CUSTOMER_PASSWORD || process.env.E2E_CUSTOMER_PASSWORD

export type Bns360ExecutionMode = 'smoke' | 'functional'
export type Bns360AuthRole = 'owner' | 'customer'
export type Bns360RouteStatus = 'verified' | 'manual_required' | 'blocked'
export type Bns360FunctionalStatus = 'not_required' | 'not_run' | 'manual_required' | 'verified' | 'blocked'
export type Bns360MissingCredentialAction =
    | { action: 'run' }
    | { action: 'skip'; reason: string }
    | { action: 'fail'; reason: string }

type Bns360ExecutionEnv = {
    [key: string]: string | undefined
    BNS_360_FUNCTIONAL_JOURNEYS?: string
}
type Bns360FunctionalEvidenceRunEnv = {
    [key: string]: string | undefined
    BNS_360_FUNCTIONAL_EVIDENCE_KINDS?: string
    BNS_360_FUNCTIONAL_AUTOMATED_ONLY?: string
    BNS_360_FUNCTIONAL_EXCLUDE_TARGET_PATTERN?: string
}
type Bns360CredentialRequirement = {
    requiresAuth?: boolean
    hasCredentials: boolean
    executionMode: Bns360ExecutionMode
    authRole?: Bns360AuthRole
}
type Bns360ApiHeaderScenario = {
    apiHeadersEnv?: Record<string, string>
}
type Bns360StorageCookie = {
    name: string
    value: string
}
type Bns360OwnerStorageState = Awaited<ReturnType<ReturnType<Page['context']>['storageState']>>
type Bns360RouteRetryEnv = {
    [key: string]: string | undefined
    BNS_360_ROUTE_RETRY_MAX_ATTEMPTS?: string
    BNS_360_ROUTE_RETRY_FALLBACK_MS?: string
    BNS_360_ROUTE_RETRY_MAX_DELAY_MS?: string
    BNS_360_ROUTE_RETRY_MAX_TOTAL_WAIT_MS?: string
}
export type Bns360RouteRetryConfig = {
    maxAttempts: number
    fallbackDelayMs: number
    maxDelayMs: number
    maxTotalWaitMs: number
}
export const BNS_360_ROUTE_GOTO_OPTIONS = { waitUntil: 'domcontentloaded' } as const

let bns360OwnerStorageState: Bns360OwnerStorageState | null = null
let bns360CustomerStorageState: Bns360OwnerStorageState | null = null

export function getBns360ExecutionMode(env: Bns360ExecutionEnv = process.env): Bns360ExecutionMode {
    return env.BNS_360_FUNCTIONAL_JOURNEYS === '1' ? 'functional' : 'smoke'
}

export function resolveBns360ApiHeaders(
    scenario: Bns360ApiHeaderScenario | undefined,
    env: Record<string, string | undefined> = process.env
): Record<string, string> | undefined {
    const entries = Object.entries(scenario?.apiHeadersEnv ?? {})
        .flatMap(([header, envKey]) => {
            const value = env[envKey]
            return value ? [[header, value] as const] : []
        })

    return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export function serializeBns360CookieHeader(
    cookies: readonly Bns360StorageCookie[]
): string | undefined {
    const serialized = cookies
        .filter(cookie => cookie.name && cookie.value)
        .map(cookie => `${encodeURIComponent(cookie.name)}=${encodeURIComponent(cookie.value)}`)
        .join('; ')

    return serialized || undefined
}

export async function resolveBns360OwnerApiHeaders(
    page: Page,
    baseHeaders?: Record<string, string>
): Promise<Record<string, string> | undefined> {
    const cookieHeader = serializeBns360CookieHeader(await page.context().cookies())
    if (!cookieHeader) {
        return baseHeaders
    }

    return {
        ...baseHeaders,
        cookie: cookieHeader,
    }
}

export function hasOwnerCredentials() {
    return Boolean(BNS_360_OWNER_EMAIL && BNS_360_OWNER_PASSWORD)
}

export function hasCustomerCredentials() {
    return Boolean(BNS_360_CUSTOMER_EMAIL && BNS_360_CUSTOMER_PASSWORD)
}

export function getBns360MissingCredentialAction(
    requirement: Bns360CredentialRequirement
): Bns360MissingCredentialAction {
    if (!requirement.requiresAuth || requirement.hasCredentials) {
        return { action: 'run' }
    }

    if (requirement.executionMode === 'functional') {
        const role = requirement.authRole ?? 'owner'
        return {
            action: 'fail',
            reason: `${role === 'customer' ? 'Customer' : 'Owner'} credentials are required for authenticated 360 functional certification`,
        }
    }

    return {
        action: 'skip',
        reason: 'Owner credentials are required for authenticated 360 runtime smoke routes',
    }
}

export interface Bns360ScenarioEvidenceInput {
    scenarioKey: string
    baseUrl: string
    routes: string[]
    functionalEvidence?: Bns360FunctionalEvidenceTarget[]
    ownerEmail?: string | null
    ownerPassword?: string | null
    status: 'verified' | 'manual_required' | 'blocked'
    executionMode?: Bns360ExecutionMode
    routeStatus?: Bns360RouteStatus
    functionalStatus?: Bns360FunctionalStatus
}

export interface Bns360ScenarioEvidence {
    schema: 'bootandstrap.template.bns-360.scenario-evidence/v1'
    scenarioKey: string
    baseUrl: string
    generatedAt: string
    status: Bns360ScenarioEvidenceInput['status']
    routeStatus: Bns360RouteStatus
    functionalStatus: Bns360FunctionalStatus
    executionMode: Bns360ExecutionMode
    routes: string[]
    functionalEvidence: Bns360FunctionalEvidenceTarget[]
    credentialState: 'not_required' | 'missing' | 'provided_redacted'
}

export type Bns360EvidenceRouteCheck = {
    path: string
    status: number | Bns360RouteStatus
}

export type Bns360DeployedBuildInfo = {
    commitSha: string | null
    commitShortSha: string | null
    branch: string | null
    deployedAt: string | null
    source: string
}

export type Bns360ScenarioArtifactInput = {
    artifactPath?: string
    evidence: Bns360ScenarioEvidence
    templateCommit?: string
    tenantRef?: string
    cleanupStatus?: string
    routeChecks?: Bns360EvidenceRouteCheck[]
    deployedBuild?: Bns360DeployedBuildInfo
}

type Bns360RuntimeEvidenceScenario = {
    scenario: string
    generatedAt: string
    executionMode: Bns360ExecutionMode
    routeStatus: Bns360RouteStatus
    functionalStatus: Bns360FunctionalStatus
    status: Bns360ScenarioEvidence['status']
    paths: Bns360EvidenceRouteCheck[]
    functionalTargets: Array<{
        kind: Bns360FunctionalEvidenceTarget['kind']
        target: string
        method: Bns360FunctionalEvidenceTarget['method']
        routes: string[]
        expectedJsonPaths: string[]
    }>
    credentialState: Bns360ScenarioEvidence['credentialState']
    pass: boolean
    cleanupStatus: string
}

type Bns360RuntimeEvidenceArtifact = {
    schema: 'bootandstrap.template.bns-360.runtime-evidence/v1'
    version: 1
    templateCommit: string
    tenantRef: string
    baseUrl: string
    deployedBuild: Bns360DeployedBuildInfo
    generatedAt: string
    updatedAt: string
    scenarios: Bns360RuntimeEvidenceScenario[]
}

export function buildBns360ScenarioEvidence(input: Bns360ScenarioEvidenceInput): Bns360ScenarioEvidence {
    const requiresCredentials = Boolean(input.ownerEmail || input.ownerPassword)
    const credentialState = requiresCredentials
        ? input.ownerEmail && input.ownerPassword ? 'provided_redacted' : 'missing'
        : 'not_required'
    const executionMode = input.executionMode ?? getBns360ExecutionMode()
    const hasFunctionalTargets = Boolean(input.functionalEvidence?.length)
    const functionalStatus = input.functionalStatus ?? (
        hasFunctionalTargets
            ? executionMode === 'functional' ? 'manual_required' : 'not_run'
            : 'not_required'
    )

    return {
        schema: 'bootandstrap.template.bns-360.scenario-evidence/v1',
        scenarioKey: input.scenarioKey,
        baseUrl: input.baseUrl,
        generatedAt: new Date().toISOString(),
        status: input.status,
        routeStatus: input.routeStatus ?? input.status,
        functionalStatus,
        executionMode,
        routes: input.routes,
        functionalEvidence: input.functionalEvidence ?? [],
        credentialState,
    }
}

export function recordBns360ScenarioEvidenceArtifact(input: Bns360ScenarioArtifactInput): void {
    if (!input.artifactPath) {
        return
    }

    const scenario = buildBns360RuntimeEvidenceScenario(input)
    const existing = readBns360RuntimeEvidenceArtifact(input.artifactPath)
    const generatedAt = existing?.generatedAt ?? new Date().toISOString()
    const scenarios = existing?.scenarios.filter(item => item.scenario !== scenario.scenario) ?? []
    scenarios.push(scenario)
    scenarios.sort((left, right) => left.scenario.localeCompare(right.scenario))

    const artifact: Bns360RuntimeEvidenceArtifact = {
        schema: 'bootandstrap.template.bns-360.runtime-evidence/v1',
        version: 1,
        templateCommit: input.templateCommit ?? existing?.templateCommit ?? 'unknown',
        tenantRef: input.tenantRef ?? existing?.tenantRef ?? 'unknown',
        baseUrl: input.evidence.baseUrl,
        deployedBuild: input.deployedBuild ?? existing?.deployedBuild ?? unknownBns360DeployedBuild(),
        generatedAt,
        updatedAt: new Date().toISOString(),
        scenarios,
    }

    mkdirSync(dirname(input.artifactPath), { recursive: true })
    writeFileSync(input.artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
}

function readBns360RuntimeEvidenceArtifact(artifactPath: string): Bns360RuntimeEvidenceArtifact | null {
    if (!existsSync(artifactPath)) {
        return null
    }

    try {
        return JSON.parse(readFileSync(artifactPath, 'utf8')) as Bns360RuntimeEvidenceArtifact
    } catch {
        return null
    }
}

export function unknownBns360DeployedBuild(): Bns360DeployedBuildInfo {
    return {
        commitSha: null,
        commitShortSha: null,
        branch: null,
        deployedAt: null,
        source: 'unknown',
    }
}

function valueOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function normalizeBns360DeployedBuild(value: unknown): Bns360DeployedBuildInfo {
    if (!value || typeof value !== 'object') {
        return unknownBns360DeployedBuild()
    }

    const build = value as Record<string, unknown>
    const commitSha = valueOrNull(build.commitSha)
    return {
        commitSha,
        commitShortSha: valueOrNull(build.commitShortSha) ?? (commitSha ? commitSha.slice(0, 8) : null),
        branch: valueOrNull(build.branch),
        deployedAt: valueOrNull(build.deployedAt),
        source: valueOrNull(build.source) ?? 'health',
    }
}

export function bns360RuntimeCommitMatches(expected: string | undefined, actual: string | null): boolean {
    const normalizedExpected = expected?.trim()
    if (!normalizedExpected) {
        return true
    }
    if (!actual) {
        return false
    }
    return actual === normalizedExpected
        || actual.startsWith(normalizedExpected)
        || normalizedExpected.startsWith(actual)
}

export function assertBns360ExpectedRuntimeCommit(
    deployedBuild: Bns360DeployedBuildInfo,
    expected = process.env.BNS_360_EXPECTED_RUNTIME_COMMIT
): void {
    if (!bns360RuntimeCommitMatches(expected, deployedBuild.commitSha)) {
        throw new Error(
            `BNS 360 deployed runtime commit mismatch: expected ${expected}, actual ${deployedBuild.commitSha ?? 'missing'}`
        )
    }
}

export async function resolveBns360DeployedBuild(
    request: APIRequestContext,
    headers?: Record<string, string>
): Promise<Bns360DeployedBuildInfo> {
    const response = await request.get('/api/health', { headers })
    if (!response.ok()) {
        return unknownBns360DeployedBuild()
    }

    const payload = await response.json() as { build?: unknown }
    return normalizeBns360DeployedBuild(payload.build)
}

function buildBns360RuntimeEvidenceScenario(
    input: Bns360ScenarioArtifactInput
): Bns360RuntimeEvidenceScenario {
    return {
        scenario: input.evidence.scenarioKey,
        generatedAt: input.evidence.generatedAt,
        executionMode: input.evidence.executionMode,
        routeStatus: input.evidence.routeStatus,
        functionalStatus: input.evidence.functionalStatus,
        status: input.evidence.status,
        paths: input.routeChecks ?? input.evidence.routes.map(path => ({
            path,
            status: input.evidence.routeStatus,
        })),
        functionalTargets: input.evidence.functionalEvidence.map(target => ({
            kind: target.kind,
            target: target.target,
            method: target.method ?? 'GET',
            routes: target.routes ?? [],
            expectedJsonPaths: target.expectedJsonPaths ?? [],
        })),
        credentialState: input.evidence.credentialState,
        pass: isBns360ScenarioEvidencePassing(input.evidence),
        cleanupStatus: input.cleanupStatus ?? 'not_applicable',
    }
}

function isBns360ScenarioEvidencePassing(evidence: Bns360ScenarioEvidence): boolean {
    if (evidence.status !== 'verified' || evidence.routeStatus !== 'verified') {
        return false
    }

    if (evidence.executionMode !== 'functional') {
        return evidence.functionalStatus !== 'manual_required' && evidence.functionalStatus !== 'blocked'
    }

    return evidence.functionalStatus === 'verified' || evidence.functionalStatus === 'not_required'
}

export function assertBns360FunctionalEvidenceVerified(evidence: Bns360ScenarioEvidence): void {
    if (evidence.executionMode !== 'functional') {
        return
    }
    if (evidence.functionalEvidence.length === 0 || evidence.functionalStatus === 'not_required') {
        return
    }
    if (evidence.functionalStatus === 'verified') {
        return
    }

    const targets = evidence.functionalEvidence
        .map(item => `${item.kind}:${item.target}`)
        .join(', ')
    throw new Error(
        `Functional evidence for ${evidence.scenarioKey} is ${evidence.functionalStatus}; ` +
        `implement and run functional journeys before certifying: ${targets}`
    )
}

export function bns360JsonHasPath(payload: unknown, path: string): boolean {
    return getBns360JsonPath(payload, path).found
}

function getBns360JsonPath(payload: unknown, path: string): { found: boolean; value: unknown } {
    let current: unknown = payload

    for (const segment of path.split('.')) {
        if (!current || typeof current !== 'object' || !(segment in current)) {
            return { found: false, value: undefined }
        }

        current = (current as Record<string, unknown>)[segment]
    }

    return { found: current !== undefined && current !== null, value: current }
}

export function bns360JsonValueMatches(
    payload: unknown,
    path: string,
    expected: string | number | boolean | null
): boolean {
    const result = getBns360JsonPath(payload, path)
    return result.found && Object.is(result.value, expected)
}

export function summarizeBns360JsonShape(payload: unknown): Record<string, string | string[]> {
    if (!payload || typeof payload !== 'object') {
        return { payload: typeof payload }
    }

    return Object.fromEntries(
        Object.entries(payload as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => [
                key,
                value && typeof value === 'object' && !Array.isArray(value)
                    ? Object.keys(value).sort()
                    : Array.isArray(value) ? 'array' : typeof value,
            ])
    )
}

const BNS_360_ROUTE_ONLY_AUTOMATED_KINDS = new Set<Bns360FunctionalEvidenceTarget['kind']>([
    'api_health',
])

const BNS_360_JSON_PATH_AUTOMATED_KINDS = new Set<Bns360FunctionalEvidenceTarget['kind']>([
    'runtime_config',
    'limit_enforcement',
    'module_primary_journey',
    'grant_unlock',
    'checkout_payment_collection_journey',
    'customer_account_journey',
    'order_lifecycle_journey',
    'backup_restore_journey',
    'terminal_simulator_journey',
    'virtual_printer_lab',
    'crud_journey',
])
const BNS_360_PAGE_AUTOMATED_KINDS = new Set<Bns360FunctionalEvidenceTarget['kind']>([
    'customer_panel_operations_journey',
    'owner_panel_operations_journey',
])

function canAutomateFunctionalEvidence(target: Bns360FunctionalEvidenceTarget): boolean {
    if (BNS_360_PAGE_AUTOMATED_KINDS.has(target.kind)) {
        return Boolean(target.routes?.length)
    }

    if (BNS_360_ROUTE_ONLY_AUTOMATED_KINDS.has(target.kind)) {
        return Boolean(target.routes?.length)
    }

    if (BNS_360_JSON_PATH_AUTOMATED_KINDS.has(target.kind)) {
        return Boolean(target.routes?.length && target.expectedJsonPaths?.length)
    }

    return false
}

export function getBns360FunctionalEvidenceForRun(
    targets: Bns360FunctionalEvidenceTarget[],
    env: Bns360FunctionalEvidenceRunEnv = process.env
): Bns360FunctionalEvidenceTarget[] {
    const allowedKinds = new Set(
        (env.BNS_360_FUNCTIONAL_EVIDENCE_KINDS ?? '')
            .split(',')
            .map(kind => kind.trim())
            .filter(Boolean)
    )
    const filteredByKind = allowedKinds.size > 0
        ? targets.filter(target => allowedKinds.has(target.kind))
        : targets
    const filteredByTarget = filterBns360ExcludedFunctionalTargets(
        filteredByKind,
        env.BNS_360_FUNCTIONAL_EXCLUDE_TARGET_PATTERN
    )

    if (env.BNS_360_FUNCTIONAL_AUTOMATED_ONLY !== '1') {
        return filteredByTarget
    }

    return filteredByTarget.filter(canAutomateFunctionalEvidence)
}

function filterBns360ExcludedFunctionalTargets(
    targets: Bns360FunctionalEvidenceTarget[],
    pattern: string | undefined
): Bns360FunctionalEvidenceTarget[] {
    const trimmed = pattern?.trim()
    if (!trimmed) {
        return targets
    }

    try {
        const matcher = new RegExp(trimmed)
        return targets.filter(target => !matcher.test(target.target))
    } catch {
        return targets.filter(target => !target.target.includes(trimmed))
    }
}

export function getBns360AutomatedFunctionalEvidenceStatus(
    targets: Bns360FunctionalEvidenceTarget[]
): Bns360FunctionalStatus {
    if (targets.length === 0) {
        return 'not_required'
    }

    return targets.every(canAutomateFunctionalEvidence) ? 'verified' : 'manual_required'
}

export async function runBns360AutomatedFunctionalEvidence(
    request: APIRequestContext,
    targets: Bns360FunctionalEvidenceTarget[],
    headers?: Record<string, string>,
    page?: Page
): Promise<Bns360FunctionalStatus> {
    const status = getBns360AutomatedFunctionalEvidenceStatus(targets)
    if (status !== 'verified') {
        return status
    }

    for (const target of targets) {
        if (target.kind === 'owner_panel_operations_journey') {
            if (!page) return 'blocked'
            await runBns360OwnerPanelOperations(page, target.routes ?? [])
            continue
        }
        if (target.kind === 'customer_panel_operations_journey') {
            if (!page) return 'blocked'
            await runBns360CustomerPanelOperations(page, target.routes ?? [])
            continue
        }

        for (const route of target.routes ?? []) {
            const response = await expectApiHealthy(request, route, headers, target.method)

            if (target.expectedJsonPaths?.length) {
                const payload = await response.json()
                for (const path of target.expectedJsonPaths) {
                    expect(
                        bns360JsonHasPath(payload, path),
                        `Expected ${route} JSON payload to include ${path}; ` +
                        `shape=${JSON.stringify(summarizeBns360JsonShape(payload))}`
                    ).toBe(true)
                }
                for (const [path, expected] of Object.entries(target.expectedJsonValues ?? {})) {
                    expect(
                        bns360JsonValueMatches(payload, path, expected),
                        `Expected ${route} JSON payload ${path} to equal ${String(expected)}`
                    ).toBe(true)
                }
            }
        }
    }

    return status
}

export async function loginAsOwner(page: Page) {
    if (await applyBns360OwnerStorageState(page)) {
        return
    }

    await gotoBns360AuthRoute(page, `/${BNS_360_LANG}/login`)
    await page.fill('input[type="email"]', BNS_360_OWNER_EMAIL ?? '')
    await page.fill('input[type="password"]', BNS_360_OWNER_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL(getBns360PanelLandingUrlPattern(BNS_360_LANG), { timeout: 20_000 })
    bns360OwnerStorageState = await page.context().storageState()
}

export async function loginAsCustomer(page: Page) {
    if (await applyBns360CustomerStorageState(page)) {
        return
    }

    await gotoBns360AuthRoute(page, `/${BNS_360_LANG}/login`)
    await page.fill('input[type="email"]', BNS_360_CUSTOMER_EMAIL ?? '')
    await page.fill('input[type="password"]', BNS_360_CUSTOMER_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL(getBns360CustomerLandingUrlPattern(BNS_360_LANG), { timeout: 20_000 })
    bns360CustomerStorageState = await page.context().storageState()
}

async function applyBns360OwnerStorageState(page: Page): Promise<boolean> {
    if (!bns360OwnerStorageState) {
        return false
    }

    await page.context().addCookies(bns360OwnerStorageState.cookies)
    for (const originState of bns360OwnerStorageState.origins) {
        await page.addInitScript(({ origin, items }) => {
            if (window.location.origin !== origin) {
                return
            }

            for (const item of items) {
                window.localStorage.setItem(item.name, item.value)
            }
        }, {
            origin: originState.origin,
            items: originState.localStorage,
        })
    }

    await gotoBns360AuthRoute(page, `/${BNS_360_LANG}/panel`, { requireLoginForm: false })
    await page.waitForLoadState('domcontentloaded')

    const landedOnPanel = getBns360PanelLandingUrlPattern(BNS_360_LANG).test(page.url())
    if (!landedOnPanel) {
        bns360OwnerStorageState = null
    }

    return landedOnPanel
}

async function applyBns360CustomerStorageState(page: Page): Promise<boolean> {
    if (!bns360CustomerStorageState) {
        return false
    }

    await page.context().addCookies(bns360CustomerStorageState.cookies)
    for (const originState of bns360CustomerStorageState.origins) {
        await page.addInitScript(({ origin, items }) => {
            if (window.location.origin !== origin) {
                return
            }

            for (const item of items) {
                window.localStorage.setItem(item.name, item.value)
            }
        }, {
            origin: originState.origin,
            items: originState.localStorage,
        })
    }

    await gotoBns360AuthRoute(page, `/${BNS_360_LANG}/cuenta`, { requireLoginForm: false })
    await page.waitForLoadState('domcontentloaded')

    const landedOnCustomerPanel = getBns360CustomerLandingUrlPattern(BNS_360_LANG).test(page.url())
    if (!landedOnCustomerPanel) {
        bns360CustomerStorageState = null
    }

    return landedOnCustomerPanel
}

export function getBns360PanelLandingUrlPattern(lang: string = BNS_360_LANG): RegExp {
    return new RegExp(`/${lang}/panel(?:$|[/?#])`)
}

export function getBns360CustomerLandingUrlPattern(lang: string = BNS_360_LANG): RegExp {
    return new RegExp(`/${lang}/cuenta(?:$|/|[?#])`)
}

async function gotoBns360AuthRoute(
    page: Page,
    route: string,
    options: { requireLoginForm?: boolean } = {}
): Promise<void> {
    const response = await gotoBns360PanelRouteWithRateLimitBackoff(page, route)
    if (response && !response.ok()) {
        const body = await response.text().catch(() => '')
        expect(response.ok(), formatBns360ApiHealthFailure(route, response.status(), body)).toBe(true)
    }
    await page.waitForLoadState('domcontentloaded')
    if (options.requireLoginForm ?? true) {
        await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 })
        await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 15_000 })
    }
}

async function runBns360OwnerPanelOperations(page: Page, routes: string[]): Promise<void> {
    for (const route of routes) {
        await expectPanelRouteHealthy(page, route)
    }

    await expectBns360OwnerProductCatalogUsable(page)
    await expectBns360OwnerInventoryUsable(page)

    const response = await page.request.get('/api/panel/limits?resources=products,categories,badges')
    if (!response.ok()) {
        const body = await response.text().catch(() => '')
        expect(response.ok(), formatBns360ApiHealthFailure('/api/panel/limits?resources=products,categories,badges', response.status(), body)).toBe(true)
    }
    const payload = await response.json()
    expect(bns360JsonHasPath(payload, 'products.limit')).toBe(true)
    expect(bns360JsonHasPath(payload, 'categories.limit')).toBe(true)
}

async function expectBns360OwnerProductCatalogUsable(page: Page): Promise<void> {
    const route = `/${BNS_360_LANG}/panel/mi-tienda?tab=productos`
    await expectPanelRouteHealthy(page, route)
    await expect(
        page.locator('[data-testid="panel-product-card"]').first(),
        'Owner product catalog must expose at least one manageable product card'
    ).toBeVisible()
}

async function expectBns360OwnerInventoryUsable(page: Page): Promise<void> {
    const route = `/${BNS_360_LANG}/panel/mi-tienda?tab=inventario`
    await expectPanelRouteHealthy(page, route)
    await expect(
        page.locator('[data-testid="panel-inventory-row"]').first(),
        'Owner inventory panel must expose at least one materialized inventory item'
    ).toBeVisible()
}

async function runBns360CustomerPanelOperations(page: Page, routes: string[]): Promise<void> {
    for (const route of routes) {
        const response = await gotoBns360PanelRouteWithRateLimitBackoff(page, route)
        if (response && !response.ok()) {
            const body = await response.text().catch(() => '')
            expect(response.ok(), formatBns360ApiHealthFailure(route, response.status(), body)).toBe(true)
        }
        await expect(page.locator('main').first()).toBeVisible()
        await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
    }

    const ownerPanelResponse = await page.goto(`/${BNS_360_LANG}/panel`, BNS_360_ROUTE_GOTO_OPTIONS)
    if (ownerPanelResponse && !ownerPanelResponse.ok()) {
        const status = ownerPanelResponse.status()
        expect(isBns360CustomerOwnerPanelBoundaryStatus(status)).toBe(true)
        await expectBns360CustomerAccountUsable(page)
        return
    }
    expect(getBns360PanelLandingUrlPattern(BNS_360_LANG).test(page.url())).toBe(false)
    expect(getBns360CustomerLandingUrlPattern(BNS_360_LANG).test(page.url())).toBe(true)
}

async function expectBns360CustomerAccountUsable(page: Page): Promise<void> {
    const response = await gotoBns360PanelRouteWithRateLimitBackoff(page, `/${BNS_360_LANG}/cuenta`)
    if (response && !response.ok()) {
        const body = await response.text().catch(() => '')
        expect(response.ok(), formatBns360ApiHealthFailure(`/${BNS_360_LANG}/cuenta`, response.status(), body)).toBe(true)
    }
    await expect(page.locator('main').first()).toBeVisible()
    expect(getBns360CustomerLandingUrlPattern(BNS_360_LANG).test(page.url())).toBe(true)
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function getBns360RouteRetryConfig(
    env: Bns360RouteRetryEnv = process.env
): Bns360RouteRetryConfig {
    return {
        maxAttempts: parsePositiveInteger(env.BNS_360_ROUTE_RETRY_MAX_ATTEMPTS, 2),
        fallbackDelayMs: parsePositiveInteger(env.BNS_360_ROUTE_RETRY_FALLBACK_MS, 5_000),
        maxDelayMs: parsePositiveInteger(env.BNS_360_ROUTE_RETRY_MAX_DELAY_MS, 10_000),
        maxTotalWaitMs: parsePositiveInteger(env.BNS_360_ROUTE_RETRY_MAX_TOTAL_WAIT_MS, 20_000),
    }
}

export function resolveBns360RetryAfterMs(
    retryAfter: string | null | undefined,
    config: Bns360RouteRetryConfig = getBns360RouteRetryConfig()
): number {
    if (!retryAfter) {
        return config.fallbackDelayMs
    }

    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(Math.round(seconds * 1000), config.maxDelayMs)
    }

    const retryAt = Date.parse(retryAfter)
    if (Number.isFinite(retryAt)) {
        return Math.min(Math.max(retryAt - Date.now(), 0), config.maxDelayMs)
    }

    return config.fallbackDelayMs
}

export function isBns360RetriablePanelStatus(status: number | undefined): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504
}

export function isBns360CustomerOwnerPanelBoundaryStatus(status: number | undefined): boolean {
    return status === 200
        || status === 302
        || status === 307
        || status === 308
        || status === 401
        || status === 403
        || status === 429
}

async function gotoBns360PanelRouteWithRateLimitBackoff(page: Page, route: string): Promise<Response | null> {
    const config = getBns360RouteRetryConfig()
    let response: Response | null = null
    let totalWaitMs = 0

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        response = await page.goto(route, BNS_360_ROUTE_GOTO_OPTIONS)
        if (!isBns360RetriablePanelStatus(response?.status()) || attempt === config.maxAttempts) {
            return response
        }

        const nextWaitMs = resolveBns360RetryAfterMs(response?.headers()['retry-after'], config)
        const remainingWaitMs = config.maxTotalWaitMs - totalWaitMs
        if (remainingWaitMs <= 0) {
            return response
        }
        const boundedWaitMs = Math.min(nextWaitMs, remainingWaitMs)
        totalWaitMs += boundedWaitMs
        await page.waitForTimeout(boundedWaitMs)
    }

    return response
}

export async function expectPanelRouteHealthy(page: Page, route: string) {
    const response = await gotoBns360PanelRouteWithRateLimitBackoff(page, route)
    if (response && !response.ok()) {
        const body = await response.text().catch(() => '')
        expect(response.ok(), formatBns360ApiHealthFailure(route, response.status(), body)).toBe(true)
    }
    await expect(page.locator('main').first()).toBeVisible()
    await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
}

export async function expectApiHealthy(
    request: APIRequestContext,
    route: string,
    headers?: Record<string, string>,
    method: 'GET' | 'POST' = 'GET'
) {
    const options = headers ? { headers } : undefined
    const response = method === 'POST'
        ? await request.post(route, options)
        : await request.get(route, options)
    if (!response.ok()) {
        const body = await response.text().catch(() => '')
        expect(response.ok(), formatBns360ApiHealthFailure(route, response.status(), body)).toBe(true)
    }
    return response
}

export function formatBns360ApiHealthFailure(route: string, status: number, body: string): string {
    const normalizedBody = body.trim()
    return normalizedBody
        ? `${route} returned HTTP ${status}: ${normalizedBody.slice(0, 500)}`
        : `${route} returned HTTP ${status}`
}
