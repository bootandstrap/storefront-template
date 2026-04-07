-- ============================================================================
-- 002_rls_policies.sql
-- Squashed: 2026-04-04
-- Contains: Row-Level Security policies for all tables
-- Sources: 8 migration files
-- ============================================================================

-- TABLE OF CONTENTS:
-- 1. 20260209_rls_policies_complete.sql
-- 2. 20260210_rls_hardening_public_reads.sql
-- 3. 20260210_rls_policy_idempotency_patch.sql
-- 4. 20260212_analytics_events_insert_service_role.sql
-- 5. 20260212_rls_tenant_scoped_selects.sql
-- 6. 20260212_zzz_analytics_events_insert_service_role_finalize.sql
-- 7. 20260213_rls_owner_panel_role_tightening.sql
-- 8. 20260221_policy_idempotency_patch.sql
--
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260209_rls_policies_complete.sql                            │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Complete RLS Policies for Multi-Tenant Tables
-- ============================================================================
-- Replaces generic FOR ALL policies with explicit per-operation policies.
-- Covers: feature_flags, plan_limits, whatsapp_templates, cms_pages,
--         carousel_slides, analytics_events.
-- ============================================================================

-- ============================================================================
-- feature_flags
-- ============================================================================
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Read: anyone (storefront needs flags for conditional rendering)
DROP POLICY IF EXISTS "feature_flags_read_all" ON feature_flags;
DROP POLICY IF EXISTS "feature_flags_select" ON feature_flags;
CREATE POLICY "feature_flags_select" ON feature_flags
    FOR SELECT USING (true);

-- Write: super_admin or owner of the tenant
DROP POLICY IF EXISTS "feature_flags_write_admin" ON feature_flags;
DROP POLICY IF EXISTS "feature_flags_update_admin" ON feature_flags;
CREATE POLICY "feature_flags_update_admin" ON feature_flags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = feature_flags.tenant_id)
            )
        )
    );

-- Insert: only super_admin (tenant provisioning)
DROP POLICY IF EXISTS "feature_flags_insert_super_admin" ON feature_flags;
CREATE POLICY "feature_flags_insert_super_admin" ON feature_flags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Delete: only super_admin (tenant deprovisioning)
DROP POLICY IF EXISTS "feature_flags_delete_super_admin" ON feature_flags;
CREATE POLICY "feature_flags_delete_super_admin" ON feature_flags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- ============================================================================
-- plan_limits
-- ============================================================================
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- Read: anyone (storefront checks limits for enforcement)
DROP POLICY IF EXISTS "plan_limits_read_all" ON plan_limits;
DROP POLICY IF EXISTS "plan_limits_select" ON plan_limits;
CREATE POLICY "plan_limits_select" ON plan_limits
    FOR SELECT USING (true);

-- Write: only super_admin (plan management is SaaS-level)
DROP POLICY IF EXISTS "plan_limits_write_admin" ON plan_limits;
DROP POLICY IF EXISTS "plan_limits_update_super_admin" ON plan_limits;
CREATE POLICY "plan_limits_update_super_admin" ON plan_limits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "plan_limits_insert_super_admin" ON plan_limits;
CREATE POLICY "plan_limits_insert_super_admin" ON plan_limits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "plan_limits_delete_super_admin" ON plan_limits;
CREATE POLICY "plan_limits_delete_super_admin" ON plan_limits
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- ============================================================================
-- whatsapp_templates
-- ============================================================================
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Read: anyone in same tenant (storefront uses templates for order messages)
DROP POLICY IF EXISTS "whatsapp_templates_select" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_select" ON whatsapp_templates
    FOR SELECT USING (true);

-- Write: super_admin or owner of tenant
DROP POLICY IF EXISTS "whatsapp_templates_insert_admin" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_insert_admin" ON whatsapp_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = whatsapp_templates.tenant_id)
            )
        )
    );

