-- ============================================================================
-- 001_schema_core.sql
-- Squashed: 2026-04-04
-- Contains: Tables, columns, constraints, types
-- Sources: 21 migration files
-- ============================================================================

-- TABLE OF CONTENTS:
-- 1. 20260209_constraints_uniques_per_tenant.sql
-- 2. 20260209_multi_tenant_foundation.sql
-- 3. 20260210_audit_log.sql
-- 4. 20260210_create_tenants_table.sql
-- 5. 20260210_schema_hardening.sql
-- 6. 20260210_stripe_webhook_events.sql
-- 7. 20260212_tenant_errors_table.sql
-- 8. 20260213_enable_whatsapp_contact_flag.sql
-- 9. 20260213_tenant_medusa_scope.sql
-- 10. 20260215_chat_tables.sql
-- 11. 20260220_newsletter_subscribers.sql
-- 12. 20260220_product_wishlists.sql
-- 13. 20260221_rename_trial_to_maintenance_free.sql
-- 14. 20260221_stock_mode_shipping_tax.sql
-- 15. 20260221_tenant_stripe_columns.sql
-- 16. 20260301_add_onboarding_completed_to_config.sql
-- 17. 20260319_gamification_fields.sql
-- 18. 20260326_module_tiers_unique_constraint.sql
-- 19. 20260403_add_language_preferences_to_config.sql
-- 20. 20260404_add_missing_feature_flags.sql
-- 21. 20260404_create_return_requests.sql
--
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260209_constraints_uniques_per_tenant.sql                   │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Unique Constraints: One row per tenant for governance tables
-- ============================================================================
-- Prevents orphaned duplicate rows when provisioning fails mid-way.
-- ============================================================================

-- Only one config row per tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_config_tenant_id'
    ) THEN
        ALTER TABLE config ADD CONSTRAINT uq_config_tenant_id UNIQUE (tenant_id);
    END IF;
END $$;

-- Only one feature_flags row per tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_feature_flags_tenant_id'
    ) THEN
        ALTER TABLE feature_flags ADD CONSTRAINT uq_feature_flags_tenant_id UNIQUE (tenant_id);
    END IF;
END $$;

-- Only one plan_limits row per tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_plan_limits_tenant_id'
    ) THEN
        ALTER TABLE plan_limits ADD CONSTRAINT uq_plan_limits_tenant_id UNIQUE (tenant_id);
    END IF;
END $$;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260209_multi_tenant_foundation.sql                          │
-- └──────────────────────────────────────────────────────────────────────────┘

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
    plan_tier TEXT NOT NULL DEFAULT 'starter'
        CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Only super_admin can see/manage tenants (idempotent)
DROP POLICY IF EXISTS "super_admin_full_access" ON tenants;
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
INSERT INTO tenants (slug, name, domain, status, plan_tier)
VALUES ('campifrut', 'Campifrut', 'campifrut.com', 'active', 'starter')
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260210_audit_log.sql                                        │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- audit_log — Records SuperAdmin mutations for compliance and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    tenant_id UUID,
    admin_user_id UUID NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
-- Index for per-tenant audit trail
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);

-- RLS: deny all public access (service-role only)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE audit_log IS 
    'SuperAdmin audit trail. Service-role access only.';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260210_create_tenants_table.sql                             │
-- └──────────────────────────────────────────────────────────────────────────┘

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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260210_schema_hardening.sql                                 │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Schema Hardening: tenant_id NOT NULL + Multi-Tenant Unique Constraints
-- ============================================================================
-- Run AFTER: 20260209_multi_tenant_foundation.sql (which adds columns + backfills)
-- Run AFTER: 20260209_constraints_uniques_per_tenant.sql (which adds basic uniques)
--
-- This migration:
--   1. Enforces tenant_id NOT NULL on all governance tables (after backfill)
--   2. Adds tenant-scoped unique slug on cms_pages
--   3. Ensures only one default WhatsApp template per tenant
--   4. Adds missing admin role to profiles role check
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. tenant_id NOT NULL (governance tables)
-- ---------------------------------------------------------------------------
-- After backfill in foundation migration, enforce that no new rows can have
-- NULL tenant_id. This is defense-in-depth alongside application-level scoping.

ALTER TABLE config ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE feature_flags ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE plan_limits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE carousel_slides ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE whatsapp_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cms_pages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE analytics_events ALTER COLUMN tenant_id SET NOT NULL;
-- profiles.tenant_id stays NULLABLE (super_admin has no tenant)

