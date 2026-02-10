-- ============================================================================
-- RLS Smoke Test — Multi-Tenant Isolation
-- ============================================================================
-- Run against Supabase after applying all migrations.
-- Tests that RLS policies enforce proper tenant isolation.
--
-- Prerequisites:
--   - Two test tenants (tenant_a, tenant_b) created via provision_tenant()
--   - Test users assigned to each tenant with appropriate roles
--
-- Expected results:
--   - anon: cannot read any governance tables
--   - customer of tenant_a: cannot read tenant_b's data
--   - owner of tenant_a: can read tenant_a's data, cannot read tenant_b's
--   - super_admin: can read all tenants
-- ============================================================================

-- ── 1. Verify tenant-scoped reads ────────────────────────

-- As anon (no auth), governance tables should return 0 rows
-- Run from SQL editor with no auth token:
SELECT 'config: anon should see 0 rows' AS test,
       (SELECT count(*) FROM config) AS actual,
       0 AS expected;

SELECT 'feature_flags: anon should see 0 rows' AS test,
       (SELECT count(*) FROM feature_flags) AS actual,
       0 AS expected;

SELECT 'plan_limits: anon should see 0 rows' AS test,
       (SELECT count(*) FROM plan_limits) AS actual,
       0 AS expected;

SELECT 'carousel_slides: anon should see 0 rows' AS test,
       (SELECT count(*) FROM carousel_slides) AS actual,
       0 AS expected;

SELECT 'whatsapp_templates: anon should see 0 rows' AS test,
       (SELECT count(*) FROM whatsapp_templates) AS actual,
       0 AS expected;

SELECT 'cms_pages: anon should see 0 rows' AS test,
       (SELECT count(*) FROM cms_pages) AS actual,
       0 AS expected;

-- ── 2. Verify analytics INSERT requires tenant_id ────────

-- This should FAIL (tenant_id IS NULL check):
-- INSERT INTO analytics_events (event_type, properties)
-- VALUES ('test', '{}');

-- This should SUCCEED:
-- INSERT INTO analytics_events (event_type, properties, tenant_id)
-- VALUES ('test', '{}', '<valid-tenant-uuid>');

-- ── 3. Verify cross-tenant isolation ─────────────────────

-- As owner of tenant_a, query config — should only see tenant_a's config:
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub":"<tenant_a_owner_uuid>"}';
-- SELECT count(*) FROM config;  -- Expected: 1 (own tenant only)

-- ── 4. Verify super_admin can read all ───────────────────

-- As super_admin:
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub":"<super_admin_uuid>"}';
-- SELECT count(*) FROM config;  -- Expected: N (all tenants)

-- ============================================================================
-- Note: To fully automate these tests, use pgTAP or a test runner that can
-- set JWT claims and switch roles. The manual tests above serve as a runbook.
-- ============================================================================
