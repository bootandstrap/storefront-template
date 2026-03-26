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

import type { GovernanceAdapter, ActiveModule } from '../adapter'
import type { StoreConfig } from '../schemas'

export class SupabaseAdapter implements GovernanceAdapter {
    readonly name = 'supabase'
    private client: any = null

    /** Inject a Supabase client */
    setClient(client: any): this {
        this.client = client
        return this
    }

    private ensureClient(): any {
        if (!this.client) {
            throw new Error('[SupabaseAdapter] Client not set. Call setClient() first.')
        }
        return this.client
    }

    async getFlags(tenantId: string): Promise<Record<string, boolean>> {
        const sb = this.ensureClient()
        const { data, error } = await sb
            .from('feature_flags')
            .select('*')
            .eq('tenant_id', tenantId)
            .single()
        if (error || !data) return {}

        const flags: Record<string, boolean> = {}
        for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'boolean') flags[k] = v
        }
        return flags
    }

    async getLimits(tenantId: string): Promise<Record<string, number | string>> {
        const sb = this.ensureClient()
        const { data, error } = await sb
            .from('plan_limits')
            .select('*')
            .eq('tenant_id', tenantId)
            .single()
        if (error || !data) return {}

        const limits: Record<string, number | string> = {}
        for (const [k, v] of Object.entries(data)) {
            if (k === 'id' || k === 'tenant_id' || k === 'created_at' || k === 'updated_at') continue
            if (typeof v === 'number' || typeof v === 'string') limits[k] = v
        }
        return limits
    }

    async getModules(tenantId: string): Promise<ActiveModule[]> {
        const sb = this.ensureClient()
        const { data, error } = await sb
            .from('module_orders')
            .select('id, module_key, tier_name, status')
            .eq('tenant_id', tenantId)
        if (error || !data) return []

        return (data as any[]).map((row) => ({
            moduleKey: row.module_key,
            tierName: row.tier_name,
            status: row.status,
            orderId: row.id,
        }))
    }

    async getConfig(tenantId: string): Promise<StoreConfig | null> {
        const sb = this.ensureClient()
        const { data, error } = await sb
            .from('config')
            .select('*')
            .eq('tenant_id', tenantId)
            .single()
        if (error || !data) return null
        return data as StoreConfig
    }
}