-- ---------------------------------------------------------------------------
-- 2. Tenant-scoped unique slug for CMS pages
-- ---------------------------------------------------------------------------
-- Allows different tenants to have the same page slug (/about, /privacy, etc.)
-- but prevents duplicate slugs within a single tenant.

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_cms_pages_tenant_slug'
    ) THEN
        ALTER TABLE cms_pages ADD CONSTRAINT uq_cms_pages_tenant_slug
            UNIQUE (tenant_id, slug);
    END IF;
END $$;

-- Drop global slug unique if it exists (it would conflict with tenant-scoped)
ALTER TABLE cms_pages DROP CONSTRAINT IF EXISTS cms_pages_slug_key;

-- ---------------------------------------------------------------------------
-- 3. Only one default WhatsApp template per tenant
-- ---------------------------------------------------------------------------
-- Partial unique index: at most one row per tenant with is_default = true.
-- This prevents data corruption when toggling defaults.

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_templates_default_per_tenant
    ON whatsapp_templates (tenant_id) WHERE (is_default = true);

-- ---------------------------------------------------------------------------
-- 4. Profiles: add 'admin' to role check if not present
-- ---------------------------------------------------------------------------
-- Ensure profiles table allows 'admin' role alongside owner, customer, super_admin.

DO $$ BEGIN
    -- Drop and recreate the check constraint to include admin
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('customer', 'owner', 'admin', 'super_admin'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'profiles_role_check constraint update skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 5. RLS: profiles table policies
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('super_admin', 'owner', 'admin')
        )
    );

-- Users can update their own profile (name, avatar, etc.)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Insert: handled by auth trigger (auto-creates on signup)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- Done! Schema hardened with NOT NULL, tenant-scoped uniques, and profiles RLS.
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260210_stripe_webhook_events.sql                            │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- stripe_webhook_events — Idempotency store for Stripe webhook processing
-- ============================================================================
-- Prevents duplicate processing of webhook events on retries.
-- Service-role access only (no public RLS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    tenant_id UUID,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast dedup lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id 
    ON stripe_webhook_events(event_id);

-- RLS: deny all public access (service-role only)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = no access via anon/authenticated keys

COMMENT ON TABLE stripe_webhook_events IS 
    'Idempotency store for Stripe webhook events. Service-role access only.';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260212_tenant_errors_table.sql                              │
-- └──────────────────────────────────────────────────────────────────────────┘

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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260213_enable_whatsapp_contact_flag.sql                     │
-- └──────────────────────────────────────────────────────────────────────────┘

-- Add enable_whatsapp_contact flag to separate WhatsApp as a CONTACT channel
-- from WhatsApp as a CHECKOUT method (enable_whatsapp_checkout).
--
-- enable_whatsapp_contact: floating button, header nav link, footer number, HeroSection CTA
-- enable_whatsapp_checkout: payment method in checkout modal, "Order via WhatsApp" in cart

ALTER TABLE feature_flags
ADD COLUMN IF NOT EXISTS enable_whatsapp_contact BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN feature_flags.enable_whatsapp_contact IS
  'Shows WhatsApp floating button, header/footer contact links, and HeroSection CTA. Independent from enable_whatsapp_checkout (checkout payment method).';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260213_tenant_medusa_scope.sql                              │
-- └──────────────────────────────────────────────────────────────────────────┘

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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260215_chat_tables.sql                                      │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Canonical migration: Chat tables
-- Previously existed only as ad-hoc schema (created by code at runtime or
-- manually applied). This migration provides a canonical, reviewable source.
--
-- Tables: chat_settings, chat_usage, chat_logs, chat_daily_stats, chat_tier_config
-- ============================================================================

-- 1. chat_settings — per-tenant chatbot configuration
CREATE TABLE IF NOT EXISTS public.chat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    enabled BOOLEAN NOT NULL DEFAULT true,
    model TEXT NOT NULL DEFAULT 'gpt-4.1-nano',
    system_prompt TEXT,
    welcome_message TEXT,
    max_response_tokens INT NOT NULL DEFAULT 500,
    temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id)
);

-- 2. chat_usage — per-user monthly message counters
CREATE TABLE IF NOT EXISTS public.chat_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    month TEXT NOT NULL,           -- YYYY-MM format
    message_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, month)
);

-- 3. chat_logs — detailed message log for analytics/audit
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    tokens_used INT,
    locale TEXT DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. chat_daily_stats — aggregated daily metrics
CREATE TABLE IF NOT EXISTS public.chat_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    date DATE NOT NULL,
    total_messages INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    unique_users INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, date)
);

