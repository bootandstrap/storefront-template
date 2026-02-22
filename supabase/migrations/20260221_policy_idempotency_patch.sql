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
