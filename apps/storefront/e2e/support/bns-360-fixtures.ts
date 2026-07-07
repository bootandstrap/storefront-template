import { expect, type Page, type APIRequestContext } from '@playwright/test'
import type { Bns360FunctionalEvidenceTarget } from './bns-360-tenant-profiles'

export const BNS_360_LANG = process.env.BNS_360_LANG || 'es'
export const BNS_360_OWNER_EMAIL = process.env.BNS_360_OWNER_EMAIL || process.env.PANEL_TEST_EMAIL || process.env.E2E_OWNER_EMAIL
export const BNS_360_OWNER_PASSWORD = process.env.BNS_360_OWNER_PASSWORD || process.env.PANEL_TEST_PASSWORD || process.env.E2E_OWNER_PASSWORD

export type Bns360ExecutionMode = 'smoke' | 'functional'
type Bns360ExecutionEnv = {
    [key: string]: string | undefined
    BNS_360_FUNCTIONAL_JOURNEYS?: string
}

export function getBns360ExecutionMode(env: Bns360ExecutionEnv = process.env): Bns360ExecutionMode {
    return env.BNS_360_FUNCTIONAL_JOURNEYS === '1' ? 'functional' : 'smoke'
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
}

export interface Bns360ScenarioEvidence {
    schema: 'bootandstrap.template.bns-360.scenario-evidence/v1'
    scenarioKey: string
    baseUrl: string
    generatedAt: string
    status: Bns360ScenarioEvidenceInput['status']
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

    return {
        schema: 'bootandstrap.template.bns-360.scenario-evidence/v1',
        scenarioKey: input.scenarioKey,
        baseUrl: input.baseUrl,
        generatedAt: new Date().toISOString(),
        status: input.status,
        executionMode: input.executionMode ?? getBns360ExecutionMode(),
        routes: input.routes,
        functionalEvidence: input.functionalEvidence ?? [],
        credentialState,
    }
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

export async function expectApiHealthy(request: APIRequestContext, route: string) {
    const response = await request.get(route)
    expect(response.ok()).toBe(true)
}
