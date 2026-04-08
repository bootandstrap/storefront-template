/**
 * @module provisioning/__tests__/unified-provisioner
 * @description Integration tests for UnifiedProvisioner.
 *
 * Uses a MockSupabaseClient + MockBillingGateway to test the full
 * provisioning pipeline without any external dependencies.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UnifiedProvisioner } from '../unified-provisioner'
import { MockBillingGateway } from '../../billing/providers/mock'
import type {
    ProvisionerDependencies,
    GovernanceContractSource,
    SupabaseProvisionClient,
} from '../types'

// ── Mock Supabase ─────────────────────────────────────────────────────────

/**
 * In-memory Supabase mock for provisioner tests.
 * Tracks all operations and simulates table storage.
 */
function createMockSupabase(): SupabaseProvisionClient & { tables: Record<string, Record<string, unknown>[]> } {
    const tables: Record<string, Record<string, unknown>[]> = {
        tenants: [],
        config: [],
        feature_flags: [],
        plan_limits: [],
    }

    return {
        tables,
        from(table: string) {
            if (!tables[table]) tables[table] = []

            return {
                select(_columns?: string) {
                    return {
                        eq(column: string, value: string) {
                            return {
                                async maybeSingle() {
                                    const row = tables[table]?.find(r => r[column] === value) ?? null
                                    return { data: row, error: null }
                                },
                                async single() {
                                    const row = tables[table]?.find(r => r[column] === value) ?? null
                                    return { data: row, error: row ? null : { message: 'Not found' } }
                                },
                            }
                        },
                    }
                },
                async insert(row: Record<string, unknown>) {
                    tables[table]!.push({ ...row })
                    return { error: null }
                },
                async upsert(row: Record<string, unknown>, _options?: { onConflict: string }) {
                    const key = _options?.onConflict || 'tenant_id'
                    const idx = tables[table]?.findIndex(r => r[key] === row[key]) ?? -1
                    if (idx >= 0) {
                        tables[table]![idx] = { ...tables[table]![idx], ...row }
                    } else {
                        tables[table]!.push({ ...row })
                    }
                    return { error: null }
                },
                update(row: Record<string, unknown>) {
                    return {
                        async eq(column: string, value: string) {
                            const idx = tables[table]?.findIndex(r => r[column] === value) ?? -1
                            if (idx >= 0) {
                                tables[table]![idx] = { ...tables[table]![idx], ...row }
                            }
                            return { error: null }
                        },
                    }
                },
            }
        },
    }
}

// ── Minimal contract ──────────────────────────────────────────────────────

