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

    -- 3. Create feature flags (defaults for starter plan)
    INSERT INTO feature_flags (
        tenant_id,
        enable_whatsapp_checkout, enable_online_payments, enable_cash_on_delivery,
        enable_bank_transfer, enable_user_registration, enable_guest_checkout,
        require_auth_to_order, enable_google_auth, enable_email_auth,
        enable_reviews, enable_wishlist, enable_carousel, enable_cms_pages,
        enable_product_search, enable_analytics, enable_promotions,
        enable_multi_language, enable_multi_currency, enable_admin_api,
        enable_social_links, enable_order_notes, enable_address_management,
        enable_maintenance_mode, enable_owner_panel, enable_customer_accounts,
        enable_order_tracking
    )
    VALUES (
        v_tenant_id,
        true, false, true,    -- checkout: whatsapp + cod
        false, true, true,    -- auth: registration + guest
        false, true, true,    -- auth: no forced login, google + email
        false, false, true, false, -- content: carousel only
        true, false, false,   -- search, no analytics/promos
        false, false, false,  -- no multi-lang/currency/admin-api
        true, true, true,     -- social + notes + addresses
        false, true, true,    -- no maintenance, owner panel + accounts
        true                  -- order tracking
    );

    -- 4. Create plan limits (starter defaults)
    INSERT INTO plan_limits (
        tenant_id, plan_name,
        max_products, max_customers, max_orders_month,
        max_categories, max_images_per_product, max_cms_pages,
        max_carousel_slides, max_admin_users, storage_limit_mb,
        max_languages, max_currencies,
        max_whatsapp_templates, max_file_upload_mb,
        max_email_sends_month, max_custom_domains
    )
    VALUES (
        v_tenant_id, COALESCE(p_plan, 'starter'),
        100, 100, 500,
        20, 10, 10,
        10, 3, 500,
        1, 1,
        5, 5,
        500, 1
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
