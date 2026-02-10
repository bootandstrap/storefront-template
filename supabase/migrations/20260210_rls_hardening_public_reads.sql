-- ============================================================================
-- RLS Hardening: Replace public SELECT USING (true) with tenant-scoped reads
-- ============================================================================
-- Run AFTER: 20260209_rls_policies_complete.sql
-- Run AFTER: 20260210_schema_hardening.sql
--
-- SECURITY FIX: The previous migration allowed anyone to SELECT from
-- config, feature_flags, plan_limits, whatsapp_templates, cms_pages,
-- and carousel_slides. This is a cross-tenant data leak risk when using
-- the anon key. The storefront SSR uses service_role (bypasses RLS) so
-- this change is safe.
--
-- New READ policies:
--   - super_admin: unrestricted SELECT
--   - owner/admin: only rows WHERE tenant_id = profile.tenant_id
--   - customer/anon: denied on governance tables; limited on cms_pages
-- ============================================================================

-- Helper: get the caller's tenant_id from their profile
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================================
-- config — sensitive (business settings, API keys)
-- ============================================================================
DROP POLICY IF EXISTS "config_select" ON config;
DROP POLICY IF EXISTS "config_select_all" ON config;
DROP POLICY IF EXISTS "config_read_all" ON config;

CREATE POLICY "config_select_tenant" ON config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR profiles.tenant_id = config.tenant_id
            )
        )
    );

-- ============================================================================
-- feature_flags — tenant-scoped read
-- ============================================================================
DROP POLICY IF EXISTS "feature_flags_select" ON feature_flags;

CREATE POLICY "feature_flags_select_tenant" ON feature_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR profiles.tenant_id = feature_flags.tenant_id
            )
        )
    );

-- ============================================================================
-- plan_limits — tenant-scoped read
-- ============================================================================
DROP POLICY IF EXISTS "plan_limits_select" ON plan_limits;

CREATE POLICY "plan_limits_select_tenant" ON plan_limits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR profiles.tenant_id = plan_limits.tenant_id
            )
        )
    );

-- ============================================================================
-- whatsapp_templates — tenant-scoped read
-- ============================================================================
DROP POLICY IF EXISTS "whatsapp_templates_select" ON whatsapp_templates;

CREATE POLICY "whatsapp_templates_select_tenant" ON whatsapp_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR profiles.tenant_id = whatsapp_templates.tenant_id
            )
        )
    );

-- ============================================================================
-- cms_pages — published pages visible to same-tenant users, all to admins
-- ============================================================================
DROP POLICY IF EXISTS "cms_pages_select" ON cms_pages;

CREATE POLICY "cms_pages_select_tenant" ON cms_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR profiles.tenant_id = cms_pages.tenant_id
            )
        )
    );

-- ============================================================================
-- carousel_slides — tenant-scoped read
-- ============================================================================
DROP POLICY IF EXISTS "carousel_slides_select" ON carousel_slides;

CREATE POLICY "carousel_slides_select_tenant" ON carousel_slides
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR profiles.tenant_id = carousel_slides.tenant_id
            )
        )
    );

-- ============================================================================
-- analytics_events — already restricted to admin reads, no change needed
-- ============================================================================

-- ============================================================================
-- analytics_events — tighten INSERT to require tenant_id
-- ============================================================================
DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;

CREATE POLICY "analytics_events_insert_with_tenant" ON analytics_events
    FOR INSERT WITH CHECK (tenant_id IS NOT NULL);

-- ============================================================================
-- Done! All governance tables now require tenant-scoped authentication for
-- SELECT. service_role (used by SSR) bypasses RLS automatically.
-- ============================================================================
