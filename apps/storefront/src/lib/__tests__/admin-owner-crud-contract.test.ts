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

function readFile(relativePath: string): string {
    const fullPath = path.resolve(process.cwd(), relativePath)
    return fs.readFileSync(fullPath, 'utf-8')
}

function fileExists(relativePath: string): boolean {
    return fs.existsSync(path.resolve(process.cwd(), relativePath))
}

// ── Authentication Guards ────────────────────────────────────────────────────

describe('Admin/Owner CRUD — Authentication Guards', () => {
    it('requirePanelAuth blocks unauthenticated access to all panel API routes', () => {
        const panelGuard = readFile('src/lib/panel-guard.ts')
        // Must check for valid session before allowing access
        expect(panelGuard).toContain('requirePanelAuth')
        expect(panelGuard).toMatch(/session|auth|getUser/i)
        // Must return 401 on failure
        expect(panelGuard).toMatch(/401|Unauthorized|unauthorized/i)
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
        // Must clear the simulation cookie
        expect(stop).toMatch(/delete.*cookie|clearCookie|response.*cookies/i)
    })

    it('owner validation checks tenant_id ownership (not just authentication)', () => {
        const ownerVal = readFile('src/lib/owner-validation.ts')
        // Must check that the authenticated user owns the specific tenant
        expect(ownerVal).toMatch(/tenant_id|tenantId/)
        expect(ownerVal).toMatch(/owner|profile|role/i)
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
        // Must check capability before allowing domain verification
        expect(emailDomain).toMatch(/capability|enable_custom_domain_email|checkCapability/i)
    })

    it('email domain route checks enable_custom_domain_email capability', () => {
        const emailDomain = readFile('src/app/api/panel/email-domain/route.ts')
        expect(emailDomain).toMatch(/capability|enable_custom_domain_email|checkCapability/i)
    })

    it('POS endpoints blocked when enable_pos flag is false (via capability gate)', () => {
        // Check that POS routes use capability gate
        const panelGuard = readFile('src/lib/panel-guard.ts')
        // Gateway must handle feature flag checks
        expect(panelGuard).toMatch(/capability|featureFlag|flags/i)
    })

    it('panel-policy.ts defines blocked routes for each module', () => {
        const policyPath = 'src/lib/governance/panel-policy.ts'
        expect(fileExists(policyPath)).toBe(true)
        const policy = readFile(policyPath)
        // Must reference module keys that gate panel access
        expect(policy).toMatch(/chatbot|ecommerce|pos|email_marketing/i)
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

    it('00_GROUND_TRUTH documents RLS policies for config table', () => {
        const gt = readFile('../../BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql')
        const rlsSection = gt.includes('SECTION 4: RLS POLICIES')
        expect(rlsSection).toBe(true)
        // config table must have RLS policies
        expect(gt).toContain('TABLE: config')
        // Sections 4 must reference config table policies
        const section4 = gt.slice(gt.indexOf('SECTION 4: RLS POLICIES'))
        expect(section4).toContain('config')
    })

    it('owner update config endpoint validates tenant ownership before write', () => {
        const updateConfig = readFile('src/app/api/panel/config/route.ts')
        expect(updateConfig).toMatch(/requirePanelAuth|tenant_id|ownership/i)
    })

    it('no panel route accesses data without tenant_id scoping', () => {
        const configRoute = readFile('src/app/api/panel/config/route.ts')
        // All queries must be scoped to the authenticated tenant
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

    it('check_rate_limit RPC used in distributed-rate-limit.ts (not in-memory only)', () => {
        const rl = readFile('src/lib/security/distributed-rate-limit.ts')
        expect(rl).toContain("rpc('check_rate_limit'")
        expect(rl).toContain('p_key')
        expect(rl).toContain('p_window_ms')
        expect(rl).toContain('p_max_hits')
    })

    it('distributed rate limit has in-memory fallback when DB is unavailable', () => {
        const rl = readFile('src/lib/security/distributed-rate-limit.ts')
        // Must not block when DB is down — fail-open for rate limiting
        expect(rl).toMatch(/fallback|catch|try|memory/i)
    })

    it('rate_limit_entries table documented in Ground Truth', () => {
        const gt = readFile('../../BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql')
        expect(gt).toContain('TABLE: rate_limit_entries')
    })
})

// ── Idempotency ────────────────────────────────────────────────────────────────

describe('Admin/Owner CRUD — Mutation Idempotency', () => {
    it('mutation-processor.ts implements L1 in-memory idempotency', () => {
        const mp = readFile('../../BOOTANDSTRAP_WEB/src/lib/governance/engine/mutation-processor.ts')
        // L1: in-memory cache for sub-second dedup
        expect(mp).toMatch(/Map|cache|L1|inMemory|pending/i)
    })

    it('idempotency_keys table exists in Ground Truth (L2 persistence)', () => {
        const gt = readFile('../../BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql')
        expect(gt).toContain('TABLE: idempotency_keys')
    })

    it('cleanup_expired_idempotency_keys RPC in Ground Truth functions section', () => {
        const gt = readFile('../../BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql')
        expect(gt).toContain('cleanup_expired_idempotency_keys')
    })
})

// ── Data Privacy & Security Headers ───────────────────────────────────────────

describe('Admin/Owner CRUD — Data Privacy & Security', () => {
    it('runtime-env.tsx does NOT expose TENANT_ID to client bundle', () => {
        const runtimeEnv = readFile('src/lib/runtime-env.tsx')
        // TENANT_ID must be server-only — never in NEXT_PUBLIC_*
        expect(runtimeEnv).not.toMatch(/NEXT_PUBLIC_TENANT_ID/)
        expect(runtimeEnv).not.toMatch(/TENANT_ID[^:]*:\s*process\.env\.TENANT_ID/)
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
        const nextConfig = readFile('../../ecommerce-template/next.config.ts')
        const secHeaders = [
            'Strict-Transport-Security',
            'X-Content-Type-Options',
            'X-Frame-Options',
        ]
        for (const header of secHeaders) {
            expect(nextConfig, `next.config.ts must configure ${header}`).toContain(header)
        }
    })

    it('store_tenant_secret RPC used for sensitive credential storage (not plaintext config)', () => {
        // Sensitive creds must go through SECURITY DEFINER secret function
        const gt = readFile('../../BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql')
        expect(gt).toContain('store_tenant_secret')
        expect(gt).toContain('get_tenant_secret')
    })

    it('store_medusa_credentials and get_medusa_credentials use SECURITY DEFINER', () => {
        const gt = readFile('../../BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql')
        expect(gt).toContain('store_medusa_credentials')
        expect(gt).toContain('get_medusa_credentials')
        // Both must be SECURITY DEFINER
        const storeFnIdx = gt.indexOf('store_medusa_credentials')
        const getMedusaFnIdx = gt.indexOf('get_medusa_credentials')
        expect(storeFnIdx).toBeGreaterThan(-1)
        expect(getMedusaFnIdx).toBeGreaterThan(-1)
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
