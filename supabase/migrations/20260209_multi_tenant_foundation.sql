-- ============================================================================
-- Phase 8A: Multi-Tenant Foundation
-- ============================================================================
-- Creates tenants table, adds tenant_id to governance tables, new config
-- columns, new feature flags, and new plan limits.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tenants table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'suspended', 'trial')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Only super_admin can see/manage tenants
CREATE POLICY "super_admin_full_access" ON tenants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- ---------------------------------------------------------------------------
-- 2. Add tenant_id FK to governance tables
-- ---------------------------------------------------------------------------

-- config
ALTER TABLE config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- feature_flags
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- plan_limits
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- carousel_slides
ALTER TABLE carousel_slides ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- whatsapp_templates
ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- cms_pages
ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- analytics_events
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 3. New config columns
-- ---------------------------------------------------------------------------

ALTER TABLE config ADD COLUMN IF NOT EXISTS store_email TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS store_phone TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS store_address TEXT;

-- Social links
ALTER TABLE config ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS social_tiktok TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS social_twitter TEXT;

-- Announcement bar
ALTER TABLE config ADD COLUMN IF NOT EXISTS announcement_bar_text TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS announcement_bar_enabled BOOLEAN NOT NULL DEFAULT false;

-- Business settings
ALTER TABLE config ADD COLUMN IF NOT EXISTS min_order_amount INTEGER DEFAULT 0;
ALTER TABLE config ADD COLUMN IF NOT EXISTS max_delivery_radius_km INTEGER;
ALTER TABLE config ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE config ADD COLUMN IF NOT EXISTS delivery_info_text TEXT;

-- Bank details (may already exist partially)
ALTER TABLE config ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS bank_account_type TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS bank_id_number TEXT;

-- Tracking IDs
ALTER TABLE config ADD COLUMN IF NOT EXISTS google_analytics_id TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;

-- Custom CSS
ALTER TABLE config ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- ---------------------------------------------------------------------------
-- 4. New feature flags
-- ---------------------------------------------------------------------------

ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_maintenance_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_order_notes BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_product_search BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_customer_accounts BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_order_tracking BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_social_links BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_owner_panel BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS enable_address_management BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 5. New plan limit columns
-- ---------------------------------------------------------------------------

ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS max_whatsapp_templates INTEGER NOT NULL DEFAULT 5;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS max_file_upload_mb INTEGER NOT NULL DEFAULT 5;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS max_email_sends_month INTEGER NOT NULL DEFAULT 500;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS max_custom_domains INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- 6. Seed initial tenant + backfill
-- ---------------------------------------------------------------------------

-- Create Campifrut tenant (idempotent)
INSERT INTO tenants (slug, name, domain, status)
VALUES ('campifrut', 'Campifrut', 'campifrut.com', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Backfill tenant_id on existing governance rows
UPDATE config SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;
UPDATE feature_flags SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;
UPDATE plan_limits SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;
UPDATE carousel_slides SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;
UPDATE whatsapp_templates SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;
UPDATE cms_pages SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;
UPDATE analytics_events SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;
UPDATE profiles SET tenant_id = (SELECT id FROM tenants WHERE slug = 'campifrut')
    WHERE tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 7. Create indexes for tenant_id (performance)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_config_tenant ON config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_limits_tenant ON plan_limits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carousel_slides_tenant ON carousel_slides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_tenant ON cms_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);

-- ---------------------------------------------------------------------------
-- 8. Update RLS policies for tenant isolation
-- ---------------------------------------------------------------------------

-- Config: anyone can read their tenant's config (storefront needs it)
DROP POLICY IF EXISTS "config_read_all" ON config;
CREATE POLICY "config_read_all" ON config
    FOR SELECT USING (true);

-- Feature flags: anyone can read their tenant's flags
DROP POLICY IF EXISTS "feature_flags_read_all" ON feature_flags;
CREATE POLICY "feature_flags_read_all" ON feature_flags
    FOR SELECT USING (true);

-- Plan limits: anyone can read their tenant's limits
DROP POLICY IF EXISTS "plan_limits_read_all" ON plan_limits;
CREATE POLICY "plan_limits_read_all" ON plan_limits
    FOR SELECT USING (true);

-- Governance write: only super_admin or owner of that tenant
DROP POLICY IF EXISTS "config_write_admin" ON config;
CREATE POLICY "config_write_admin" ON config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'super_admin' OR (profiles.role = 'owner' AND profiles.tenant_id = config.tenant_id))
        )
    );

-- Done!
