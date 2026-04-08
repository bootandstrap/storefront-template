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
export class SupabaseAdapter {
    name = 'supabase';
    client = null;
    /** Inject a Supabase client */
    setClient(client) {
        this.client = client;
        return this;
    }
    ensureClient() {
        if (!this.client) {
            throw new Error('[SupabaseAdapter] Client not set. Call setClient() first.');
        }
        return this.client;
    }
    async getFlags(tenantId) {
        const sb = this.ensureClient();
        const { data, error } = await sb
            .from('feature_flags')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();
        if (error || !data)
            return {};
        const flags = {};
        for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'boolean')
                flags[k] = v;
        }
        return flags;
    }
    async getLimits(tenantId) {
        const sb = this.ensureClient();
        const { data, error } = await sb
            .from('plan_limits')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();
        if (error || !data)
            return {};
        const limits = {};
        for (const [k, v] of Object.entries(data)) {
            if (k === 'id' || k === 'tenant_id' || k === 'created_at' || k === 'updated_at')
                continue;
            if (typeof v === 'number' || typeof v === 'string')
                limits[k] = v;
        }
        return limits;
    }
    async getModules(tenantId) {
        const sb = this.ensureClient();
        const { data, error } = await sb
            .from('module_orders')
            .select(`
                id, status,
                module_order_items (
                    module_key,
                    tier_name
                )
            `)
            .eq('tenant_id', tenantId)
            .in('status', ['active', 'paid', 'completed', 'confirmed']);
        if (error || !data)
            return [];
        const modules = [];
        for (const order of data) {
            const items = Array.isArray(order.module_order_items)
                ? order.module_order_items
                : order.module_order_items ? [order.module_order_items] : [];
            for (const item of items) {
                if (item.module_key) {
                    modules.push({
                        moduleKey: item.module_key,
                        tierName: item.tier_name,
                        status: order.status,
                        orderId: order.id,
                    });
                }
            }
        }
        return modules;
    }
    async getConfig(tenantId) {
        const sb = this.ensureClient();
        const { data, error } = await sb
            .from('config')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();
        if (error || !data)
            return null;
        return data;
    }
}
//# sourceMappingURL=supabase.js.map