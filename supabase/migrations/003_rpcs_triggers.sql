-- ============================================================================
-- 003_rpcs_triggers.sql
-- Squashed: 2026-04-04
-- Contains: RPCs (provision_tenant, count_orders), triggers, functions
-- Sources: 3 migration files
-- ============================================================================

-- TABLE OF CONTENTS:
-- 1. 20260209_admin_rpc_tenant_provisioning.sql
-- 2. 20260319_count_tenant_orders_month.sql
-- 3. 20260326_governance_realtime_broadcast.sql
--
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260209_admin_rpc_tenant_provisioning.sql                    │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Transactional Tenant Provisioning RPC
-- ============================================================================
-- Atomic function to create a tenant with all dependent rows in a single
-- transaction. If any step fails, the entire operation rolls back.
--
-- Called from bootandstrap-admin via: supabase.rpc('provision_tenant', {...})
-- Must be invoked with service_role key (bypasses RLS).
-- ============================================================================

CREATE OR REPLACE FUNCTION provision_tenant(
    p_name TEXT,
    p_slug TEXT,
    p_domain TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT 'starter',
    -- Config defaults
    p_language TEXT DEFAULT 'es',
    p_country_prefix TEXT DEFAULT '+57',
    p_currency TEXT DEFAULT 'cop',
    p_timezone TEXT DEFAULT 'America/Bogota'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Create tenant
    INSERT INTO tenants (name, slug, domain, status)
    VALUES (p_name, p_slug, p_domain, 'active')
    RETURNING id INTO v_tenant_id;

    -- 2. Create config
    INSERT INTO config (
        tenant_id, business_name, whatsapp_number, default_country_prefix,
        primary_color, secondary_color, accent_color, color_preset,
        theme_mode, language, timezone, default_currency,
        active_languages, active_currencies
    )
    VALUES (
        v_tenant_id, p_name, '', p_country_prefix,
        '#16a34a', '#065f46', '#f59e0b', 'nature',
        'light', p_language, p_timezone, p_currency,
        ARRAY[p_language], ARRAY[p_currency]
    );

    -- 3. Create feature flags (defaults for starter plan — ALL 79 flags)
    INSERT INTO feature_flags (
        tenant_id,
        -- Checkout
        enable_whatsapp_checkout, enable_online_payments, enable_cash_on_delivery,
        enable_bank_transfer, enable_whatsapp_contact,
        -- Auth (basic)
        enable_user_registration, enable_guest_checkout,
        require_auth_to_order, enable_google_auth, enable_email_auth,
        -- Auth Advanced (granular)
        enable_apple_oauth, enable_facebook_oauth, enable_2fa, enable_magic_link,
        -- Content
        enable_ecommerce, enable_reviews, enable_wishlist, enable_carousel, enable_cms_pages,
        enable_product_search, enable_related_products, enable_product_comparisons,
        enable_product_badges,
        -- Advanced
        enable_analytics, enable_promotions,
        enable_multi_language, enable_multi_currency, enable_admin_api,
        -- Business
        enable_social_links, enable_order_notes, enable_address_management,
        enable_newsletter,
        -- System
        enable_maintenance_mode, enable_owner_panel, enable_customer_accounts,
        enable_order_tracking, enable_cookie_consent, enable_chatbot,
        enable_self_service_returns,
        owner_lite_enabled, owner_advanced_modules_enabled,
        -- CRM
        enable_crm, enable_crm_segmentation, enable_crm_export,
        enable_crm_contacts, enable_crm_interactions, enable_crm_segments,
        -- Email Marketing
        enable_email_notifications, enable_abandoned_cart_emails,
        enable_email_campaigns, enable_email_templates,
        enable_transactional_emails, enable_review_request_emails, enable_email_segmentation,
        -- POS
        enable_pos, enable_pos_kiosk, enable_pos_keyboard_shortcuts,
        enable_pos_quick_sale, enable_pos_offline_cart, enable_pos_thermal_printer,
        enable_pos_line_discounts, enable_pos_customer_search,
        enable_pos_multi_device, enable_pos_shifts,
        -- Kiosk (granular)
        enable_kiosk_analytics, enable_kiosk_idle_timer, enable_kiosk_remote_management,
        -- Traffic
        enable_traffic_expansion, enable_traffic_analytics, enable_traffic_autoscale,
        -- Module gates
        enable_seo, enable_seo_tools,
        enable_social_media, enable_social_sharing,
        enable_automations, enable_custom_webhooks,
        enable_auth_advanced,
        enable_sales_channels, enable_reservation_checkout
    )
    VALUES (
        v_tenant_id,
        -- Checkout: whatsapp + cod on, online/bank off
        true, false, true,
        false, true,
        -- Auth: registration + guest on, no forced login, google + email on
        true, true,
        false, true, true,
        -- Auth Advanced: all off
        false, false, false, false,
        -- Content: ecommerce + carousel + search on, rest off
        true, false, false, true, false,
        true, false, false,
        false,
        -- Advanced: no analytics/promos/multi-lang/currency/admin-api
        false, false,
        false, false, false,
        -- Business: social + notes + addresses on, newsletter off
        true, true, true,
        false,
        -- System: no maintenance, owner panel + accounts + tracking on, cookie/chatbot/returns off
        false, true, true,
        true, false, false,
        false,
        true, false,
        -- CRM: all off
        false, false, false,
        false, false, false,
        -- Email: all off
        false, false,
        false, false,
        false, false, false,
        -- POS: all off
        false, false, false,
        false, false, false,
        false, false,
        false, false,
        -- Kiosk: all off
        false, false, false,
        -- Traffic: all off
        false, false, false,
        -- Module gates: all off
        false, false,
        false, false,
        false, false,
        false,
        false, false
    );

    -- 4. Create plan limits (starter defaults — ALL 30 limits)
    INSERT INTO plan_limits (
        tenant_id, plan_name,
        max_products, max_customers, max_orders_month,
        max_categories, max_images_per_product, max_cms_pages,
        max_carousel_slides, max_admin_users, storage_limit_mb,
        max_languages, max_currencies,
        max_whatsapp_templates, max_file_upload_mb,
        max_email_sends_month, max_custom_domains,
        max_chatbot_messages_month, max_badges,
        max_newsletter_subscribers, max_requests_day,
        max_reviews_per_product, max_wishlist_items,
        max_promotions_active, max_payment_methods,
        max_crm_contacts, max_pos_payment_methods,
        max_automations, max_pos_kiosk_devices
    )
    VALUES (
        v_tenant_id, COALESCE(p_plan, 'starter'),
        100, 100, 500,
        20, 10, 10,
        10, 3, 500,
        1, 1,
        5, 5,
        500, 1,
        100, 5,
        500, 10000,
        10, 50,
        5, 3,
        100, 2,
        0, 0
    );

    RETURN v_tenant_id;
END;
$$;

-- ============================================================================
-- Transactional Tenant Deletion RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_tenant(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete all dependent rows, then the tenant itself.
    -- ON DELETE CASCADE on FKs handles most of this, but we
    -- explicitly delete for tables that might not have cascade.
    DELETE FROM analytics_events WHERE tenant_id = p_tenant_id;
    DELETE FROM cms_pages WHERE tenant_id = p_tenant_id;
    DELETE FROM whatsapp_templates WHERE tenant_id = p_tenant_id;
    DELETE FROM carousel_slides WHERE tenant_id = p_tenant_id;
    DELETE FROM plan_limits WHERE tenant_id = p_tenant_id;
    DELETE FROM feature_flags WHERE tenant_id = p_tenant_id;
    DELETE FROM config WHERE tenant_id = p_tenant_id;
    DELETE FROM tenants WHERE id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
    END IF;
END;
$$;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260319_count_tenant_orders_month.sql                        │
-- └──────────────────────────────────────────────────────────────────────────┘

-- Migration: count_tenant_orders_month RPC
-- Phase 2 of MEGA PLAN v4 — Real-time order limit enforcement
-- 
-- This RPC provides a secure, anon-key-accessible count of orders
-- placed by a tenant in the current calendar month.
-- 
-- SECURITY: SECURITY DEFINER — runs as owner, callable with anon key.
-- The function reads from module_orders (status = paid/active/completed/confirmed)
-- to count actual fulfilled orders, not pending ones.
--
-- Usage from storefront:
--   SELECT count_tenant_orders_month('tenant-uuid');
-- Returns: integer (count of orders this month)

CREATE OR REPLACE FUNCTION public.count_tenant_orders_month(
    p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO order_count
    FROM module_orders
    WHERE tenant_id = p_tenant_id
      AND status IN ('paid', 'active', 'completed', 'confirmed')
      AND created_at >= date_trunc('month', NOW());
    
    RETURN COALESCE(order_count, 0);
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.count_tenant_orders_month(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.count_tenant_orders_month(UUID) TO authenticated;

COMMENT ON FUNCTION public.count_tenant_orders_month IS 
    'Returns the count of paid/active orders for a tenant in the current month. Used by storefront checkout to enforce max_orders_month plan limit.';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ Source: 20260326_governance_realtime_broadcast.sql                    │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ============================================================================
-- Governance Realtime Broadcast Trigger
-- Generated by bns-gov CLI — Phase 4
--
-- Purpose: When any governance table changes (feature_flags, plan_limits,
-- capability_overrides, config, module_orders), broadcast an invalidation
-- signal to the storefront via Supabase Realtime.
--
-- The storefront's useRealtimeGovernance hook listens on
-- `governance:{tenant_id}` channel and calls router.refresh() to re-fetch
-- config from the server.
--
-- Prerequisites:
--   1. Supabase Realtime must be enabled for the project
--   2. supabase_realtime extension must be available
-- ============================================================================

-- ── Trigger Function ───────────────────────────────────────────────────────
-- Uses realtime.send() to broadcast a "governance_change" event.
-- Channel name: "governance:{tenant_id}"
-- Payload: just enough metadata for debugging (table, op, timestamp)
-- Data is NOT sent — the storefront re-fetches via existing RPC pipeline.

CREATE OR REPLACE FUNCTION broadcast_governance_change()
RETURNS trigger AS $$
DECLARE
    v_tenant_id uuid;
BEGIN
    -- Extract tenant_id from the affected row
    v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
    
    IF v_tenant_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Broadcast invalidation signal via Supabase Realtime
    -- realtime.send(channel, event, payload, is_public)
    BEGIN
        PERFORM realtime.send(
            'governance:' || v_tenant_id::text,
            'governance_change',
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'tenant_id', v_tenant_id::text,
                'ts', extract(epoch from now())
            ),
            true  -- public channel (anon key can subscribe)
        );
    EXCEPTION WHEN OTHERS THEN
        -- Silently ignore if realtime.send() is not available
        -- This prevents the trigger from blocking writes if Realtime is down
        RAISE WARNING 'broadcast_governance_change: realtime.send() failed: %', SQLERRM;
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Attach triggers to governance tables ───────────────────────────────────

-- Feature flags
DROP TRIGGER IF EXISTS trg_broadcast_feature_flags ON feature_flags;
CREATE TRIGGER trg_broadcast_feature_flags
    AFTER INSERT OR UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION broadcast_governance_change();

-- Plan limits
DROP TRIGGER IF EXISTS trg_broadcast_plan_limits ON plan_limits;
CREATE TRIGGER trg_broadcast_plan_limits
    AFTER INSERT OR UPDATE ON plan_limits
    FOR EACH ROW EXECUTE FUNCTION broadcast_governance_change();

-- Config
DROP TRIGGER IF EXISTS trg_broadcast_config ON config;
CREATE TRIGGER trg_broadcast_config
    AFTER INSERT OR UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION broadcast_governance_change();

-- Capability overrides
DROP TRIGGER IF EXISTS trg_broadcast_capability_overrides ON capability_overrides;
CREATE TRIGGER trg_broadcast_capability_overrides
    AFTER INSERT OR UPDATE OR DELETE ON capability_overrides
    FOR EACH ROW EXECUTE FUNCTION broadcast_governance_change();

-- Module orders (active module changes)
DROP TRIGGER IF EXISTS trg_broadcast_module_orders ON module_orders;
CREATE TRIGGER trg_broadcast_module_orders
    AFTER INSERT OR UPDATE ON module_orders
    FOR EACH ROW EXECUTE FUNCTION broadcast_governance_change();