const MINI_CONTRACT: GovernanceContractSource = {
    flags: {
        keys: [
            'enable_maintenance_mode',
            'enable_ecommerce',
            'enable_pos',
            'enable_chatbot',
            'enable_crm',
        ],
        defaults: {
            enable_maintenance_mode: true,
            enable_ecommerce: false,
            enable_pos: false,
            enable_chatbot: false,
            enable_crm: false,
        },
    },
    limits: {
        keys: ['max_products', 'max_orders_month', 'max_customers', 'plan_name', 'plan_tier'],
        defaults: {
            max_products: 10,
            max_orders_month: 50,
            max_customers: 50,
            plan_name: 'starter',
            plan_tier: 'basic',
        },
    },
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('UnifiedProvisioner', () => {
    let mockSupabase: ReturnType<typeof createMockSupabase>
    let mockBilling: MockBillingGateway
    let deps: ProvisionerDependencies
    const logs: string[] = []

    beforeEach(() => {
        mockSupabase = createMockSupabase()
        mockBilling = new MockBillingGateway()
        logs.length = 0

        deps = {
            supabase: mockSupabase,
            billing: mockBilling,
            log: (_icon: string, msg: string) => logs.push(msg),
            contract: MINI_CONTRACT,
        }
    })

    // ── Local mode ────────────────────────────────────────────────────

    describe('Local mode', () => {
        it('completes full pipeline', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'test-tenant-001',
                tenantName: 'Test Store',
                slug: 'test-store',
            })

            expect(result.success).toBe(true)
            expect(result.tenantId).toBe('test-tenant-001')
            expect(result.slug).toBe('test-store')
            expect(result.mode).toBe('local')
        })

        it('creates tenant in supabase', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            await provisioner.provision({
                tenantId: 'tenant-abc',
                tenantName: 'My Store',
                slug: 'my-store',
            })

            expect(mockSupabase.tables.tenants).toHaveLength(1)
            expect(mockSupabase.tables.tenants[0].name).toBe('My Store')
        })

        it('seeds config in supabase', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            await provisioner.provision({
                tenantId: 'tenant-abc',
                tenantName: 'My Store',
                slug: 'my-store',
            })

            expect(mockSupabase.tables.config).toHaveLength(1)
            expect(mockSupabase.tables.config[0].business_name).toBe('My Store')
        })

        it('enables all flags in local mode (except maintenance)', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            await provisioner.provision({
                tenantId: 'tenant-abc',
                tenantName: 'My Store',
                slug: 'my-store',
            })

            const flags = mockSupabase.tables.feature_flags[0]
            expect(flags.enable_maintenance_mode).toBe(false) // NEVER enable in provisioner
            expect(flags.enable_ecommerce).toBe(true)
            expect(flags.enable_pos).toBe(true)
            expect(flags.enable_chatbot).toBe(true)
            expect(flags.enable_crm).toBe(true)
        })

        it('applies enterprise_max limits in local mode', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'tenant-abc',
                tenantName: 'My Store',
                slug: 'my-store',
            })

            const limits = mockSupabase.tables.plan_limits[0]
            expect(limits.plan_name).toBe('enterprise_max')
            expect(result.modules.limitsSet).toBeGreaterThan(0)
        })

        it('skips billing in local mode', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'tenant-abc',
                tenantName: 'My Store',
                slug: 'my-store',
            })

            expect(mockBilling.calls.filter(c => c.method.includes('Subscription'))).toHaveLength(0)
            expect(result.steps.find(s => s.step === 'create_billing_customer')?.status).toBe('skipped')
        })

        it('skips infrastructure steps in local mode', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'tenant-abc',
                tenantName: 'My Store',
                slug: 'my-store',
            })

            expect(result.steps.find(s => s.step === 'create_github_repo')?.status).toBe('skipped')
            expect(result.steps.find(s => s.step === 'deploy_infrastructure')?.status).toBe('skipped')
        })
    })

    // ── Demo mode ─────────────────────────────────────────────────────

    describe('Demo mode', () => {
        it('also enables all flags', async () => {
            const provisioner = new UnifiedProvisioner('demo', deps)
            await provisioner.provision({
                tenantId: 'demo-tenant',
                tenantName: 'Demo Store',
                slug: 'demo',
            })

            const flags = mockSupabase.tables.feature_flags[0]
            expect(flags.enable_ecommerce).toBe(true)
            expect(flags.enable_crm).toBe(true)
            expect(flags.enable_maintenance_mode).toBe(false)
        })
    })

    // ── Production mode ───────────────────────────────────────────────

    describe('Production mode', () => {
        it('requires ownerEmail', async () => {
            const provisioner = new UnifiedProvisioner('production', deps)
            const result = await provisioner.provision({
                tenantId: 'prod-tenant',
                tenantName: 'Real Store',
                slug: 'real-store',
                // no ownerEmail!
            })

            expect(result.success).toBe(false)
            const validateStep = result.steps.find(s => s.step === 'validate_input')
            expect(validateStep?.status).toBe('failed')
        })

        it('uses contract defaults for flags', async () => {
            const provisioner = new UnifiedProvisioner('production', deps)
            await provisioner.provision({
                tenantId: 'prod-tenant',
                tenantName: 'Real Store',
                slug: 'real-store',
                ownerEmail: 'owner@example.com',
            })

            const flags = mockSupabase.tables.feature_flags[0]
            // Production defaults — not all enabled
            expect(flags.enable_ecommerce).toBe(false)
            expect(flags.enable_maintenance_mode).toBe(false) // Still forced off
        })
    })

    // ── Input validation ──────────────────────────────────────────────

    describe('Input validation', () => {
        it('fails with empty tenant name', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantName: '',
                slug: 'empty',
            })

            expect(result.success).toBe(false)
        })

        it('auto-generates tenantId if not provided', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantName: 'Auto Gen Store',
                slug: 'auto-gen',
            })

            expect(result.success).toBe(true)
            expect(result.tenantId).toBeTruthy()
            expect(result.tenantId).not.toBe('unknown')
        })

        it('auto-generates slug if not provided', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'tenant-x',
                tenantName: 'My Amazing Store!',
            })

            expect(result.success).toBe(true)
            expect(result.slug).toBe('my-amazing-store')
        })
    })

    // ── Idempotency ───────────────────────────────────────────────────

    describe('Idempotency', () => {
        it('does not duplicate tenant if already exists', async () => {
            const provisioner1 = new UnifiedProvisioner('local', deps)
            await provisioner1.provision({
                tenantId: 'tenant-idem',
                tenantName: 'Store',
                slug: 'store',
            })

            const provisioner2 = new UnifiedProvisioner('local', deps)
            await provisioner2.provision({
                tenantId: 'tenant-idem',
                tenantName: 'Store Updated',
                slug: 'store',
            })

            // Should still have 1 tenant (not 2)
            expect(mockSupabase.tables.tenants).toHaveLength(1)
        })
    })

    // ── Store config from template ────────────────────────────────────

    describe('Store config from template', () => {
        it('applies template store config to config row', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            await provisioner.provision({
                tenantId: 'tpl-tenant',
                tenantName: 'Frutería Campifruit',
                slug: 'campifruit',
                metadata: {
                    storeConfig: {
                        business_name: 'Frutería Campifruit',
                        primary_color: '#FF6B35',
                        accent_color: '#004E89',
                        language: 'ca',
                        default_currency: 'eur',
                        timezone: 'Europe/Madrid',
                        contact_phone: '+34 666 123 456',
                    },
                },
            })

            const config = mockSupabase.tables.config[0]
            expect(config.business_name).toBe('Frutería Campifruit')
            expect(config.primary_color).toBe('#FF6B35')
            expect(config.accent_color).toBe('#004E89')
            expect(config.language).toBe('ca')
            expect(config.timezone).toBe('Europe/Madrid')
        })
    })

    // ── Result shape ──────────────────────────────────────────────────

    describe('Result shape', () => {
        it('has correct result structure', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'shape-test',
                tenantName: 'Shape Store',
                slug: 'shape',
            })

            expect(result).toHaveProperty('success')
            expect(result).toHaveProperty('tenantId')
            expect(result).toHaveProperty('slug')
            expect(result).toHaveProperty('mode')
            expect(result).toHaveProperty('steps')
            expect(result).toHaveProperty('billing')
            expect(result).toHaveProperty('modules')
            expect(result).toHaveProperty('warnings')
            expect(result).toHaveProperty('durationMs')
            expect(Array.isArray(result.steps)).toBe(true)
            expect(typeof result.durationMs).toBe('number')
        })

        it('reports billing provider as mock', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'billing-test',
                tenantName: 'Billing Store',
                slug: 'billing',
            })

            expect(result.billing.provider).toBe('mock')
        })

        it('tracks flag and limit counts in modules', async () => {
            const provisioner = new UnifiedProvisioner('local', deps)
            const result = await provisioner.provision({
                tenantId: 'count-test',
                tenantName: 'Count Store',
                slug: 'count',
            })

            expect(result.modules.flagsEnabled).toBeGreaterThan(0)
            expect(result.modules.flagsTotal).toBe(MINI_CONTRACT.flags.keys.length)
            expect(result.modules.limitsSet).toBeGreaterThan(0)
        })
    })
})
