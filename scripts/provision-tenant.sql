-- ─── BootandStrap: Tenant Provisioning SQL ────────────────
-- Run this against your Supabase PostgreSQL to create a new tenant.
--
-- Before running, replace these placeholders:
--   __TENANT_SLUG__   → e.g., 'fresh-market'
--   __TENANT_NAME__   → e.g., 'Fresh Market'
--   __PLAN_TIER__     → 'starter' | 'pro' | 'enterprise'
--   __DOMAIN__        → e.g., 'freshmarket.com' (or NULL)
--
-- Column names aligned with:
--   - TenantRow in BOOTANDSTRAP_WEB/src/lib/governance/tenants.ts
--   - StoreConfig in apps/storefront/src/lib/config.ts
--   - PLAN_LIMIT_PRESETS in BOOTANDSTRAP_WEB/src/lib/governance/plan-presets.ts
--   - FLAG_PRESETS in BOOTANDSTRAP_WEB/src/lib/governance/plan-presets.ts
--
-- Last updated: 2026-02-14 (Fase 5 — 38 flags, 19 limits)
-- ───────────────────────────────────────────────────────────

BEGIN;

-- 1. Create tenant record
INSERT INTO tenants (
    slug, name, status, plan_tier, domain, created_at, updated_at
) VALUES (
    '__TENANT_SLUG__',
    '__TENANT_NAME__',
    'active',
    '__PLAN_TIER__',
    '__DOMAIN__',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create config with sensible defaults
INSERT INTO config (
    tenant_id,
    business_name,
    language,
    color_preset,
    theme_mode,
    active_languages,
    active_currencies,
    default_currency,
    whatsapp_number,
    social_instagram,
    social_facebook,
    created_at,
    updated_at
)
SELECT
    id,
    '__TENANT_NAME__',
    'es',
    'nature',
    'light',
    '{es}',
    '{eur}',
    'EUR',
    '',
    '',
    '',
    NOW(),
    NOW()
FROM tenants WHERE slug = '__TENANT_SLUG__'
ON CONFLICT (tenant_id) DO NOTHING;

-- 3. Create feature flags (all 38 flags — defaults shown are for starter)
--    For pro/enterprise, adjust manually or use the SuperAdmin Panel
INSERT INTO feature_flags (
    tenant_id,
    -- Payment & checkout
    enable_whatsapp_checkout,
    enable_online_payments,
    enable_cash_on_delivery,
    enable_bank_transfer,
    enable_guest_checkout,
    require_auth_to_order,
    -- Auth
    enable_user_registration,
    enable_google_auth,
    enable_email_auth,
    -- Commerce features
    enable_reviews,
    enable_wishlist,
    enable_carousel,
    enable_cms_pages,
    enable_product_search,
    enable_analytics,
    enable_promotions,
    enable_related_products,
    enable_product_comparisons,
    enable_product_badges,
    -- Communication
    enable_whatsapp_contact,
    enable_social_links,
    enable_order_notes,
    enable_newsletter,
    enable_live_chat,
    enable_chatbot,
    -- i18n
    enable_multi_language,
    enable_multi_currency,
    -- Platform
    enable_admin_api,
    enable_address_management,
    enable_owner_panel,
    enable_customer_accounts,
    enable_order_tracking,
    enable_cookie_consent,
    enable_stock_notifications,
    enable_maintenance_mode,
    -- Rollout
    owner_lite_enabled,
    owner_advanced_modules_enabled
)
SELECT
    id,
    -- Payment & checkout
    true,   -- whatsapp_checkout
    false,  -- online_payments
    false,  -- cash_on_delivery
    false,  -- bank_transfer
    true,   -- guest_checkout
    false,  -- require_auth_to_order
    -- Auth
    false,  -- user_registration (starter: disabled)
    false,  -- google_auth
    true,   -- email_auth
    -- Commerce features
    false,  -- reviews
    false,  -- wishlist
    true,   -- carousel
    false,  -- cms_pages
    true,   -- product_search
    false,  -- analytics
    false,  -- promotions
    true,   -- related_products
    false,  -- product_comparisons
    true,   -- product_badges
    -- Communication
    true,   -- whatsapp_contact
    false,  -- social_links
    false,  -- order_notes
    false,  -- newsletter
    false,  -- live_chat
    false,  -- chatbot
    -- i18n
    false,  -- multi_language
    false,  -- multi_currency
    -- Platform
    false,  -- admin_api
    false,  -- address_management
    false,  -- owner_panel
    false,  -- customer_accounts
    false,  -- order_tracking
    true,   -- cookie_consent
    false,  -- stock_notifications
    false,  -- maintenance_mode
    -- Rollout
    false,  -- owner_lite_enabled
    false   -- owner_advanced_modules_enabled
FROM tenants WHERE slug = '__TENANT_SLUG__'
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Create plan limits (all 19 limit fields)
INSERT INTO plan_limits (
    tenant_id,
    plan_name,
    max_products,
    max_customers,
    max_orders_month,
    max_categories,
    max_images_per_product,
    max_cms_pages,
    max_carousel_slides,
    max_admin_users,
    max_languages,
    max_currencies,
    max_whatsapp_templates,
    max_file_upload_mb,
    max_email_sends_month,
    max_custom_domains,
    storage_limit_mb,
    max_badges,
    max_newsletter_subscribers,
    max_api_calls_day,
    max_chatbot_messages_month
)
SELECT
    id,
    '__PLAN_TIER__',
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 25 WHEN 'pro' THEN 100 WHEN 'enterprise' THEN 1000 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 5000 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 5000 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 5 WHEN 'pro' THEN 20 WHEN 'enterprise' THEN 100 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 20 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 50 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 20 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 1 WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 10 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 1 WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 5 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 1 WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 5 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 50 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 2 WHEN 'pro' THEN 5 WHEN 'enterprise' THEN 10 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 5000 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 0 WHEN 'pro' THEN 1 WHEN 'enterprise' THEN 5 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 2000 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 50 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 1000 WHEN 'enterprise' THEN 10000 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 1000 WHEN 'enterprise' THEN 10000 END,
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 0 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 5000 END
FROM tenants WHERE slug = '__TENANT_SLUG__'
ON CONFLICT (tenant_id) DO NOTHING;

-- 5. Create default WhatsApp template
INSERT INTO whatsapp_templates (
    tenant_id,
    name,
    template
)
SELECT
    id,
    'order_confirmation',
    '🛒 *Nuevo Pedido — {{store_name}}*

{{#each items}}
• {{name}} x{{qty}} — {{price}}
{{/each}}

💰 *Total: {{total}}*
📦 Envío: {{shipping}}
📍 {{address}}

🙏 ¡Gracias por tu compra!'
FROM tenants WHERE slug = '__TENANT_SLUG__'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT t.slug, t.name, t.status, t.plan_tier
FROM tenants t
WHERE t.slug = '__TENANT_SLUG__';
