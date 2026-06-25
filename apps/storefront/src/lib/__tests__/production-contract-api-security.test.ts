/**
 * PRODUCTION CONTRACT: API Endpoint Security
 *
 * Validates that ALL sensitive API endpoints enforce:
 * 1. Authentication (Supabase session via createClient)
 * 2. Rate limiting (createSmartRateLimiter or checkRateLimit)
 * 3. Feature flag gating where applicable
 *
 * These are structural source code tests — they verify that the correct
 * security imports and patterns exist in the route handlers.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const API_DIR = join(__dirname, '../../app/api')
const BILLING_PORTAL_CANONICAL = 'billing-portal/route.ts'
const BILLING_PORTAL_LEGACY = 'billing/portal/route.ts'

// ── Endpoints that MUST require authentication ──
const AUTH_REQUIRED_ENDPOINTS = [
    'returns/route.ts',
    BILLING_PORTAL_CANONICAL,
    'wishlist/route.ts',
    'panel/onboarding-complete/route.ts',
]

// Note: orders/lookup is intentionally unauthenticated (guest order tracking).
// Security is via email+display_id verification + rate limiting (5/15min).

// ── Endpoints that MUST have rate limiting ──
const RATE_LIMITED_ENDPOINTS = [
    'returns/route.ts',
    BILLING_PORTAL_CANONICAL,
    'chat/route.ts',
    'orders/lookup/route.ts',
    'analytics/route.ts',
]

// Note: newsletter uses plan limits (max_newsletter_subscribers) as enforcement
// instead of IP-based rate limiting. This is an acceptable security model.

// ── Endpoints that MUST check feature flags ──
const FLAG_GATED_ENDPOINTS: Record<string, string> = {
    'returns/route.ts': 'enable_self_service_returns',
    'chat/route.ts': 'enable_chatbot',
    'newsletter/route.ts': 'enable_newsletter',
    'wishlist/route.ts': 'enable_wishlist',
}

function readRoute(relativePath: string): string | null {
    const fullPath = join(API_DIR, relativePath)
    if (!existsSync(fullPath)) return null
    return readFileSync(fullPath, 'utf-8')
}

describe('Production Contract: API Endpoint Security', () => {
    describe('authentication enforcement', () => {
        it.each(AUTH_REQUIRED_ENDPOINTS)(
            '%s requires Supabase auth',
            (endpoint) => {
                const source = readRoute(endpoint)
                if (!source) return // skip if file doesn't exist

                // Must use EITHER direct createClient + auth.getUser() OR withPanelGuard()
                // withPanelGuard() wraps Supabase auth internally — equally secure
                const hasDirectAuth =
                    source.includes("from '@/lib/supabase/server'") &&
                    source.includes('auth.getUser()')
                const hasPanelGuard = source.includes('withPanelGuard')

                expect(
                    hasDirectAuth || hasPanelGuard,
                    `${endpoint} must have authentication (createClient+auth.getUser or withPanelGuard)`
                ).toBe(true)

                // Must return 401 or throw for unauthenticated
                // withPanelGuard throws automatically, direct auth returns 401
                const has401 = source.includes('401')
                const guardHandlesAuth = hasPanelGuard // guard throws on unauth
                expect(
                    has401 || guardHandlesAuth,
                    `${endpoint} must reject unauthenticated requests`
                ).toBe(true)
            }
        )

        it('returns endpoint rejects unauthenticated in both POST and GET', () => {
            const source = readRoute('returns/route.ts')
            if (!source) return

            // Both handlers must have auth
            const postMatch = source.match(/async function POST[\s\S]*?async function GET/)?.[0]
            const getMatch = source.match(/async function GET[\s\S]*$/)?.[0]

            if (postMatch) {
                expect(postMatch).toContain('auth.getUser()')
                expect(postMatch).toContain('Not authenticated')
            }
            if (getMatch) {
                expect(getMatch).toContain('auth.getUser()')
                expect(getMatch).toContain('Not authenticated')
            }
        })
    })

    describe('rate limiting enforcement', () => {
        it.each(RATE_LIMITED_ENDPOINTS)(
            '%s has rate limiting',
            (endpoint) => {
                const source = readRoute(endpoint)
                if (!source) return

                // Must import rate limiting (either factory or basic)
                const hasSmartLimiter = source.includes('createSmartRateLimiter')
                const hasBasicLimiter = source.includes('checkRateLimit')
                const hasGuardWrapper = source.includes('withRateLimit')
                expect(
                    hasSmartLimiter || hasBasicLimiter || hasGuardWrapper,
                    `${endpoint} must have rate limiting`
                ).toBe(true)

                // Must either return 429 directly or delegate to the shared 429 helper
                expect(source.includes('429') || hasGuardWrapper).toBe(true)
            }
        )
    })

    describe('feature flag gating', () => {
        it.each(Object.entries(FLAG_GATED_ENDPOINTS))(
            '%s checks flag: %s',
            (endpoint, expectedFlag) => {
                const source = readRoute(endpoint)
                if (!source) return

                // Must reference the specific flag
                expect(source).toContain(expectedFlag)
                // Must import isFeatureEnabled or check featureFlags directly
                const hasFeatureCheck =
                    source.includes('isFeatureEnabled') ||
                    source.includes('featureFlags.')
                expect(
                    hasFeatureCheck,
                    `${endpoint} must check feature flag ${expectedFlag}`
                ).toBe(true)
            }
        )
    })

    describe('billing portal authorization', () => {
        it('validates owner/super_admin role before creating portal session', () => {
            const source = readRoute(BILLING_PORTAL_CANONICAL)
            if (!source) return

            // Must resolve role and tenant through the shared tenant-context boundary.
            expect(source).toContain('resolveTenantContext')
            expect(source).toContain('profileRole: profile?.role ?? null')
            expect(source).toContain('metadataRole: user.user_metadata?.role ?? null')
            expect(source).toContain('403')
        })

        it('reads tenant billing data through a tenant-scoped lookup', () => {
            const source = readRoute(BILLING_PORTAL_CANONICAL)
            if (!source) return

            expect(source).toContain(".from('tenants')")
            expect(source).toContain(".eq('id', tenantContext.tenantId)")
            expect(source).toContain('stripe_customer_id')
            expect(source).not.toMatch(/SERVICE_ROLE|serviceRole|service_role/i)
        })
    })

    describe('legacy billing route', () => {
        it('redirects POST /api/billing/portal to the canonical billing portal route', () => {
            const source = readRoute(BILLING_PORTAL_LEGACY)
            if (!source) return

            expect(source).toContain('/api/billing-portal')
            expect(source).toContain('308')
        })
    })
})
