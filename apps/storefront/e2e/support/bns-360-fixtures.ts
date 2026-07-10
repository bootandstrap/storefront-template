import { dirname } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, type APIRequestContext, type Page, type Response } from '@playwright/test'
import type { Bns360FunctionalEvidenceTarget } from './bns-360-tenant-profiles'

export const BNS_360_LANG = process.env.BNS_360_LANG || 'es'
export const BNS_360_OWNER_EMAIL = process.env.BNS_360_OWNER_EMAIL || process.env.PANEL_TEST_EMAIL || process.env.E2E_OWNER_EMAIL
export const BNS_360_OWNER_PASSWORD = process.env.BNS_360_OWNER_PASSWORD || process.env.PANEL_TEST_PASSWORD || process.env.E2E_OWNER_PASSWORD

export type Bns360ExecutionMode = 'smoke' | 'functional'
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
}
type Bns360ApiHeaderScenario = {
    apiHeadersEnv?: Record<string, string>
}
type Bns360OwnerStorageState = Awaited<ReturnType<ReturnType<Page['context']>['storageState']>>
type Bns360RouteRetryEnv = {
    [key: string]: string | undefined
    BNS_360_ROUTE_RETRY_MAX_ATTEMPTS?: string
    BNS_360_ROUTE_RETRY_FALLBACK_MS?: string
    BNS_360_ROUTE_RETRY_MAX_DELAY_MS?: string
}
export type Bns360RouteRetryConfig = {
    maxAttempts: number
    fallbackDelayMs: number
    maxDelayMs: number
}

let bns360OwnerStorageState: Bns360OwnerStorageState | null = null

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

export function hasOwnerCredentials() {
    return Boolean(BNS_360_OWNER_EMAIL && BNS_360_OWNER_PASSWORD)
}

export function getBns360MissingCredentialAction(
    requirement: Bns360CredentialRequirement
): Bns360MissingCredentialAction {
    if (!requirement.requiresAuth || requirement.hasCredentials) {
        return { action: 'run' }
    }

    if (requirement.executionMode === 'functional') {
        return {
            action: 'fail',
            reason: 'Owner credentials are required for authenticated 360 functional certification',
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

export type Bns360ScenarioArtifactInput = {
    artifactPath?: string
    evidence: Bns360ScenarioEvidence
    templateCommit?: string
    tenantRef?: string
    cleanupStatus?: string
    routeChecks?: Bns360EvidenceRouteCheck[]
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

function canAutomateFunctionalEvidence(target: Bns360FunctionalEvidenceTarget): boolean {
    if (target.kind === 'api_health') {
        return Boolean(target.routes?.length)
    }

    if (target.kind === 'runtime_config') {
        return Boolean(target.routes?.length && target.expectedJsonPaths?.length)
    }

    if (target.kind === 'limit_enforcement') {
        return Boolean(target.routes?.length && target.expectedJsonPaths?.length)
    }

    if (target.kind === 'module_primary_journey') {
        return Boolean(target.routes?.length && target.expectedJsonPaths?.length)
    }

    if (target.kind === 'grant_unlock') {
        return Boolean(target.routes?.length && target.expectedJsonPaths?.length)
    }

    if (target.kind === 'virtual_printer_lab') {
        return Boolean(target.routes?.length && target.expectedJsonPaths?.length)
    }

    if (target.kind === 'crud_journey') {
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
    targets: Bns360FunctionalEvidenceTarget[]
): Promise<Bns360FunctionalStatus> {
    const status = getBns360AutomatedFunctionalEvidenceStatus(targets)
    if (status !== 'verified') {
        return status
    }

    for (const target of targets) {
        for (const route of target.routes ?? []) {
            const response = await expectApiHealthy(request, route, undefined, target.method)

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

    await page.goto(`/${BNS_360_LANG}/login`)
    await page.waitForLoadState('domcontentloaded')
    await page.fill('input[type="email"]', BNS_360_OWNER_EMAIL ?? '')
    await page.fill('input[type="password"]', BNS_360_OWNER_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL(getBns360PanelLandingUrlPattern(BNS_360_LANG), { timeout: 20_000 })
    bns360OwnerStorageState = await page.context().storageState()
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

    await page.goto(`/${BNS_360_LANG}/panel`)
    await page.waitForLoadState('domcontentloaded')

    const landedOnPanel = getBns360PanelLandingUrlPattern(BNS_360_LANG).test(page.url())
    if (!landedOnPanel) {
        bns360OwnerStorageState = null
    }

    return landedOnPanel
}

export function getBns360PanelLandingUrlPattern(lang: string = BNS_360_LANG): RegExp {
    return new RegExp(`/${lang}/panel(?:$|[/?#])`)
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
        maxDelayMs: parsePositiveInteger(env.BNS_360_ROUTE_RETRY_MAX_DELAY_MS, 65_000),
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

async function gotoBns360PanelRouteWithRateLimitBackoff(page: Page, route: string): Promise<Response | null> {
    const config = getBns360RouteRetryConfig()
    let response: Response | null = null

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        response = await page.goto(route)
        if (response?.status() !== 429 || attempt === config.maxAttempts) {
            return response
        }

        await page.waitForTimeout(resolveBns360RetryAfterMs(response.headers()['retry-after'], config))
    }

    return response
}

export async function expectPanelRouteHealthy(page: Page, route: string) {
    const response = await gotoBns360PanelRouteWithRateLimitBackoff(page, route)
    if (response && !response.ok()) {
        const body = await response.text().catch(() => '')
        expect(response.ok(), formatBns360ApiHealthFailure(route, response.status(), body)).toBe(true)
    }
    await expect(page.locator('main')).toBeVisible()
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
