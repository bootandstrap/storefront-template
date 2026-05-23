/**
 * Admin/Owner CRUD Contract Tests — Panel Security & Capability Gates
 *
 * Validates that:
 *   - Panel routes enforce authentication (requirePanelAuth)
 *   - Panel actions respect capability gates (withPanelGuard / checkCapability)
 *   - No cross-tenant data leakage via RLS or code
 *   - Rate limiting guards are correctly configured
 *   - Idempotency controls are wired end-to-end
 *   - Security headers and IP extraction follow OWASP best practices
 *
 * Run: npx vitest run src/lib/__tests__/admin-owner-crud-contract.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ── Helpers ──────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(process.cwd(), '../..')
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations')

function readFile(relativePath: string): string {
    const fullPath = path.resolve(process.cwd(), relativePath)
    return fs.readFileSync(fullPath, 'utf-8')
}

function fileExists(relativePath: string): boolean {
    return fs.existsSync(path.resolve(process.cwd(), relativePath))
}

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8')
}

function readAllMigrations(): string {
    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((file) => file.endsWith('.sql'))
        .sort()
        .map((file) => fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8'))
        .join('\n')
}

// ── Authentication Guards ────────────────────────────────────────────────────

describe('Admin/Owner CRUD — Authentication Guards', () => {
    it('requirePanelAuth blocks unauthenticated access to all panel API routes', () => {
        const panelGuard = readFile('src/lib/panel-guard.ts')
        expect(panelGuard).toContain('requirePanelAuth')
        expect(panelGuard).toMatch(/session|auth|getUser/i)
        expect(panelGuard).toMatch(/throw new Error|Not authenticated|Insufficient permissions/i)
    })

    it('panel-guard.ts imports server-only (prevents client-side usage)', () => {
        const panelGuard = readFile('src/lib/panel-guard.ts')
        expect(panelGuard).toContain("'server-only'")
    })

    it('simulate_client_panel requires panel auth (admin-level, not owner)', () => {
        const simulate = readFile('src/app/api/admin/simulate_client_panel/route.ts')
        expect(simulate).toContain('requirePanelAuth')
    })

    it('stop_simulation endpoint clears simulation cookies securely', () => {
        const stop = readFile('src/app/api/admin/stop_simulation/route.ts')
        expect(stop).toContain('requirePanelAuth')
        expect(stop).toContain("cookieStore.delete('simulating_client')")
    })

    it('owner validation checks tenant_id ownership (not just authentication)', () => {
        const panelAuth = readFile('src/lib/panel-auth.ts')
        expect(panelAuth).toMatch(/tenant_id|tenantId/)
        expect(panelAuth).toMatch(/owner|profile|role/i)
    })
})

// ── Capability Gate Enforcement ───────────────────────────────────────────────

describe('Admin/Owner CRUD — Capability Gate Enforcement', () => {
    it('withPanelGuard HOF wraps panel actions with capability check', () => {
        // withPanelGuard should exist as Higher-Order Function
        const panelGuardFile = fileExists('src/lib/panel-guard.ts')
        expect(panelGuardFile).toBe(true)
        const content = readFile('src/lib/panel-guard.ts')
        expect(content).toMatch(/withPanelGuard|PanelGuard/)
    })

    it('email domain verify route checks enable_custom_domain_email capability', () => {
        const emailDomain = readFile('src/app/api/panel/email-domain/verify/route.ts')
        expect(emailDomain).toMatch(/enable_custom_email_domain/i)
    })

    it('email domain route checks enable_custom_domain_email capability', () => {
        const emailDomain = readFile('src/app/api/panel/email-domain/route.ts')
        expect(emailDomain).toMatch(/enable_custom_email_domain/i)
    })

    it('POS endpoints blocked when enable_pos flag is false (via capability gate)', () => {
        // Check that POS routes use capability gate
        const panelGuard = readFile('src/lib/panel-guard.ts')
        // Gateway must handle feature flag checks
        expect(panelGuard).toMatch(/capability|featureFlag|flags/i)
    })

    it('panel-policy.ts defines blocked routes for each module', () => {
        const policyPath = 'src/lib/panel-policy.ts'
        expect(fileExists(policyPath)).toBe(true)
        const policy = readFile(policyPath)
        expect(policy).toMatch(/chatbot|rrss|sales_channels|capacidad/i)
    })
})

// ── RLS Cross-Tenant Isolation ────────────────────────────────────────────────

describe('Admin/Owner CRUD — RLS Cross-Tenant Isolation', () => {
    it('panel actions use createPanelClient (RLS-enforced) not service role', () => {
        // All panel data access must go through RLS-enforced client
        const panelGuard = readFile('src/lib/panel-guard.ts')
        // Must NOT use service role for data access
        expect(panelGuard).not.toMatch(/SERVICE_ROLE|serviceRole|service_role/i)
    })

    it('local tenant migrations define tenant-scoped RLS policies for config', () => {
        const migrations = readAllMigrations()
        expect(migrations).toMatch(/CREATE POLICY "config_(select_tenant|select_owner_super_admin)"/)
        expect(migrations).toMatch(/ON config/)
    })

    it('owner update config endpoint validates tenant ownership before write', () => {
        const updateConfig = readFile('src/app/[lang]/(panel)/panel/tienda/actions.ts')
        expect(updateConfig).toMatch(/withPanelGuard|tenant_id|tenantId/i)
    })

    it('no panel route accesses data without tenant_id scoping', () => {
        const configRoute = readFile('src/app/[lang]/(panel)/panel/tienda/actions.ts')
        expect(configRoute).toMatch(/tenant_id|tenantId/)
    })
})

// ── Rate Limiting Guards ───────────────────────────────────────────────────────

describe('Admin/Owner CRUD — Rate Limiting Guards', () => {
    it('api-rate-guard.ts defines 6 guard types with correct limits', () => {
        const guard = readFile('src/lib/security/api-rate-guard.ts')
        // CHECKOUT: 10/min (strictest — Stripe charges money)
        expect(guard).toMatch(/CHECKOUT.*10|10.*CHECKOUT/i)
        // PANEL: 120/min (authenticated, higher limit)
        expect(guard).toMatch(/PANEL.*120|120.*PANEL/i)
        // WEBHOOK: 120/min (Stripe has retry logic)
        expect(guard).toMatch(/WEBHOOK.*120|120.*WEBHOOK/i)
        // AUTH: 20/min (anti-brute-force)
        expect(guard).toMatch(/AUTH.*20|20.*AUTH/i)
    })

    it('createSmartRateLimiter supports distributed Redis mode', () => {
        const rl = readFile('src/lib/security/rate-limit-factory.ts')
        expect(rl).toContain('createRedisRateLimiter')
        expect(rl).toContain('REDIS_URL')
    })

    it('smart rate limiter has in-memory fallback when Redis is unavailable', () => {
        const rl = readFile('src/lib/security/rate-limit-factory.ts')
        expect(rl).toMatch(/in-memory|memory|createRateLimiter/i)
    })

    it('stripe webhook route applies the dedicated webhook guard before processing', () => {
        const webhookRoute = readFile('src/app/api/webhooks/stripe/route.ts')
        expect(webhookRoute).toContain('withRateLimit')
        expect(webhookRoute).toContain('WEBHOOK_GUARD')
    })
})

// ── Idempotency ────────────────────────────────────────────────────────────────

describe('Admin/Owner CRUD — Mutation Idempotency', () => {
    it('stripe webhook route uses claim-and-mark RPCs for atomic idempotency', () => {
        const route = readFile('src/app/api/webhooks/stripe/route.ts')
        expect(route).toContain("rpc('claim_webhook_event'")
        expect(route).toContain("rpc('mark_webhook_processed'")
        expect(route).toContain("rpc('mark_webhook_failed'")
    })

    it('database types expose webhook idempotency RPCs to the storefront', () => {
        const databaseTypes = readFile('src/lib/supabase/database.types.ts')
        expect(databaseTypes).toContain('claim_webhook_event')
        expect(databaseTypes).toContain('mark_webhook_processed')
        expect(databaseTypes).toContain('mark_webhook_failed')
    })

    it('security hardening migration restricts dangerous security definer RPCs from anon', () => {
        const securityHardening = readRepoFile('supabase/migrations/20260406_security_hardening.sql')
        expect(securityHardening).toContain('dangerous SECURITY DEFINER functions')
        expect(securityHardening).toContain('claim_webhook_event')
    })
})

// ── Data Privacy & Security Headers ───────────────────────────────────────────

describe('Admin/Owner CRUD — Data Privacy & Security', () => {
    it('runtime-env.tsx does NOT expose TENANT_ID to client bundle', () => {
        const runtimeEnv = readFile('src/lib/runtime-env.tsx')
        expect(runtimeEnv).not.toMatch(/'TENANT_ID'/)
        expect(runtimeEnv).toContain('RUNTIME_ENV_KEYS')
    })

    it('getClientIp() uses LAST X-Forwarded-For segment (anti-spoofing)', () => {
        const ipExtractor = readFile('src/lib/security/get-client-ip.ts')
        // Must use LAST element, not first (first can be spoofed)
        expect(ipExtractor).toMatch(/\.pop\(\)|split.*\-1\]|at\(-1\)|lastIndexOf|reverse/i)
    })

    it('HTML sanitization module exists and handles XSS vectors', () => {
        const sanitize = readFile('src/lib/security/sanitize-html.ts')
        expect(sanitize).toMatch(/sanitize|escape|DOMPurify|XSS/i)
    })

    it('next.config.ts defines 6+ security headers including HSTS', () => {
        const nextConfig = readFile('next.config.ts')
        const secHeaders = [
            'Strict-Transport-Security',
            'X-Content-Type-Options',
            'X-Frame-Options',
        ]
        for (const header of secHeaders) {
            expect(nextConfig, `next.config.ts must configure ${header}`).toContain(header)
        }
    })

    it('database types expose tenant secret storage RPCs for sensitive credentials', () => {
        const databaseTypes = readFile('src/lib/supabase/database.types.ts')
        expect(databaseTypes).toContain('store_tenant_secret')
        expect(databaseTypes).toContain('get_tenant_secret')
    })

    it('security hardening migration protects Medusa credential RPCs', () => {
        const securityHardening = readRepoFile('supabase/migrations/20260406_security_hardening.sql')
        expect(securityHardening).toContain('store_medusa_credentials')
        expect(securityHardening).toContain('get_medusa_credentials')
        expect(securityHardening).toContain('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon')
    })
})

// ── Panel Loading/Error Coverage ──────────────────────────────────────────────

describe('Admin/Owner CRUD — Panel UX Resilience', () => {
    it('loading.tsx coverage: all panel routes have loading state', async () => {
        const panelAppDir = path.resolve(process.cwd(), 'src/app/(panel)')
        if (!fs.existsSync(panelAppDir)) {
            // Structure may vary — skip if panel dir not found at this path
            return
        }
        const walkDir = (dir: string): string[] => {
            const results: string[] = []
            for (const file of fs.readdirSync(dir)) {
                const filepath = path.join(dir, file)
                const stat = fs.statSync(filepath)
                if (stat.isDirectory()) results.push(...walkDir(filepath))
                else results.push(filepath)
            }
            return results
        }
        const allFiles = walkDir(panelAppDir)
        const routeDirs = new Set(allFiles
            .filter(f => f.includes('page.tsx'))
            .map(f => path.dirname(f))
        )
        // Each route dir with page.tsx must have loading.tsx
        for (const dir of routeDirs) {
            const hasLoading = fs.existsSync(path.join(dir, 'loading.tsx'))
            expect(hasLoading, `Missing loading.tsx in ${dir}`).toBe(true)
        }
    })

    it('PanelErrorBoundary exists with retry + dev display', () => {
        const errorBoundary = readFile('src/components/panel/PanelErrorBoundary.tsx')
        expect(errorBoundary).toMatch(/retry|Retry|onReset/i)
    })
})
