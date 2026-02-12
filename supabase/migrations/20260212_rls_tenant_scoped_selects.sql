-- ============================================================================
-- Migration: Tenant-Scoped SELECT Policies (Remediation H-001 + H-002)
-- Date: 2026-02-12
-- Purpose: Replace permissive open-access SELECT policies with tenant-scoped ones.
--          Fix profiles_select_own to scope owner/admin to their tenant.
--
-- RATIONALE:
--   The storefront uses service_role (bypasses RLS entirely) for config reads.
--   These policies protect against direct Supabase API access by unauthorized users.
--   super_admin can read all tenants; owner/admin only their own tenant.
-- ============================================================================

-- ── config ────────────────────────────────────────────────────────

-- Drop all existing SELECT policies (both generic and tenant-named)
DROP POLICY IF EXISTS "config_select_tenant" ON config;
DROP POLICY IF EXISTS "config_select" ON config;

CREATE POLICY "config_select_tenant" ON config FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR profiles.tenant_id = config.tenant_id)
    )
);

-- ── feature_flags ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "feature_flags_select" ON feature_flags;
DROP POLICY IF EXISTS "feature_flags_select_tenant" ON feature_flags;

CREATE POLICY "feature_flags_select_tenant" ON feature_flags FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR profiles.tenant_id = feature_flags.tenant_id)
    )
);

-- ── plan_limits ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "plan_limits_select" ON plan_limits;
DROP POLICY IF EXISTS "plan_limits_select_tenant" ON plan_limits;

CREATE POLICY "plan_limits_select_tenant" ON plan_limits FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR profiles.tenant_id = plan_limits.tenant_id)
    )
);

-- ── whatsapp_templates ────────────────────────────────────────────

DROP POLICY IF EXISTS "whatsapp_templates_select" ON whatsapp_templates;
DROP POLICY IF EXISTS "whatsapp_templates_select_tenant" ON whatsapp_templates;

CREATE POLICY "whatsapp_templates_select_tenant" ON whatsapp_templates FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR profiles.tenant_id = whatsapp_templates.tenant_id)
    )
);

-- ── cms_pages ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "cms_pages_select" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_select_tenant" ON cms_pages;

CREATE POLICY "cms_pages_select_tenant" ON cms_pages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR profiles.tenant_id = cms_pages.tenant_id)
    )
);

-- ── carousel_slides ───────────────────────────────────────────────

DROP POLICY IF EXISTS "carousel_slides_select" ON carousel_slides;
DROP POLICY IF EXISTS "carousel_slides_select_tenant" ON carousel_slides;

CREATE POLICY "carousel_slides_select_tenant" ON carousel_slides FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR profiles.tenant_id = carousel_slides.tenant_id)
    )
);

-- ── analytics_events ──────────────────────────────────────────────
-- INSERT WITH CHECK (true) is KEPT intentionally:
--   Service-role webhook/storefront inserts bypass RLS anyway.
--   Anonymous insert must remain open for analytics ingestion.
--   No SELECT change needed — already tenant-scoped.

-- Drop and recreate the insert policy to document the rationale
DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_with_tenant" ON analytics_events;

CREATE POLICY "analytics_events_insert_open" ON analytics_events
    FOR INSERT WITH CHECK (true);
-- RATIONALE: analytics ingestion from service-role and edge functions.
-- The tenant_id column is set by the inserting code, not by the user.

-- ── profiles (H-002) ──────────────────────────────────────────────
-- Fix: owner/admin could read ALL profiles globally.
-- Now: owner/admin only see profiles in their own tenant.
-- super_admin retains global read (business requirement for SaaS management).

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (
    -- Users can always read their own profile
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
            -- super_admin: global read (SaaS management requirement)
            p.role = 'super_admin'
            -- owner/admin: only profiles in same tenant
            OR (p.role IN ('owner', 'admin') AND p.tenant_id = profiles.tenant_id)
        )
    )
);

-- ============================================================================
-- Done! All governance SELECT policies are now tenant-scoped.
-- Service-role clients (storefront getConfig(), SuperAdmin) bypass RLS entirely.
-- ============================================================================
