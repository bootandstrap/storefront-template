/**
 * @module provisioning/unified-provisioner
 * @description UnifiedProvisioner — single pipeline for all tenant provisioning modes.
 *
 * Replaces the 3 divergent provisioning pipelines:
 *   1. seed-governance.ts (local template engine)
 *   2. demo-tenant-engine.ts (BSWEB demo provisioner)
 *   3. provisionTenantCore() (BSWEB production provisioner)
 *
 * All modes execute the same step sequence; the mode controls which steps
 * are skipped and what implementations (real vs mock) are used.
 *
 * Step sequence:
 *   1. validate_input → validate + normalize inputs
 *   2. create_tenant → upsert tenant row in Supabase
 *   3. seed_config → upsert store config
 *   4. seed_flags → upsert feature flags (all true in demo, contract defaults otherwise)
 *   5. seed_limits → upsert plan limits (max in demo, contract defaults otherwise)
 *   6. create_billing_customer → create customer in billing provider
 *   7. create_subscription → create maintenance subscription
 *   8. apply_module_bundle → activate module flags/limits
 *   9. create_github_repo → create tenant repo from template (production only)
 *   10. deploy_infrastructure → deploy to Dokploy (production only)
 *   11. verify_health → check tenant is healthy
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
import { ENTERPRISE_MAX_LIMITS } from './types';
// ── UnifiedProvisioner ─────────────────────────────────────────────────────
export class UnifiedProvisioner {
    mode;
    deps;
    steps = [];
    warnings = [];
    constructor(mode, deps) {
        this.mode = mode;
        this.deps = deps;
    }
    // ── Factory helpers ───────────────────────────────────────────────────
    /** Quick check: is this a demo-like mode where all features are unlocked? */
    get isDemoLike() {
        return this.mode === 'local' || this.mode === 'demo';
    }
    /** Should billing operations run? */
    get shouldBill() {
        return this.mode === 'production';
    }
    // ── Main pipeline ─────────────────────────────────────────────────────
    async provision(input) {
        const start = Date.now();
        const { log } = this.deps;
        log('🚀', `═══ UNIFIED PROVISIONER [${this.mode.toUpperCase()}] ═══`);
        // 1. Validate & normalize
        const normalized = await this.runStep('validate_input', () => this.validateInput(input));
        if (!normalized)
            return this.buildResult(normalized ?? input, start);
        const { tenantId, slug } = normalized;
        // 2. Create tenant
        await this.runStep('create_tenant', () => this.createTenant(tenantId, slug, normalized));
        // 3. Seed config
        await this.runStep('seed_config', () => this.seedConfig(tenantId, normalized));
        // 4. Seed flags
        const flagsResult = await this.runStep('seed_flags', () => this.seedFlags(tenantId));
        // 5. Seed limits
        const limitsResult = await this.runStep('seed_limits', () => this.seedLimits(tenantId, normalized));
        // 6. Create billing customer
        if (input.skipBilling || !this.shouldBill) {
            this.skipStep('create_billing_customer');
            this.skipStep('create_subscription');
        }
        else {
            await this.runStep('create_billing_customer', () => this.createBillingCustomer(tenantId, normalized));
            await this.runStep('create_subscription', () => this.createSubscription(tenantId, normalized));
        }
        // 7. Apply module bundle (always runs — sets flags/limits)
        if (normalized.moduleBundle) {
            await this.runStep('apply_module_bundle', () => this.applyModuleBundle(tenantId, normalized.moduleBundle));
        }
        else {
            this.skipStep('apply_module_bundle');
        }
        // 8-9. Infra (production only)
        if (input.skipRepoCreation || this.mode !== 'production') {
            this.skipStep('create_github_repo');
        }
        if (input.skipDeploy || this.mode === 'local') {
            this.skipStep('deploy_infrastructure');
        }
        // 10. Health check
        this.skipStep('verify_health'); // Implemented by consumer (BSWEB orchestrator)
        const result = this.buildResult(normalized, start);
        const flagCount = flagsResult?.flagsEnabled ?? 0;
        const flagTotal = flagsResult?.flagsTotal ?? 0;
        const limitsCount = limitsResult?.limitsSet ?? 0;
        result.modules = { flagsEnabled: flagCount, flagsTotal: flagTotal, limitsSet: limitsCount };
        log('✅', `═══ PROVISIONING COMPLETE [${this.mode}] ${result.durationMs}ms ═══`);
        return result;
    }
    // ── Step implementations ──────────────────────────────────────────────
    validateInput(input) {
        const tenantId = input.tenantId || this.generateUUID();
        const slug = input.slug || this.slugify(input.tenantName);
        if (!input.tenantName || input.tenantName.trim().length === 0) {
            throw new Error('tenantName is required');
        }
        if (this.mode === 'production' && !input.ownerEmail) {
            throw new Error('ownerEmail is required for production provisioning');
        }
        this.deps.log('📋', `Tenant: ${input.tenantName} (${tenantId}) [${slug}]`);
        return { ...input, tenantId, slug };
    }
    async createTenant(tenantId, slug, input) {
        const { supabase, log } = this.deps;
        // Check if tenant already exists
        const { data: existing } = await supabase
            .from('tenants')
            .select('id, name, status')
            .eq('id', tenantId)
            .maybeSingle();
        if (existing) {
            log('✅', `Tenant exists: ${existing.name} (${existing.status})`);
            return;
        }
        // Create tenant
        const payload = {
            id: tenantId,
            name: input.tenantName,
            slug,
            status: 'active',
        };
        // Add optional fields (some may not exist in DB — defensive)
        if (input.ownerEmail)
            payload.owner_email = input.ownerEmail;
        if (this.isDemoLike)
            payload.plan_tier = 'enterprise';
        const { error } = await supabase.from('tenants').insert(payload);
        if (error) {
            // Retry with minimal payload (handles schema drift)
            const { error: retryErr } = await supabase.from('tenants').insert({
                id: tenantId,
                name: input.tenantName,
                slug,
                status: 'active',
            });
            if (retryErr)
                throw new Error(`Tenant creation failed: ${retryErr.message}`);
            log('⚠️', 'Tenant created with minimal fields (schema drift)');
        }
        else {
            log('✅', `Tenant created: ${input.tenantName}`);
        }
    }
    async seedConfig(tenantId, input) {
        const { supabase, log } = this.deps;
        const configPayload = {
            tenant_id: tenantId,
            business_name: input.tenantName,
            whatsapp_number: '',
            default_country_prefix: '+34',
            primary_color: '#2D5016',
            accent_color: '#4A7C28',
            language: 'es',
            default_currency: input.currency?.toLowerCase() ?? 'eur',
            active_currencies: [input.currency?.toLowerCase() ?? 'eur'],
            active_languages: ['es'],
            timezone: 'Europe/Madrid',
            onboarding_completed: this.isDemoLike,
        };
        // Apply template overrides if template provided
        if (input.metadata?.storeConfig) {
            const tpl = input.metadata.storeConfig;
            if (tpl.business_name)
                configPayload.business_name = tpl.business_name;
            if (tpl.primary_color)
                configPayload.primary_color = tpl.primary_color;
            if (tpl.accent_color)
                configPayload.accent_color = tpl.accent_color;
            if (tpl.language)
                configPayload.language = tpl.language;
            if (tpl.default_currency)
                configPayload.default_currency = tpl.default_currency;
            if (tpl.active_currencies)
                configPayload.active_currencies = tpl.active_currencies;
            if (tpl.active_languages)
                configPayload.active_languages = tpl.active_languages;
            if (tpl.timezone)
                configPayload.timezone = tpl.timezone;
            if (tpl.contact_phone)
                configPayload.whatsapp_number = tpl.contact_phone;
            if (tpl.logo_url)
                configPayload.logo_url = tpl.logo_url;
            if (tpl.description) {
                configPayload.hero_subtitle = tpl.description;
                configPayload.footer_description = tpl.description;
                configPayload.meta_description = tpl.description;
            }
        }
        await this.upsertWithRetry(supabase, 'config', configPayload, log);
        log('✅', `Config seeded: ${configPayload.business_name}`);
    }
    async seedFlags(tenantId) {
        const { supabase, log, contract } = this.deps;
        const flagPayload = { tenant_id: tenantId };
        for (const key of contract.flags.keys) {
            if (key === 'enable_maintenance_mode') {
                flagPayload[key] = false; // NEVER enable maintenance in provisioner
            }
            else if (this.isDemoLike) {
                flagPayload[key] = true; // Demo = everything ON
            }
            else {
                flagPayload[key] = contract.flags.defaults?.[key] ?? false;
            }
        }
        await this.upsertWithRetry(supabase, 'feature_flags', flagPayload, log);
        const flagsEnabled = Object.entries(flagPayload)
            .filter(([k, v]) => k !== 'tenant_id' && v === true).length;
        const flagsTotal = contract.flags.keys.length;
        log('✅', `Flags seeded: ${flagsEnabled}/${flagsTotal} enabled`);
        return { flagsEnabled, flagsTotal };
    }
    async seedLimits(tenantId, input) {
        const { supabase, log, contract } = this.deps;
        const limitsPayload = { tenant_id: tenantId };
        for (const key of contract.limits.keys) {
            if (this.isDemoLike && key in ENTERPRISE_MAX_LIMITS) {
                limitsPayload[key] = ENTERPRISE_MAX_LIMITS[key];
            }
            else if (contract.limits.defaults?.[key] !== undefined) {
                limitsPayload[key] = contract.limits.defaults[key];
            }
            else if (key in ENTERPRISE_MAX_LIMITS) {
                limitsPayload[key] = ENTERPRISE_MAX_LIMITS[key]; // Reasonable default
            }
            else {
                limitsPayload[key] = 0; // Unknown key — fail-closed
            }
        }
        // Set plan name
        limitsPayload.plan_name = this.isDemoLike
            ? 'enterprise_max'
            : (input.metadata?.planName || 'standard');
        await this.upsertWithRetry(supabase, 'plan_limits', limitsPayload, log);
        const limitsSet = contract.limits.keys.length;
        log('✅', `Limits seeded: ${limitsSet} keys (${this.isDemoLike ? 'enterprise_max' : 'standard'})`);
        return { limitsSet };
    }
    async createBillingCustomer(tenantId, input) {
        const result = await this.deps.billing.createCustomer({
            tenantId,
            tenantName: input.tenantName,
            ownerEmail: input.ownerEmail,
            currency: input.currency,
        });
        if (result.error) {
            this.warnings.push(`Billing customer creation warning: ${result.error}`);
            this.deps.log('⚠️', `Billing customer: ${result.error}`);
        }
        else {
            this.deps.log('✅', `Billing customer: ${result.customerId} (${this.deps.billing.provider})`);
        }
    }
    async createSubscription(tenantId, input) {
        const result = await this.deps.billing.createMaintenanceSubscription({
            tenantId,
            tenantName: input.tenantName,
            ownerEmail: input.ownerEmail,
            currency: input.currency,
        });
        if (result.error) {
            this.warnings.push(`Subscription creation warning: ${result.error}`);
            this.deps.log('⚠️', `Subscription: ${result.error}`);
        }
        else {
            this.deps.log('✅', `Subscription: ${result.subscriptionId} (${result.status})`);
        }
    }
    async applyModuleBundle(_tenantId, bundleName) {
        this.deps.log('📦', `Module bundle: ${bundleName}`);
        // Module bundle application is handled by the flag seeding above (demo mode = all enabled)
        // For production, the module-governance-engine in BSWEB handles activation per webhook
    }
    // ── Upsert with auto-retry (handles schema drift) ─────────────────────
    async upsertWithRetry(supabase, table, payload, log, maxRetries = 10) {
        let attempt = 0;
        const removed = [];
        while (attempt < maxRetries) {
            const { error } = await supabase
                .from(table)
                .upsert(payload, { onConflict: 'tenant_id' });
            if (!error) {
                if (removed.length > 0) {
                    this.warnings.push(`[${table}] Removed ${removed.length} unknown columns: ${removed.join(', ')}`);
                }
                return;
            }
            // PostgREST column-not-found pattern
            const badCol = error.message.match(/Could not find the '(\w+)' column/);
            if (badCol) {
                log('⚠️', `[${table}] Column '${badCol[1]}' not in DB — removing`);
                delete payload[badCol[1]];
                removed.push(badCol[1]);
                attempt++;
            }
            else {
                throw new Error(`[${table}] Upsert failed: ${error.message}`);
            }
        }
        throw new Error(`[${table}] Too many unknown columns removed (${removed.length})`);
    }
    // ── Step runner ───────────────────────────────────────────────────────
    async runStep(step, fn) {
        const start = Date.now();
        try {
            const result = await fn();
            this.steps.push({
                step,
                status: 'success',
                durationMs: Date.now() - start,
            });
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err.message : 'Unknown error';
            this.steps.push({
                step,
                status: 'failed',
                durationMs: Date.now() - start,
                error,
            });
            this.warnings.push(`Step '${step}' failed: ${error}`);
            this.deps.log('❌', `[${step}] ${error}`);
            return null;
        }
    }
    skipStep(step) {
        this.steps.push({ step, status: 'skipped', durationMs: 0 });
    }
    // ── Result builder ────────────────────────────────────────────────────
    buildResult(input, startTime) {
        return {
            success: this.steps.every(s => s.status !== 'failed'),
            tenantId: input.tenantId || 'unknown',
            slug: input.slug || 'unknown',
            mode: this.mode,
            steps: [...this.steps],
            billing: {
                customerId: null,
                subscriptionId: null,
                provider: this.deps.billing.provider,
            },
            modules: { flagsEnabled: 0, flagsTotal: 0, limitsSet: 0 },
            warnings: [...this.warnings],
            durationMs: Date.now() - startTime,
        };
    }
    // ── Utilities ─────────────────────────────────────────────────────────
    generateUUID() {
        // Simple UUID v4 without crypto dependency
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }
    slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }
}
//# sourceMappingURL=unified-provisioner.js.map