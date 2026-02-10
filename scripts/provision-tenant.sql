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
--   - TenantRow in bootandstrap-admin/src/lib/tenants.ts
--   - StoreConfig in apps/storefront/src/lib/config.ts
--   - PLAN_LIMIT_PRESETS in bootandstrap-admin/src/lib/plan-presets.ts
-- ───────────────────────────────────────────────────────────

BEGIN;

-- 1. Create tenant record
INSERT INTO tenants (
    slug, name, status, domain, created_at, updated_at
) VALUES (
    '__TENANT_SLUG__',
    '__TENANT_NAME__',
    'active',
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
    whatsapp_phone,
    social_instagram,
    social_facebook,
    created_at
)
SELECT
    id,
    '__TENANT_NAME__',
    'es',
    'nature',
    'light',
    '{es}',
    '{usd}',
    'usd',
    '',
    '',
    '',
    NOW()
FROM tenants WHERE slug = '__TENANT_SLUG__'
ON CONFLICT (tenant_id) DO NOTHING;

-- 3. Create feature flags (starter defaults — customize later or use Admin Panel)
INSERT INTO feature_flags (
    tenant_id,
    enable_whatsapp_checkout,
    enable_online_payments,
    enable_cash_on_delivery,
    enable_bank_transfer,
    enable_user_registration,
    enable_guest_checkout,
    require_auth_to_order,
    enable_google_auth,
    enable_email_auth,
    enable_reviews,
    enable_wishlist,
    enable_carousel,
    enable_cms_pages,
    enable_product_search,
    enable_analytics,
    enable_promotions,
    enable_multi_language,
    enable_multi_currency,
    enable_admin_api,
    enable_social_links,
    enable_order_notes,
    enable_address_management,
    enable_maintenance_mode,
    enable_owner_panel,
    enable_customer_accounts,
    enable_order_tracking
)
SELECT
    id,
    true,   -- whatsapp
    false,  -- online payments (enable after Stripe setup)
    false,  -- cash on delivery
    false,  -- bank transfer
    false,  -- registration (starter: disabled)
    true,   -- guest checkout
    false,  -- require auth
    false,  -- google auth (enable after OAuth setup)
    true,   -- email auth
    false,  -- reviews
    false,  -- wishlist
    true,   -- carousel
    false,  -- cms pages
    true,   -- product search
    false,  -- analytics
    false,  -- promotions
    false,  -- multi language
    false,  -- multi currency
    false,  -- admin api
    false,  -- social links (starter: disabled)
    false,  -- order notes (starter: disabled)
    false,  -- address management (starter: disabled)
    false,  -- maintenance mode
    false,  -- owner panel (starter: disabled)
    false,  -- customer accounts (starter: disabled)
    false   -- order tracking (starter: disabled)
FROM tenants WHERE slug = '__TENANT_SLUG__'
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Create plan limits (values match PLAN_LIMIT_PRESETS in plan-presets.ts)
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
    storage_limit_mb
)
SELECT
    id,
    '__PLAN_TIER__',
    -- max_products
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 25 WHEN 'pro' THEN 100 WHEN 'enterprise' THEN 1000 END,
    -- max_customers
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 5000 END,
    -- max_orders_month
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 5000 END,
    -- max_categories
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 5 WHEN 'pro' THEN 20 WHEN 'enterprise' THEN 100 END,
    -- max_images_per_product
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 20 END,
    -- max_cms_pages
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 50 END,
    -- max_carousel_slides
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 20 END,
    -- max_admin_users
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 1 WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 10 END,
    -- max_languages
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 1 WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 5 END,
    -- max_currencies
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 1 WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 5 END,
    -- max_whatsapp_templates
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 WHEN 'enterprise' THEN 50 END,
    -- max_file_upload_mb
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 2 WHEN 'pro' THEN 5 WHEN 'enterprise' THEN 10 END,
    -- max_email_sends_month
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 5000 END,
    -- max_custom_domains
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 0 WHEN 'pro' THEN 1 WHEN 'enterprise' THEN 5 END,
    -- storage_limit_mb
    CASE '__PLAN_TIER__' WHEN 'starter' THEN 100 WHEN 'pro' THEN 500 WHEN 'enterprise' THEN 2000 END
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
SELECT t.slug, t.name, t.status
FROM tenants t
WHERE t.slug = '__TENANT_SLUG__';
