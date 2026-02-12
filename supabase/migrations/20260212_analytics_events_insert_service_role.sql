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
