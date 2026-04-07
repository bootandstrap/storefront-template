-- ============================================================================
-- SECURITY HARDENING MIGRATION — 2026-04-06
-- 
-- Phase 1: Lock 135 Medusa tables (REVOKE anon/authenticated + enable RLS)
-- Phase 2: Restrict dangerous SECURITY DEFINER functions from anon
-- Phase 3: Fix RLS gaps (feature_flags, whatsapp_templates)
-- Phase 4: Migrate plaintext secrets to Vault
--
-- SAFE: Medusa connects as 'postgres' role, which bypasses RLS and GRANTs.
--       Only PostgREST (Supabase REST API) uses anon/authenticated roles.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1: LOCK DOWN MEDUSA TABLES
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    t TEXT;
    locked_count INT := 0;
    medusa_tables TEXT[] := ARRAY[
        'user', 'api_key', 'auth_identity', 'provider_identity',
        'customer', 'customer_address', 'customer_group', 'customer_group_customer',
        'customer_account_holder', 'account_holder',
        'order', 'order_address', 'order_cart', 'order_change', 'order_change_action',
        'order_claim', 'order_claim_item', 'order_claim_item_image', 'order_credit_line',
        'order_exchange', 'order_exchange_item', 'order_fulfillment', 'order_item',
        'order_line_item', 'order_line_item_adjustment', 'order_line_item_tax_line',
        'order_payment_collection', 'order_promotion', 'order_shipping',
        'order_shipping_method', 'order_shipping_method_adjustment',
        'order_shipping_method_tax_line', 'order_summary', 'order_transaction',
        'payment', 'payment_collection', 'payment_collection_payment_providers',
        'payment_provider', 'payment_session',
        'product', 'product_category', 'product_category_product', 'product_collection',
        'product_option', 'product_option_value', 'product_review',
        'product_sales_channel', 'product_shipping_profile',
        'product_tag', 'product_tags', 'product_type',
        'product_variant', 'product_variant_inventory_item', 'product_variant_option',
        'product_variant_price_set', 'product_variant_product_image',
        'cart', 'cart_address', 'cart_line_item', 'cart_line_item_adjustment',
        'cart_line_item_tax_line', 'cart_payment_collection', 'cart_promotion',
        'cart_shipping_method', 'cart_shipping_method_adjustment', 'cart_shipping_method_tax_line',
        'fulfillment', 'fulfillment_address', 'fulfillment_item', 'fulfillment_label',
        'fulfillment_provider', 'fulfillment_set',
        'inventory_item', 'inventory_level', 'reservation_item',
        'price', 'price_list', 'price_list_rule', 'price_preference',
        'price_rule', 'price_set',
        'promotion', 'promotion_application_method', 'promotion_campaign',
        'promotion_campaign_budget', 'promotion_campaign_budget_usage',
        'promotion_promotion_rule', 'promotion_rule', 'promotion_rule_value',
        'publishable_api_key_sales_channel',
        'refund', 'refund_reason',
        'region', 'region_country', 'region_payment_provider',
        'return', 'return_fulfillment', 'return_item', 'return_reason',
        'sales_channel', 'sales_channel_stock_location',
        'service_zone',
        'shipping_option', 'shipping_option_price_set', 'shipping_option_rule',
        'shipping_option_type', 'shipping_profile',
        'stock_location', 'stock_location_address',
        'store', 'store_currency', 'store_locale',
        'tax_provider', 'tax_rate', 'tax_rate_rule', 'tax_region',
        'currency', 'image', 'invite', 'notification', 'notification_provider',
        'capture', 'credit_line', 'geo_zone',
        'location_fulfillment_provider', 'location_fulfillment_set',
        'user_preference', 'user_rbac_role', 'view_configuration',
        'workflow_execution',
        'mikro_orm_migrations', 'script_migrations', 'link_module_migrations',
        'application_method_buy_rules', 'application_method_target_rules'
    ];
BEGIN
    FOREACH t IN ARRAY medusa_tables LOOP
        -- Check table exists before operating
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            locked_count := locked_count + 1;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', t;
        END IF;
    END LOOP;
    RAISE NOTICE '✅ Phase 1 complete: Locked % Medusa tables', locked_count;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2: RESTRICT SECURITY DEFINER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Dangerous admin/infrastructure functions — anon must NOT call these
