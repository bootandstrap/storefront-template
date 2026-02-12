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