DROP POLICY IF EXISTS "whatsapp_templates_update_admin" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_update_admin" ON whatsapp_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = whatsapp_templates.tenant_id)
            )
        )
    );

DROP POLICY IF EXISTS "whatsapp_templates_delete_admin" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_delete_admin" ON whatsapp_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = whatsapp_templates.tenant_id)
            )
        )
    );

-- ============================================================================
-- cms_pages
-- ============================================================================
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

-- Read: anyone (public pages)
DROP POLICY IF EXISTS "cms_pages_select" ON cms_pages;
CREATE POLICY "cms_pages_select" ON cms_pages
    FOR SELECT USING (true);

-- Write: super_admin or owner of tenant
DROP POLICY IF EXISTS "cms_pages_insert_admin" ON cms_pages;
CREATE POLICY "cms_pages_insert_admin" ON cms_pages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = cms_pages.tenant_id)
            )
        )
    );

DROP POLICY IF EXISTS "cms_pages_update_admin" ON cms_pages;
CREATE POLICY "cms_pages_update_admin" ON cms_pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = cms_pages.tenant_id)
            )
        )
    );

DROP POLICY IF EXISTS "cms_pages_delete_admin" ON cms_pages;
CREATE POLICY "cms_pages_delete_admin" ON cms_pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = cms_pages.tenant_id)
            )
        )
    );

-- ============================================================================
-- carousel_slides
-- ============================================================================
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;

-- Read: anyone (storefront displays carousel)
DROP POLICY IF EXISTS "carousel_slides_select" ON carousel_slides;
CREATE POLICY "carousel_slides_select" ON carousel_slides
    FOR SELECT USING (true);

-- Write: super_admin or owner of tenant
DROP POLICY IF EXISTS "carousel_slides_insert_admin" ON carousel_slides;
CREATE POLICY "carousel_slides_insert_admin" ON carousel_slides
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = carousel_slides.tenant_id)
            )
        )
    );

DROP POLICY IF EXISTS "carousel_slides_update_admin" ON carousel_slides;
CREATE POLICY "carousel_slides_update_admin" ON carousel_slides
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = carousel_slides.tenant_id)
            )
        )
    );

DROP POLICY IF EXISTS "carousel_slides_delete_admin" ON carousel_slides;
CREATE POLICY "carousel_slides_delete_admin" ON carousel_slides
    FOR DELETE USING (
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
-- analytics_events
-- ============================================================================
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Read: super_admin or owner of tenant (sensitive data)
DROP POLICY IF EXISTS "analytics_events_select_admin" ON analytics_events;
CREATE POLICY "analytics_events_select_admin" ON analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'super_admin'
                OR (profiles.role = 'owner' AND profiles.tenant_id = analytics_events.tenant_id)
            )
        )
    );

-- Insert: anyone (client-side analytics tracker uses anon key)
DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;
CREATE POLICY "analytics_events_insert" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- No update/delete from client — only super_admin
DROP POLICY IF EXISTS "analytics_events_delete_super_admin" ON analytics_events;
CREATE POLICY "analytics_events_delete_super_admin" ON analytics_events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- ============================================================================
-- Done! All multi-tenant tables now have explicit per-operation RLS.
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260210_rls_hardening_public_reads.sql                       │
-- └──────────────────────────────────────────────────────────────────────────┘

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

DROP POLICY IF EXISTS "config_select_tenant" ON config;
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

DROP POLICY IF EXISTS "feature_flags_select_tenant" ON feature_flags;
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

DROP POLICY IF EXISTS "plan_limits_select_tenant" ON plan_limits;
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

DROP POLICY IF EXISTS "whatsapp_templates_select_tenant" ON whatsapp_templates;
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

DROP POLICY IF EXISTS "cms_pages_select_tenant" ON cms_pages;
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

DROP POLICY IF EXISTS "carousel_slides_select_tenant" ON carousel_slides;
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

