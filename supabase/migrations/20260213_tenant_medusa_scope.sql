-- ============================================================================
-- Tenant -> Medusa Scope Mapping
-- Date: 2026-02-13
-- Purpose: Explicitly map each tenant to its Medusa sales channel scope.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_medusa_scope (
    tenant_id UUID PRIMARY KEY,
    medusa_sales_channel_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_medusa_scope IS
    'Maps application tenant_id to Medusa sales_channel_id for fail-closed admin scoping.';

COMMENT ON COLUMN tenant_medusa_scope.tenant_id IS
    'Tenant identifier from public.tenants.id (or tenant UUID convention when tenants table is absent).';

COMMENT ON COLUMN tenant_medusa_scope.medusa_sales_channel_id IS
    'Medusa sales channel ID used to scope Admin API operations.';

ALTER TABLE tenant_medusa_scope ENABLE ROW LEVEL SECURITY;

-- Keep table private by default: no SELECT policies for anon/authenticated.
-- service_role access remains available for server-side clients.

DROP POLICY IF EXISTS "tenant_medusa_scope_select_none" ON tenant_medusa_scope;

-- Optional write guard for authenticated users (deny all)
CREATE POLICY "tenant_medusa_scope_select_none"
    ON tenant_medusa_scope
    FOR SELECT
    TO authenticated, anon
    USING (false);

