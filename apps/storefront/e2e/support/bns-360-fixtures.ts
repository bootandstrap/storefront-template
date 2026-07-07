import { expect, type Page, type APIRequestContext } from '@playwright/test'
import type { Bns360FunctionalEvidenceTarget } from './bns-360-tenant-profiles'

export const BNS_360_LANG = process.env.BNS_360_LANG || 'es'
export const BNS_360_OWNER_EMAIL = process.env.BNS_360_OWNER_EMAIL || process.env.PANEL_TEST_EMAIL || process.env.E2E_OWNER_EMAIL
export const BNS_360_OWNER_PASSWORD = process.env.BNS_360_OWNER_PASSWORD || process.env.PANEL_TEST_PASSWORD || process.env.E2E_OWNER_PASSWORD

export type Bns360ExecutionMode = 'smoke' | 'functional'
export type Bns360RouteStatus = 'verified' | 'manual_required' | 'blocked'
export type Bns360FunctionalStatus = 'not_required' | 'not_run' | 'manual_required' | 'verified' | 'blocked'

type Bns360ExecutionEnv = {
    [key: string]: string | undefined
    BNS_360_FUNCTIONAL_JOURNEYS?: string
}
type Bns360ApiHeaderScenario = {
    apiHeadersEnv?: Record<string, string>
}

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

function canAutomateFunctionalEvidence(target: Bns360FunctionalEvidenceTarget): boolean {
    return target.kind === 'api_health' && Boolean(target.routes?.length)
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
            await expectApiHealthy(request, route)
        }
    }

    return status
}

export async function loginAsOwner(page: Page) {
    await page.goto(`/${BNS_360_LANG}/login`)
    await page.waitForLoadState('domcontentloaded')
    await page.fill('input[type="email"]', BNS_360_OWNER_EMAIL ?? '')
    await page.fill('input[type="password"]', BNS_360_OWNER_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL(`**/${BNS_360_LANG}/panel/**`, { timeout: 20_000 })
}

export async function expectPanelRouteHealthy(page: Page, route: string) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('text=Algo salió mal')).not.toBeVisible()
}

export async function expectApiHealthy(
    request: APIRequestContext,
    route: string,
    headers?: Record<string, string>
) {
    const response = await request.get(route, headers ? { headers } : undefined)
    expect(response.ok()).toBe(true)
}