DO $$
DECLARE
    func_sig TEXT;
    revoked_count INT := 0;
    dangerous_funcs TEXT[] := ARRAY[
        'delete_tenant(uuid)',
        'store_tenant_secret(uuid, text, text)',
        'get_tenant_secret(uuid, text)',
        'store_medusa_credentials(uuid, text, text, text)',
        'get_medusa_credentials(uuid)',
        'claim_job(text, text)',
        'cleanup_old_jobs()',
        'cleanup_health_snapshots()',
        'cleanup_revalidation_queue()',
        'claim_vps_node_for_tenant(uuid)',
        'broadcast_governance_change(uuid, text)',
        'check_rls_gaps()',
        'propagate_dead_parent(uuid)',
        'log_tenant_error(uuid, text, text, text, jsonb)'
    ];
BEGIN
    FOREACH func_sig IN ARRAY dangerous_funcs LOOP
        BEGIN
            EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', func_sig);
            revoked_count := revoked_count + 1;
        EXCEPTION WHEN undefined_function THEN
            RAISE NOTICE 'Function % not found, skipping', func_sig;
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not revoke %: %', func_sig, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE '✅ Phase 2a complete: Revoked anon EXECUTE on % dangerous functions', revoked_count;
END $$;

-- Handle overloaded functions (claim_webhook_event has 2 signatures)
DO $$
BEGIN
    -- Revoke from ALL overloads of claim_webhook_event
    EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon';
    
    -- Re-grant ONLY the functions that anon NEEDS (storefront reads with anon key)
    -- Governance reads
    GRANT EXECUTE ON FUNCTION public.get_tenant_governance TO anon;
    GRANT EXECUTE ON FUNCTION public.get_module_registry TO anon;
    GRANT EXECUTE ON FUNCTION public.get_flag_definitions TO anon;
    GRANT EXECUTE ON FUNCTION public.get_limit_definitions TO anon;
    GRANT EXECUTE ON FUNCTION public.get_capability_overrides TO anon;
    GRANT EXECUTE ON FUNCTION public.get_subdomain_route TO anon;
    GRANT EXECUTE ON FUNCTION public.get_job_counts_by_tenant TO anon;
    GRANT EXECUTE ON FUNCTION public.get_owner_module_catalog TO anon;
    
    -- Role check helpers (used in RLS policies)
    GRANT EXECUTE ON FUNCTION public.is_admin TO anon;
    GRANT EXECUTE ON FUNCTION public.is_staff TO anon;
    
    -- Auth trigger
    GRANT EXECUTE ON FUNCTION public.handle_new_user TO anon;
    
    -- Storefront interactivity (called from server actions with app-level auth)
    GRANT EXECUTE ON FUNCTION public.update_owner_config TO anon;
    GRANT EXECUTE ON FUNCTION public.increment_chat_usage TO anon;
    GRANT EXECUTE ON FUNCTION public.record_chat_usage TO anon;
    
    -- Trigger functions (needed for table operations)
    GRANT EXECUTE ON FUNCTION public.update_updated_at_column TO anon;
    GRANT EXECUTE ON FUNCTION public.generate_module_order_number TO anon;
    GRANT EXECUTE ON FUNCTION public.log_module_order_status_change TO anon;
    GRANT EXECUTE ON FUNCTION public.update_review_helpful_count TO anon;
    GRANT EXECUTE ON FUNCTION public.update_subscription_updated_at TO anon;
    GRANT EXECUTE ON FUNCTION public.create_project_phase_for_tenant TO anon;
    GRANT EXECUTE ON FUNCTION public.update_project_phases_updated_at TO anon;
    GRANT EXECUTE ON FUNCTION public.increment_promotion_usage TO anon;
    GRANT EXECUTE ON FUNCTION public.trg_create_email_automation_config TO anon;
    
    -- Re-grant everything to authenticated (server actions use user session)
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
    
    -- Service role always has full access (no grant needed, it's superuser-like)
    
    RAISE NOTICE '✅ Phase 2b complete: Allowlisted anon function access';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Phase 2b partial: %', SQLERRM;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3: FIX RLS GAPS (tables with RLS enabled but ZERO policies)
-- ═══════════════════════════════════════════════════════════════════════════

-- feature_flags: needs service_role full access + tenant owner read
DO $$
BEGIN
    -- Drop if exists to make idempotent
    DROP POLICY IF EXISTS "ff_service_role_all" ON feature_flags;
    DROP POLICY IF EXISTS "ff_tenant_read" ON feature_flags;
    
    CREATE POLICY "ff_service_role_all" ON feature_flags
        FOR ALL TO service_role USING (true);
    
    CREATE POLICY "ff_tenant_read" ON feature_flags
        FOR SELECT TO authenticated
        USING (tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        ));
    
    RAISE NOTICE '✅ Phase 3a: feature_flags policies created';
