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

// ── Endpoints that MUST require authentication ──
const AUTH_REQUIRED_ENDPOINTS = [
    'returns/route.ts',
    'billing/portal/route.ts',
    'wishlist/route.ts',
    'panel/onboarding-complete/route.ts',
]

// Note: orders/lookup is intentionally unauthenticated (guest order tracking).
// Security is via email+display_id verification + rate limiting (5/15min).

// ── Endpoints that MUST have rate limiting ──
const RATE_LIMITED_ENDPOINTS = [
    'returns/route.ts',
    'billing/portal/route.ts',
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

                // Must import createClient from supabase/server
                expect(source).toContain("from '@/lib/supabase/server'")
                // Must call auth.getUser()
                expect(source).toContain('auth.getUser()')
                // Must return 401 for unauthenticated
                expect(source).toContain('401')
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
                expect(
                    hasSmartLimiter || hasBasicLimiter,
                    `${endpoint} must have rate limiting`
                ).toBe(true)

                // Must return 429 for rate-limited requests
                expect(source).toContain('429')
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
            const source = readRoute('billing/portal/route.ts')
            if (!source) return

            // Must check role from profiles
            expect(source).toContain("'owner'")
            expect(source).toContain("'super_admin'")
            expect(source).toContain('403')
        })

        it('uses admin client for tenant data access (RLS bypass)', () => {
            const source = readRoute('billing/portal/route.ts')
            if (!source) return

            // Must import and use admin client for tenants query
            expect(source).toContain("from '@/lib/supabase/admin'")
            expect(source).toContain('createAdminClient')
        })
    })
})
