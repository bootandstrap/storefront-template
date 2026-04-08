/**
 * ContractAdapter — Static governance from contract (for tests/Storybook)
 *
 * Returns fail-closed defaults from the generated contract.
 * Supports flag/limit overrides for test scenarios.
 * Zero I/O — instant, deterministic, no Supabase dependency.
 */
import type { GovernanceAdapter, ActiveModule } from '../types';
import type { StoreConfig } from '../schemas';
export declare class ContractAdapter implements GovernanceAdapter {
    readonly name = "contract";
    private flagOverrides;
    private limitOverrides;
    private moduleOverrides;
    /** Set flag overrides for test scenarios */
    setFlags(overrides: Record<string, boolean>): this;
    /** Set limit overrides for test scenarios */
    setLimits(overrides: Record<string, number | string>): this;
    /** Set active modules for test scenarios */
    setModules(modules: ActiveModule[]): this;
    getFlags(_tenantId: string): Promise<Record<string, boolean>>;
    getLimits(_tenantId: string): Promise<Record<string, number | string>>;
    getModules(_tenantId: string): Promise<ActiveModule[]>;
    getConfig(_tenantId: string): Promise<StoreConfig | null>;
}
//# sourceMappingURL=contract.d.ts.map