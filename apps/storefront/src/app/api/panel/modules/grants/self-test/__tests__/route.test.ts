import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockWithPanelGuard = vi.fn()
const mockWithRateLimit = vi.fn()
const mockGetActiveModulesForTenant = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/security/api-rate-guard', () => ({
    PANEL_GUARD: { key: 'panel' },
    withRateLimit: mockWithRateLimit,
}))

vi.mock('@/lib/active-modules', () => ({
    getActiveModulesForTenant: mockGetActiveModulesForTenant,
}))

function makeRequest(url = 'https://tenant.example.com/api/panel/modules/grants/self-test?required=contract') {
    return new Request(url) as unknown as NextRequest
}

describe('GET /api/panel/modules/grants/self-test', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        mockWithRateLimit.mockResolvedValue({ limited: false, response: null, headers: { 'x-rate-limit': 'ok' } })
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant-1',
            appConfig: {
                featureFlags: {
                    enable_auth_advanced: true,
                    enable_automations: true,
                    enable_traffic_expansion: true,
                    enable_chatbot: true,
                    enable_crm: true,
                    enable_ecommerce: true,
                    enable_email_notifications: true,
                    enable_multi_language: true,
                    enable_pos: true,
                    enable_pos_kiosk: true,
                    enable_social_links: true,
                    enable_sales_channels: true,
                    enable_seo: true,
                },
            },
        })
        mockGetActiveModulesForTenant.mockResolvedValue([
            { moduleKey: 'auth_advanced', tierKey: 'enterprise', source: 'flags', stripeSubscriptionId: 'sub_secret' },
            { moduleKey: 'automation', tierKey: 'pro', source: 'orders', stripeSubscriptionId: null },
            { moduleKey: 'capacidad', tierKey: 'enterprise', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'chatbot', tierKey: 'pro', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'crm', tierKey: 'pro', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'ecommerce', tierKey: 'enterprise', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'email_marketing', tierKey: 'enterprise', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'i18n', tierKey: 'pro', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'pos', tierKey: 'enterprise', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'pos_kiosk', tierKey: 'pro', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'rrss', tierKey: 'paquete_avanzado', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'sales_channels', tierKey: 'enterprise', source: 'flags', stripeSubscriptionId: null },
            { moduleKey: 'seo', tierKey: 'avanzado', source: 'flags', stripeSubscriptionId: null },
        ])
    })

    it('verifies full contract grants without leaking subscription ids', async () => {
        const { GET } = await import('../route')

        const response = await GET(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(mockWithPanelGuard).toHaveBeenCalledWith()
        expect(mockGetActiveModulesForTenant).not.toHaveBeenCalled()
        expect(json).toMatchObject({
            schema: 'bootandstrap.modules.grants.self-test/v1',
            status: 'verified',
            summary: {
                requiredCount: 13,
                activeCount: 13,
                missingCount: 0,
            },
        })
        expect(json.modules[0]).toEqual({
            key: 'auth_advanced',
            tierKey: null,
            source: 'flags',
        })
        expect(JSON.stringify(json)).not.toContain('sub_secret')
    })

    it('reports blocked when a required grant is missing', async () => {
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant-1',
            appConfig: {
                featureFlags: {
                    enable_auth_advanced: false,
                    enable_ecommerce: true,
                },
            },
        })

        const { GET } = await import('../route')

        const response = await GET(makeRequest())
        const json = await response.json()

        expect(response.status).toBe(409)
        expect(json.status).toBe('blocked')
        expect(json.summary.missingCount).toBe(12)
        expect(json.missing).toContain('auth_advanced')
    })

    it('uses the authorized panel config instead of direct module reads for grant checks', async () => {
        mockGetActiveModulesForTenant.mockResolvedValue([])
        mockWithPanelGuard.mockResolvedValue({
            tenantId: 'tenant-1',
            appConfig: {
                featureFlags: {
                    enable_auth_advanced: true,
                },
            },
        })

        const { GET } = await import('../route')

        const response = await GET(makeRequest('https://tenant.example.com/api/panel/modules/grants/self-test?required=auth_advanced'))
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json).toMatchObject({
            status: 'verified',
            summary: {
                requiredCount: 1,
                activeCount: 1,
                missingCount: 0,
            },
            modules: [{
                key: 'auth_advanced',
                tierKey: null,
                source: 'flags',
            }],
        })
        expect(mockGetActiveModulesForTenant).not.toHaveBeenCalled()
    })
})
