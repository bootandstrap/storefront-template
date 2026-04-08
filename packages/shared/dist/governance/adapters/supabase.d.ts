/**
 * SupabaseAdapter — Production governance from Supabase
 *
 * Wraps direct queries for flags, limits, modules, config.
 * Used in production and local development.
 *
 * Note: This is a shared package adapter — it receives an already-created
 * Supabase client from the consumer (storefront or BSWEB). It does NOT
 * create its own Supabase connection.
 */
import type { GovernanceAdapter, ActiveModule } from '../types';
import type { StoreConfig } from '../schemas';
export declare class SupabaseAdapter implements GovernanceAdapter {
    readonly name = "supabase";
    private client;
    /** Inject a Supabase client */
    setClient(client: any): this;
    private ensureClient;
    getFlags(tenantId: string): Promise<Record<string, boolean>>;
    getLimits(tenantId: string): Promise<Record<string, number | string>>;
    getModules(tenantId: string): Promise<ActiveModule[]>;
    getConfig(tenantId: string): Promise<StoreConfig | null>;
}
//# sourceMappingURL=supabase.d.ts.map