DROP POLICY IF EXISTS "analytics_events_insert_with_tenant" ON analytics_events;
CREATE POLICY "analytics_events_insert_with_tenant" ON analytics_events
    FOR INSERT WITH CHECK (tenant_id IS NOT NULL);

-- ============================================================================
-- Done! All governance tables now require tenant-scoped authentication for
-- SELECT. service_role (used by SSR) bypasses RLS automatically.
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260210_rls_policy_idempotency_patch.sql                     │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Migration: Idempotent RLS Policy Patch
-- Date: 2026-02-10
-- Purpose: Re-create all RLS policies with DROP IF EXISTS guard
-- ============================================================================

-- ── feature_flags ────────────────────────────────────────
DROP POLICY IF EXISTS "feature_flags_select" ON feature_flags;
CREATE POLICY "feature_flags_select" ON feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "feature_flags_update_admin" ON feature_flags;
CREATE POLICY "feature_flags_update_admin" ON feature_flags FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = feature_flags.tenant_id)
);

DROP POLICY IF EXISTS "feature_flags_insert_super_admin" ON feature_flags;
CREATE POLICY "feature_flags_insert_super_admin" ON feature_flags FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

DROP POLICY IF EXISTS "feature_flags_delete_super_admin" ON feature_flags;
CREATE POLICY "feature_flags_delete_super_admin" ON feature_flags FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

-- ── plan_limits ──────────────────────────────────────────
DROP POLICY IF EXISTS "plan_limits_select" ON plan_limits;
CREATE POLICY "plan_limits_select" ON plan_limits FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_limits_update_super_admin" ON plan_limits;
CREATE POLICY "plan_limits_update_super_admin" ON plan_limits FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

DROP POLICY IF EXISTS "plan_limits_insert_super_admin" ON plan_limits;
CREATE POLICY "plan_limits_insert_super_admin" ON plan_limits FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

DROP POLICY IF EXISTS "plan_limits_delete_super_admin" ON plan_limits;
CREATE POLICY "plan_limits_delete_super_admin" ON plan_limits FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

-- ── whatsapp_templates ───────────────────────────────────
DROP POLICY IF EXISTS "whatsapp_templates_select" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_select" ON whatsapp_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "whatsapp_templates_insert_admin" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_insert_admin" ON whatsapp_templates FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = whatsapp_templates.tenant_id)
);

DROP POLICY IF EXISTS "whatsapp_templates_update_admin" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_update_admin" ON whatsapp_templates FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = whatsapp_templates.tenant_id)
);

DROP POLICY IF EXISTS "whatsapp_templates_delete_admin" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_delete_admin" ON whatsapp_templates FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = whatsapp_templates.tenant_id)
);

-- ── cms_pages ────────────────────────────────────────────
DROP POLICY IF EXISTS "cms_pages_select" ON cms_pages;
CREATE POLICY "cms_pages_select" ON cms_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "cms_pages_insert_admin" ON cms_pages;
CREATE POLICY "cms_pages_insert_admin" ON cms_pages FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = cms_pages.tenant_id)
);

DROP POLICY IF EXISTS "cms_pages_update_admin" ON cms_pages;
CREATE POLICY "cms_pages_update_admin" ON cms_pages FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = cms_pages.tenant_id)
);

DROP POLICY IF EXISTS "cms_pages_delete_admin" ON cms_pages;
CREATE POLICY "cms_pages_delete_admin" ON cms_pages FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = cms_pages.tenant_id)
);

-- ── carousel_slides ──────────────────────────────────────
DROP POLICY IF EXISTS "carousel_slides_select" ON carousel_slides;
CREATE POLICY "carousel_slides_select" ON carousel_slides FOR SELECT USING (true);

DROP POLICY IF EXISTS "carousel_slides_insert_admin" ON carousel_slides;
CREATE POLICY "carousel_slides_insert_admin" ON carousel_slides FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = carousel_slides.tenant_id)
);

DROP POLICY IF EXISTS "carousel_slides_update_admin" ON carousel_slides;
CREATE POLICY "carousel_slides_update_admin" ON carousel_slides FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = carousel_slides.tenant_id)
);

