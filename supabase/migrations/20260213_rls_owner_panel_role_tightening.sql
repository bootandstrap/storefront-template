-- ============================================================================
-- RLS Tightening: Owner Panel Governance Reads (owner + super_admin only)
-- Date: 2026-02-13
-- Purpose: Prevent customer/admin tenant users from reading owner-governance
--          tables via direct Supabase API calls.
--
-- Notes:
--   - Storefront SSR uses service_role and bypasses RLS safely.
--   - This migration hardens client-facing PostgREST exposure.
-- ============================================================================

-- ── config ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "config_select_tenant" ON config;
CREATE POLICY "config_select_owner_super_admin" ON config FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'super_admin'
            OR (profiles.role = 'owner' AND profiles.tenant_id = config.tenant_id)
        )
    )
);

-- ── feature_flags ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feature_flags_select_tenant" ON feature_flags;
CREATE POLICY "feature_flags_select_owner_super_admin" ON feature_flags FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'super_admin'
            OR (profiles.role = 'owner' AND profiles.tenant_id = feature_flags.tenant_id)
        )
    )
);

-- ── plan_limits ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "plan_limits_select_tenant" ON plan_limits;
CREATE POLICY "plan_limits_select_owner_super_admin" ON plan_limits FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'super_admin'
            OR (profiles.role = 'owner' AND profiles.tenant_id = plan_limits.tenant_id)
        )
    )
);

-- ── whatsapp_templates ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "whatsapp_templates_select_tenant" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_select_owner_super_admin" ON whatsapp_templates FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'super_admin'
            OR (profiles.role = 'owner' AND profiles.tenant_id = whatsapp_templates.tenant_id)
        )
    )
);

-- ── cms_pages ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cms_pages_select_tenant" ON cms_pages;
CREATE POLICY "cms_pages_select_owner_super_admin" ON cms_pages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'super_admin'
            OR (profiles.role = 'owner' AND profiles.tenant_id = cms_pages.tenant_id)
        )
    )
);

-- ── carousel_slides ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "carousel_slides_select_tenant" ON carousel_slides;
CREATE POLICY "carousel_slides_select_owner_super_admin" ON carousel_slides FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'super_admin'
            OR (profiles.role = 'owner' AND profiles.tenant_id = carousel_slides.tenant_id)
        )
    )
);

-- ============================================================================
-- Done.
-- ============================================================================