-- 5. chat_tier_config — per-tenant tier overrides
CREATE TABLE IF NOT EXISTS public.chat_tier_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    tier TEXT NOT NULL CHECK (tier IN ('visitor', 'customer', 'premium')),
    message_limit INT,
    max_docs INT,
    quick_actions TEXT[] DEFAULT '{}',
    suggested_prompts INT,
    history_mode TEXT CHECK (history_mode IN ('session', 'local', 'cloud')),
    window_size TEXT CHECK (window_size IN ('compact', 'standard', 'full')),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, tier)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_settings_tenant ON public.chat_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_tenant_user ON public.chat_usage(tenant_id, user_id, month);
CREATE INDEX IF NOT EXISTS idx_chat_logs_tenant ON public.chat_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON public.chat_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_daily_stats_tenant ON public.chat_daily_stats(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_chat_tier_config_tenant ON public.chat_tier_config(tenant_id);

-- RLS
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_tier_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin client only)
-- These are accessed via createAdminClient() which uses service_role key
DROP POLICY IF EXISTS "chat_settings_service" ON public.chat_settings;
CREATE POLICY "chat_settings_service" ON public.chat_settings
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_usage_service" ON public.chat_usage;
CREATE POLICY "chat_usage_service" ON public.chat_usage
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_logs_service" ON public.chat_logs;
CREATE POLICY "chat_logs_service" ON public.chat_logs
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_daily_stats_service" ON public.chat_daily_stats;
CREATE POLICY "chat_daily_stats_service" ON public.chat_daily_stats
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_tier_config_service" ON public.chat_tier_config;
CREATE POLICY "chat_tier_config_service" ON public.chat_tier_config
    FOR ALL USING (true) WITH CHECK (true);

-- RPC: increment_chat_usage (upsert pattern, called from usage-logger.ts)
CREATE OR REPLACE FUNCTION increment_chat_usage(
    p_tenant_id UUID,
    p_user_id UUID,
    p_month TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO public.chat_usage (tenant_id, user_id, month, message_count)
    VALUES (p_tenant_id, p_user_id, p_month, 1)
    ON CONFLICT (tenant_id, user_id, month)
    DO UPDATE SET
        message_count = chat_usage.message_count + 1,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260220_newsletter_subscribers.sql                           │
-- └──────────────────────────────────────────────────────────────────────────┘

-- Newsletter subscribers table for footer signup
-- Canonical migration (moved from apps/storefront/supabase/migrations/)
-- Gated by enable_newsletter feature flag

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'footer'
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Admin-only read access
DROP POLICY IF EXISTS "Admins can read newsletter subscribers" ON newsletter_subscribers;
CREATE POLICY "Admins can read newsletter subscribers" ON newsletter_subscribers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
));

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260220_product_wishlists.sql                                │
-- └──────────────────────────────────────────────────────────────────────────┘

-- Product Wishlists — Medusa product favorites for storefront customers
-- Canonical migration (moved from apps/storefront/supabase/migrations/)
-- Separate from module_wishlists (which tracks SaaS module interest)

CREATE TABLE IF NOT EXISTS product_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,          -- Medusa product ID (prod_xxx)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)        -- one entry per user per product
);

ALTER TABLE product_wishlists ENABLE ROW LEVEL SECURITY;

-- Users can manage their own wishlist
DROP POLICY IF EXISTS "Users can read own wishlist" ON product_wishlists;
CREATE POLICY "Users can read own wishlist" ON product_wishlists FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own wishlist" ON product_wishlists;
CREATE POLICY "Users can add to own wishlist" ON product_wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from own wishlist" ON product_wishlists;
CREATE POLICY "Users can remove from own wishlist" ON product_wishlists FOR DELETE USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_product_wishlists_user ON product_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_product_wishlists_product ON product_wishlists(product_id);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260221_rename_trial_to_maintenance_free.sql                 │
-- └──────────────────────────────────────────────────────────────────────────┘

-- Rename tenant status 'trial' → 'maintenance_free'
-- BootandStrap business model: first month maintenance is free, not a product trial.

-- 1. Update existing rows
UPDATE tenants
SET status = 'maintenance_free'
WHERE status = 'trial';

-- 2. Drop old CHECK constraint and add new one
-- Note: constraint name may vary; use DO block for safety
DO $$
BEGIN
    -- Drop any CHECK constraint on status column
    PERFORM 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tenants' AND column_name = 'status';

    -- Re-create with new valid values
    ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
    ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
        CHECK (status IN ('active', 'paused', 'suspended', 'maintenance_free'));
