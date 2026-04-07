-- ============================================================================
-- update_owner_config RPC — SECURITY DEFINER
-- Date: 2026-04-06
-- 
-- Purpose: Allows the Owner Panel to update config fields for a tenant
-- without relying on RLS UPDATE policies (which are fragile when both
-- FOR SELECT + FOR ALL coexist on the same table).
--
-- Security model:
--   - SECURITY DEFINER: runs as DB owner, bypasses RLS
--   - Caller must have already passed withPanelGuard() in application code
--   - p_tenant_id is validated to exist in config table
--   - Only specific allowed fields can be updated (allowlist enforcement)
--   - Uses dynamic SQL with format() for injection safety
-- 
-- Called from: storefront panel actions via `supabase.rpc('update_owner_config', ...)`
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_owner_config(
    p_tenant_id UUID,
    p_updates JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_allowed TEXT[] := ARRAY[
        -- Core config
        'business_name', 'logo_url', 'favicon_url', 'whatsapp_number',
        'store_email', 'primary_color', 'secondary_color', 'accent_color',
        'color_preset', 'theme_mode', 'language', 'timezone', 'default_currency',
        'announcement_bar_enabled', 'announcement_bar_text',
        'meta_title', 'meta_description', 'og_image_url',
        -- Language preferences (independent panel vs storefront)
        'panel_language', 'storefront_language',
        'active_languages', 'active_currencies',
        -- Gamification / onboarding
        'onboarding_completed', 'checklist_skipped', 'achievements_unlocked',
        'dismissed_tips', 'tour_completed',
        -- Business settings
        'free_shipping_threshold', 'min_order_amount', 'low_stock_threshold',
        'default_country_prefix', 'shipping_zones', 'payment_instructions',
        -- Contact & social
        'contact_phone', 'contact_address', 'social_links',
        -- POS config
        'pos_enable_tips', 'pos_tip_percentages', 'pos_default_payment',
        'pos_sound_enabled', 'pos_receipt_footer',
        -- Capacity
        'capacity_warning_threshold_pct', 'capacity_critical_threshold_pct',
        'capacity_auto_upgrade_interest',
        -- Chatbot
        'chatbot_welcome_message', 'chatbot_auto_open_delay',
        -- Webhook & notifications
        'webhook_notification_email', 'notification_preferences',
        -- CRM
        'crm_auto_tag_customers', 'crm_notify_new_contact', 'crm_export_format',
        -- Sales Channels
        'sales_whatsapp_greeting', 'sales_preferred_contact',
        'sales_business_hours_display', 'sales_highlight_free_shipping',
        -- Email Marketing
        'email_sender_name', 'email_reply_to', 'email_footer_text',
        'email_abandoned_cart_delay'
    ];
    v_key TEXT;
    v_value JSONB;
    v_set_clauses TEXT[] := '{}';
    v_sql TEXT;
    v_count INT;
BEGIN
    -- Verify tenant config exists
    SELECT COUNT(*) INTO v_count FROM config WHERE tenant_id = p_tenant_id;
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Config not found for tenant %', p_tenant_id;
    END IF;

    -- Build SET clause from allowed JSONB keys only
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_updates)
    LOOP
        IF v_key = ANY(v_allowed) THEN
            -- format(%I, ...) handles column name safely (prevents SQL injection)
            -- format(%L, ...) handles value safely
            IF v_value = 'null'::jsonb THEN
                v_set_clauses := v_set_clauses || format('%I = NULL', v_key);
            ELSIF jsonb_typeof(v_value) = 'boolean' THEN
                v_set_clauses := v_set_clauses || format('%I = %L::boolean', v_key, v_value #>> '{}');
            ELSIF jsonb_typeof(v_value) = 'number' THEN
                v_set_clauses := v_set_clauses || format('%I = %L::numeric', v_key, v_value #>> '{}');
            ELSIF jsonb_typeof(v_value) = 'array' THEN
                -- Store arrays as text[] if the column type natively is text[]
                IF v_key IN ('active_languages', 'active_currencies') THEN
                    -- Convert the JSON array to a SQL text array literal
                    -- e.g. ["es", "en"] -> ARRAY['es', 'en']::text[]
                    -- We can do this by using a subquery with jsonb_array_elements_text
                    v_set_clauses := v_set_clauses || format('%I = ARRAY(SELECT jsonb_array_elements_text(%L::jsonb))::text[]', v_key, v_value::text);
                ELSE
                    -- Store as jsonb for columns like pos_tip_percentages, social_links
                    v_set_clauses := v_set_clauses || format('%I = %L::jsonb', v_key, v_value::text);
                END IF;
            ELSIF jsonb_typeof(v_value) = 'object' THEN
                v_set_clauses := v_set_clauses || format('%I = %L::jsonb', v_key, v_value::text);
            ELSE
                -- string value
                v_set_clauses := v_set_clauses || format('%I = %L', v_key, v_value #>> '{}');
            END IF;
        END IF;
    END LOOP;

    -- If no valid fields to update, return true (no-op)
    IF array_length(v_set_clauses, 1) IS NULL OR array_length(v_set_clauses, 1) = 0 THEN
        RETURN TRUE;
    END IF;

    -- Execute dynamic UPDATE
    v_sql := format(
        'UPDATE config SET %s WHERE tenant_id = %L',
        array_to_string(v_set_clauses, ', '),
        p_tenant_id
    );
    EXECUTE v_sql;

    RETURN TRUE;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.update_owner_config(UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.update_owner_config(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION public.update_owner_config IS 
    'Securely updates config fields for a tenant. Uses SECURITY DEFINER to bypass RLS with field-level allowlist. Application-level auth (withPanelGuard) must be verified before calling.';
