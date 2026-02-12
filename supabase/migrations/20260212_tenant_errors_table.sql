-- ============================================================================
-- Migration: tenant_errors table (Error Inbox for SuperAdmin)
-- Date: 2026-02-12
-- Purpose: Store per-tenant runtime errors for the SuperAdmin error inbox.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    source TEXT NOT NULL,           -- 'webhook', 'registration', 'medusa', 'config', 'rls', 'build'
    severity TEXT NOT NULL DEFAULT 'error',  -- 'error', 'warning', 'critical'
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tenant_errors_tenant
    ON tenant_errors(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_errors_unresolved
    ON tenant_errors(resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_errors_severity
    ON tenant_errors(severity, created_at DESC);

-- RLS: only super_admin can read/write tenant_errors
ALTER TABLE tenant_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_errors_super_admin" ON tenant_errors;
CREATE POLICY "tenant_errors_super_admin" ON tenant_errors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Service-role INSERT for storefront error logging (bypasses RLS)
-- No additional policy needed — service_role bypasses all RLS.
