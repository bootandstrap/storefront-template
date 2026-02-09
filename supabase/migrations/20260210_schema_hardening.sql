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
