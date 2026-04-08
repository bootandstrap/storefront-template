/**
 * ContractAdapter — Static governance from contract (for tests/Storybook)
 *
 * Returns fail-closed defaults from the generated contract.
 * Supports flag/limit overrides for test scenarios.
 * Zero I/O — instant, deterministic, no Supabase dependency.
 */
import { FALLBACK_CONFIG } from '../defaults';
export class ContractAdapter {
    name = 'contract';
    flagOverrides = {};
    limitOverrides = {};
    moduleOverrides = [];
    /** Set flag overrides for test scenarios */
    setFlags(overrides) {
        this.flagOverrides = { ...this.flagOverrides, ...overrides };
        return this;
    }
    /** Set limit overrides for test scenarios */
    setLimits(overrides) {
        this.limitOverrides = { ...this.limitOverrides, ...overrides };
        return this;
    }
    /** Set active modules for test scenarios */
    setModules(modules) {
        this.moduleOverrides = modules;
        return this;
    }
    async getFlags(_tenantId) {
        // Start with all flags OFF (fail-closed), then apply overrides
        const base = { ...FALLBACK_CONFIG.featureFlags };
        return { ...base, ...this.flagOverrides };
    }
    async getLimits(_tenantId) {
        const raw = FALLBACK_CONFIG.planLimits;
        const base = {};
        for (const [k, v] of Object.entries(raw)) {
            if (v !== null && v !== undefined)
                base[k] = v;
        }
        return { ...base, ...this.limitOverrides };
    }
    async getModules(_tenantId) {
        return this.moduleOverrides;
    }
    async getConfig(_tenantId) {
        return null; // No config in contract mode — use defaults
    }
}
//# sourceMappingURL=contract.js.map