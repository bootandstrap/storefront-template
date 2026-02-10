-- =============================================================================
-- Additive migration: backfill tenant_id on tables created after 20260209
-- Applied: 10 Feb 2026
-- =============================================================================
-- NOTE: The canonical tenants table is created in 20260209_multi_tenant_foundation.sql.
-- This migration only adds tenant_id columns and backfills for tables that were
-- created AFTER the foundation migration (stripe_webhook_events, audit_log).
-- =============================================================================

-- Ensure plan_tier column exists (idempotent in case foundation ran without it)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_tier TEXT
    NOT NULL DEFAULT 'starter'
    CHECK (plan_tier IN ('starter', 'pro', 'enterprise'));

-- ---------------------------------------------------------------------------
-- Backfill tenant_id for tables created in later migrations
-- ---------------------------------------------------------------------------

UPDATE stripe_webhook_events SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
WHERE tenant_id IS NULL;

UPDATE audit_log SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
WHERE tenant_id IS NULL;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