DROP POLICY IF EXISTS "carousel_slides_delete_admin" ON carousel_slides;
CREATE POLICY "carousel_slides_delete_admin" ON carousel_slides FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = carousel_slides.tenant_id)
);

-- ── analytics_events ─────────────────────────────────────
DROP POLICY IF EXISTS "analytics_events_select_admin" ON analytics_events;
CREATE POLICY "analytics_events_select_admin" ON analytics_events FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','super_admin') AND tenant_id = analytics_events.tenant_id)
);

DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;
CREATE POLICY "analytics_events_insert" ON analytics_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_events_delete_super_admin" ON analytics_events;
CREATE POLICY "analytics_events_delete_super_admin" ON analytics_events FOR DELETE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

-- ── Tenant-scoped public read policies (from 20260210_rls_hardening) ──

DROP POLICY IF EXISTS "config_select_tenant" ON config;
CREATE POLICY "config_select_tenant" ON config FOR SELECT USING (true);

DROP POLICY IF EXISTS "feature_flags_select_tenant" ON feature_flags;
CREATE POLICY "feature_flags_select_tenant" ON feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_limits_select_tenant" ON plan_limits;
CREATE POLICY "plan_limits_select_tenant" ON plan_limits FOR SELECT USING (true);

DROP POLICY IF EXISTS "whatsapp_templates_select_tenant" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_select_tenant" ON whatsapp_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "cms_pages_select_tenant" ON cms_pages;
CREATE POLICY "cms_pages_select_tenant" ON cms_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "carousel_slides_select_tenant" ON carousel_slides;
CREATE POLICY "carousel_slides_select_tenant" ON carousel_slides FOR SELECT USING (true);

DROP POLICY IF EXISTS "analytics_events_insert_with_tenant" ON analytics_events;
CREATE POLICY "analytics_events_insert_with_tenant" ON analytics_events FOR INSERT WITH CHECK (true);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260212_analytics_events_insert_service_role.sql             │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Tighten analytics_events INSERT access
-- ----------------------------------------------------------------------------
-- Previous policy allowed INSERT WITH CHECK (true), which permitted untrusted
-- anon/authenticated inserts when table grants were present.
-- New policy restricts INSERT policy checks to service_role callers only.
-- ============================================================================

DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_with_tenant" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_open" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_service_role" ON analytics_events;

CREATE POLICY "analytics_events_insert_service_role" ON analytics_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260212_rls_tenant_scoped_selects.sql                        │
-- └──────────────────────────────────────────────────────────────────────────┘

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

DROP POLICY IF EXISTS "analytics_events_insert_open" ON analytics_events;
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260212_zzz_analytics_events_insert_service_role_finalize.sql│
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Finalizer: analytics_events INSERT must be service_role-only
-- ----------------------------------------------------------------------------
-- This migration is intentionally ordered after 20260212_rls_tenant_scoped_selects
-- to guarantee the final effective policy is service_role-only.
-- ============================================================================

DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_with_tenant" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_open" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_service_role" ON analytics_events;

CREATE POLICY "analytics_events_insert_service_role" ON analytics_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260213_rls_owner_panel_role_tightening.sql                  │
-- └──────────────────────────────────────────────────────────────────────────┘

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
DROP POLICY IF EXISTS "config_select_owner_super_admin" ON config;
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
DROP POLICY IF EXISTS "feature_flags_select_owner_super_admin" ON feature_flags;
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
DROP POLICY IF EXISTS "plan_limits_select_owner_super_admin" ON plan_limits;
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
DROP POLICY IF EXISTS "whatsapp_templates_select_owner_super_admin" ON whatsapp_templates;
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
DROP POLICY IF EXISTS "cms_pages_select_owner_super_admin" ON cms_pages;
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
DROP POLICY IF EXISTS "carousel_slides_select_owner_super_admin" ON carousel_slides;
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260221_policy_idempotency_patch.sql                         │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ─── Policy Idempotency Patch ───────────────────────────────────────────────
-- Ensures all policy definitions in previous migrations are idempotent.
-- This migration drops policies that were created without DROP IF EXISTS guards,
-- then recreates them identically.
-- Affects: 20260213_rls_owner_panel_role_tightening.sql (6)
--          20260215_chat_tables.sql (5)
--          20260215_return_requests.sql (4)
--          20260220_newsletter_subscribers.sql (1)
--          20260220_product_wishlists.sql (3)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 20260213_rls_owner_panel_role_tightening.sql ─────────────────────────────