END
$$;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260221_stock_mode_shipping_tax.sql                          │
-- └──────────────────────────────────────────────────────────────────────────┘

-- =============================================================================
-- Migration: Inventory stock mode + shipping/tax config fields
-- Covers Phase 1.7 (Inventory) and 1.9 (Shipping & Tax)
-- =============================================================================

-- 1.7 — Inventory & Stock Mode
ALTER TABLE config
ADD COLUMN IF NOT EXISTS stock_mode TEXT DEFAULT 'always_in_stock'
    CHECK (stock_mode IN ('always_in_stock', 'managed')),
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- 1.9 — Shipping & Tax display
ALTER TABLE config
ADD COLUMN IF NOT EXISTS free_shipping_threshold INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_display_mode TEXT DEFAULT 'tax_included'
    CHECK (tax_display_mode IN ('tax_included', 'tax_excluded'));

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260221_tenant_stripe_columns.sql                            │
-- └──────────────────────────────────────────────────────────────────────────┘

-- Add Stripe billing columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for reverse lookup from webhook events
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id
ON tenants (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id
ON tenants (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260301_add_onboarding_completed_to_config.sql               │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Migration: Add onboarding_completed flag to config
-- Date: 2026-03-01
-- Purpose: Persist first-run owner panel onboarding completion state.
-- ============================================================================

ALTER TABLE config
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260319_gamification_fields.sql                              │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Migration: Gamification columns for config table
-- Date: 2026-03-19
-- Purpose: Add typed columns for achievements, smart tips, checklist,
--          tour completion, and language preferences.
--
-- These fields power the Owner Panel gamification layer:
--   - achievements_unlocked: JSONB array of achievement IDs earned by owner
--   - dismissed_tips: JSONB array of smart tip IDs dismissed by owner
--   - checklist_skipped: Whether owner skipped the setup checklist
--   - tour_completed: Whether guided panel tour has been completed
--   - panel_language: Owner's preferred language for the panel UI
--   - storefront_language: Owner's preferred language for the storefront
--
-- Prior to this migration, actions.ts wrote to these columns via `as any`
-- casts with no schema or migration backing — this formalizes them.
-- ============================================================================

ALTER TABLE config
  ADD COLUMN IF NOT EXISTS achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dismissed_tips JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checklist_skipped BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS panel_language TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storefront_language TEXT DEFAULT NULL;

-- Index for efficient lookups (optional — config table is small per-tenant)
COMMENT ON COLUMN config.achievements_unlocked IS 'JSONB array of achievement IDs earned by the tenant owner';
COMMENT ON COLUMN config.dismissed_tips IS 'JSONB array of smart tip IDs dismissed by the tenant owner';
COMMENT ON COLUMN config.checklist_skipped IS 'Whether the owner skipped the setup checklist (DB-persisted, replaces localStorage)';
COMMENT ON COLUMN config.tour_completed IS 'Whether the guided panel tour has been completed at least once';
COMMENT ON COLUMN config.panel_language IS 'Owner preferred language for the panel UI (null = inherit from config.language)';
COMMENT ON COLUMN config.storefront_language IS 'Owner preferred language for the storefront (null = inherit from config.language)';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260326_module_tiers_unique_constraint.sql                   │
-- └──────────────────────────────────────────────────────────────────────────┘

-- =============================================================================
-- 20260326_module_tiers_unique_constraint.sql
-- Phase 2: DB Schema Fixes for Governance Unification
-- Safe to run multiple times (all operations are idempotent)
-- =============================================================================

-- 2.1: Populate key column from tier_name (lowercase, spaces→underscores)
UPDATE module_tiers
SET key = lower(regexp_replace(tier_name, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE key IS NULL;

-- 2.2: DELETE DUPLICATES before adding UNIQUE constraint
-- Keeps the row with the highest sort_order (or lowest id as tiebreaker)
DELETE FROM module_tiers
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY module_id, tier_name
                   ORDER BY sort_order DESC, created_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM module_tiers
    ) ranked
    WHERE rn > 1
);

-- 2.3: Add UNIQUE constraint on (module_id, tier_name) for idempotent seeding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_tiers_module_name'
    ) THEN
        ALTER TABLE module_tiers
        ADD CONSTRAINT uq_tiers_module_name UNIQUE (module_id, tier_name);
    END IF;
END $$;

-- 2.4: Delete legacy capacidad tiers that no longer exist in the contract
DELETE FROM module_tiers
WHERE module_id IN (SELECT id FROM modules WHERE key = 'capacidad')
  AND tier_name NOT IN ('Basic', 'Pro', 'Enterprise');

-- Verify
SELECT m.key AS module, mt.tier_name, mt.key AS tier_key, mt.price
FROM module_tiers mt
JOIN modules m ON m.id = mt.module_id
ORDER BY m.key, mt.sort_order;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260403_add_language_preferences_to_config.sql               │
-- └──────────────────────────────────────────────────────────────────────────┘

-- 20260403_add_language_preferences_to_config.sql
-- Multi-language stabilization: Add independent panel and storefront language preferences

-- 1. Add panel_language column if not exists
ALTER TABLE public.config 
ADD COLUMN IF NOT EXISTS panel_language text DEFAULT 'es';

-- 2. Add storefront_language column if not exists
ALTER TABLE public.config 
ADD COLUMN IF NOT EXISTS storefront_language text DEFAULT 'es';

-- 3. Backfill panel_language and storefront_language from existing 'language' column
UPDATE public.config
SET 
  panel_language = COALESCE(language, 'es'),
  storefront_language = COALESCE(language, 'es')
WHERE panel_language = 'es' AND storefront_language = 'es';

-- 4. Ensure existing 'active_languages' includes the current language for all tenants
-- This is a safety measure to prevent empty active lists
UPDATE public.config
SET active_languages = ARRAY[language]
WHERE active_languages IS NULL OR array_length(active_languages, 1) IS NULL;

-- 5. Comments for documentation
COMMENT ON COLUMN public.config.panel_language IS 'Preferred language for the Owner Panel UI';
COMMENT ON COLUMN public.config.storefront_language IS 'Primary language for the Storefront';

-- 6. Fix explicit UPDATE policy for config table
-- The original FOR ALL policy sometimes fails to apply correctly for UPDATE on some Postgres versions
-- without an explicit WITH CHECK clause.
DROP POLICY IF EXISTS "config_update_owner_super" ON public.config;
CREATE POLICY "config_update_owner_super" ON public.config
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR (profiles.role = 'owner' AND profiles.tenant_id = config.tenant_id))
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR (profiles.role = 'owner' AND profiles.tenant_id = config.tenant_id))
    )
);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260404_add_missing_feature_flags.sql                        │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Add Missing Feature Flags for SOTA Governance
-- ============================================================================

