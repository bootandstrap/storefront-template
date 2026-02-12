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
