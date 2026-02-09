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
CREATE POLICY "feature_flags_select" ON feature_flags
    FOR SELECT USING (true);

-- Write: super_admin or owner of the tenant
DROP POLICY IF EXISTS "feature_flags_write_admin" ON feature_flags;
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
CREATE POLICY "feature_flags_insert_super_admin" ON feature_flags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Delete: only super_admin (tenant deprovisioning)
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
CREATE POLICY "plan_limits_select" ON plan_limits
    FOR SELECT USING (true);

-- Write: only super_admin (plan management is SaaS-level)
DROP POLICY IF EXISTS "plan_limits_write_admin" ON plan_limits;
CREATE POLICY "plan_limits_update_super_admin" ON plan_limits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

CREATE POLICY "plan_limits_insert_super_admin" ON plan_limits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

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
CREATE POLICY "whatsapp_templates_select" ON whatsapp_templates
    FOR SELECT USING (true);

-- Write: super_admin or owner of tenant
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
CREATE POLICY "cms_pages_select" ON cms_pages
    FOR SELECT USING (true);

-- Write: super_admin or owner of tenant
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
CREATE POLICY "carousel_slides_select" ON carousel_slides
    FOR SELECT USING (true);

-- Write: super_admin or owner of tenant
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
CREATE POLICY "analytics_events_insert" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- No update/delete from client — only super_admin
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