ALTER TABLE feature_flags 
    ADD COLUMN IF NOT EXISTS enable_auth_advanced BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_automations BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_sales_channels BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_traffic_expansion BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_traffic_analytics BOOLEAN NOT NULL DEFAULT false,
    -- Phase 5: Granular module flags (2026-04-04)
    ADD COLUMN IF NOT EXISTS enable_apple_oauth BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_facebook_oauth BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_2fa BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_magic_link BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_crm_contacts BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_crm_interactions BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_crm_segments BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_transactional_emails BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_review_request_emails BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_email_segmentation BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_social_sharing BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_seo_tools BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_custom_webhooks BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_reservation_checkout BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_kiosk_analytics BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_kiosk_idle_timer BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_kiosk_remote_management BOOLEAN NOT NULL DEFAULT false;

-- Add new limit columns for granular module tiers
ALTER TABLE plan_limits
    ADD COLUMN IF NOT EXISTS max_automations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_pos_kiosk_devices INTEGER NOT NULL DEFAULT 0;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260404_create_return_requests.sql                           │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- SOTA Returns Pre-Validation Layer
-- ============================================================================
-- Serves as an intermediary for customer return requests before they are
-- officially committed to Medusa v2 (thus avoiding Medusa side-effects until approved).
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL, -- Medusa Order ID (Format: ord_...)
    customer_id TEXT, -- Medusa Customer ID
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    reason TEXT,
    customer_note TEXT,
    internal_note TEXT,
    items JSONB NOT NULL, -- Array of { item_id, quantity, reason }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

-- Tenants can manage their own return requests
DROP POLICY IF EXISTS "return_requests_tenant_isolation" ON return_requests;
CREATE POLICY "return_requests_tenant_isolation" ON return_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'super_admin' OR (profiles.role = 'owner' AND profiles.tenant_id = return_requests.tenant_id))
        )
    );

-- Customers can read their own if needed (requires matching medusa_customer_id in a profile or similar, but for now we enforce tenant_isolation or service role)

CREATE INDEX IF NOT EXISTS idx_return_requests_tenant ON return_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);