END $$;

-- whatsapp_templates: same pattern
DO $$
BEGIN
    DROP POLICY IF EXISTS "wt_service_role_all" ON whatsapp_templates;
    DROP POLICY IF EXISTS "wt_tenant_read" ON whatsapp_templates;
    
    CREATE POLICY "wt_service_role_all" ON whatsapp_templates
        FOR ALL TO service_role USING (true);
    
    CREATE POLICY "wt_tenant_read" ON whatsapp_templates
        FOR SELECT TO authenticated
        USING (tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        ));
    
    RAISE NOTICE '✅ Phase 3b: whatsapp_templates policies created';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 4: MIGRATE PLAINTEXT SECRETS TO VAULT
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
    v_result UUID;
BEGIN
    FOR r IN
        SELECT tenant_id, medusa_url, medusa_admin_email, medusa_admin_password
        FROM config
        WHERE medusa_admin_password IS NOT NULL
          AND medusa_secret_id IS NULL
    LOOP
        -- Use the existing store_medusa_credentials RPC
        v_result := store_medusa_credentials(
            r.tenant_id,
            COALESCE(r.medusa_url, 'http://localhost:9000'),
            COALESCE(r.medusa_admin_email, 'admin@bootandstrap.com'),
            r.medusa_admin_password
        );
        RAISE NOTICE '✅ Migrated credentials for tenant % → vault secret %', r.tenant_id, v_result;
    END LOOP;
END $$;

-- Also clear any plaintext stripe webhook secrets
-- (Move to vault using store_tenant_secret)
DO $$
DECLARE
    r RECORD;
    v_result UUID;
BEGIN
    FOR r IN
        SELECT tenant_id, stripe_webhook_signing_secret
        FROM config
        WHERE stripe_webhook_signing_secret IS NOT NULL
    LOOP
        v_result := store_tenant_secret(
            r.tenant_id,
            'stripe_webhook_secret',
            r.stripe_webhook_signing_secret
        );
        -- Clear plaintext (leave a vault reference column if it exists)
        UPDATE config SET stripe_webhook_signing_secret = NULL WHERE tenant_id = r.tenant_id;
        RAISE NOTICE '✅ Migrated Stripe webhook secret for tenant % → vault secret %', r.tenant_id, v_result;
    END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    exposed_count INT;
    no_policy_count INT;
    anon_definer_count INT;
    plaintext_count INT;
BEGIN
    -- Count tables still exposed
    SELECT COUNT(*) INTO exposed_count
    FROM pg_tables t
    JOIN information_schema.table_privileges tp
      ON tp.table_name = t.tablename AND tp.table_schema = 'public'
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = false
      AND tp.grantee = 'anon'
      AND tp.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE');
    
    -- Count RLS-enabled tables with no policies
    SELECT COUNT(*) INTO no_policy_count
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public'
      );
    
    -- Count DEFINER functions callable by anon
    SELECT COUNT(*) INTO anon_definer_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE');
    
    -- Count plaintext secrets remaining
    SELECT COUNT(*) INTO plaintext_count
    FROM config
    WHERE medusa_admin_password IS NOT NULL OR stripe_webhook_signing_secret IS NOT NULL;
    
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '  SECURITY AUDIT POST-MIGRATION RESULTS';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '  Tables exposed to anon (no RLS): %', exposed_count;
    RAISE NOTICE '  Tables with RLS but no policies: %', no_policy_count;
    RAISE NOTICE '  DEFINER functions callable by anon: %', anon_definer_count;
    RAISE NOTICE '  Plaintext secrets remaining: %', plaintext_count;
    RAISE NOTICE '════════════════════════════════════════════════';
END $$;