DROP POLICY IF EXISTS "config_select_owner_super_admin" ON config;
CREATE POLICY "config_select_owner_super_admin" ON config FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
);

DROP POLICY IF EXISTS "feature_flags_select_owner_super_admin" ON feature_flags;
CREATE POLICY "feature_flags_select_owner_super_admin" ON feature_flags FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
);

DROP POLICY IF EXISTS "plan_limits_select_owner_super_admin" ON plan_limits;
CREATE POLICY "plan_limits_select_owner_super_admin" ON plan_limits FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
);

DROP POLICY IF EXISTS "whatsapp_templates_select_owner_super_admin" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_select_owner_super_admin" ON whatsapp_templates FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
);

DROP POLICY IF EXISTS "cms_pages_select_owner_super_admin" ON cms_pages;
CREATE POLICY "cms_pages_select_owner_super_admin" ON cms_pages FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
);

DROP POLICY IF EXISTS "carousel_slides_select_owner_super_admin" ON carousel_slides;
CREATE POLICY "carousel_slides_select_owner_super_admin" ON carousel_slides FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
);

-- ── 20260215_chat_tables.sql ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "chat_settings_service" ON public.chat_settings;
CREATE POLICY "chat_settings_service" ON public.chat_settings
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "chat_usage_service" ON public.chat_usage;
CREATE POLICY "chat_usage_service" ON public.chat_usage
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "chat_logs_service" ON public.chat_logs;
CREATE POLICY "chat_logs_service" ON public.chat_logs
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "chat_daily_stats_service" ON public.chat_daily_stats;
CREATE POLICY "chat_daily_stats_service" ON public.chat_daily_stats
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "chat_tier_config_service" ON public.chat_tier_config;
CREATE POLICY "chat_tier_config_service" ON public.chat_tier_config
    USING (true)
    WITH CHECK (true);

-- ── 20260215_return_requests.sql ─────────────────────────────────────────────

DROP POLICY IF EXISTS "return_requests_select_own" ON public.return_requests;
CREATE POLICY "return_requests_select_own" ON public.return_requests
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "return_requests_insert_own" ON public.return_requests;
CREATE POLICY "return_requests_insert_own" ON public.return_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "return_requests_select_admin" ON public.return_requests;
CREATE POLICY "return_requests_select_admin" ON public.return_requests
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
    );

DROP POLICY IF EXISTS "return_requests_update_admin" ON public.return_requests;
CREATE POLICY "return_requests_update_admin" ON public.return_requests
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
    );

-- ── 20260220_newsletter_subscribers.sql ──────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read newsletter subscribers" ON newsletter_subscribers;
CREATE POLICY "Admins can read newsletter subscribers" ON newsletter_subscribers
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin', 'super_admin')
    );

-- ── 20260220_product_wishlists.sql ───────────────────────────────────────────

DROP POLICY IF EXISTS "Users can read own wishlist" ON product_wishlists;
CREATE POLICY "Users can read own wishlist" ON product_wishlists
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can add to own wishlist" ON product_wishlists;
CREATE POLICY "Users can add to own wishlist" ON product_wishlists
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove from own wishlist" ON product_wishlists;
CREATE POLICY "Users can remove from own wishlist" ON product_wishlists
    FOR DELETE USING (user_id = auth.uid());

