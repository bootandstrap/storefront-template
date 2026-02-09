-- ─── BootandStrap: Tenant Provisioning SQL ────────────────
-- Run this against your Supabase PostgreSQL to create a new tenant.
--
-- Before running, replace these placeholders:
--   __TENANT_SLUG__   → e.g., 'fresh-market'
--   __TENANT_NAME__   → e.g., 'Fresh Market'
--   __PLAN_TIER__     → 'starter' | 'pro' | 'enterprise'
--   __OWNER_EMAIL__   → e.g., 'owner@freshmarket.com'
--   __DOMAIN__        → e.g., 'freshmarket.com'
-- ───────────────────────────────────────────────────────────

BEGIN;

-- 1. Create tenant record
INSERT INTO tenants (
    slug, name, status, plan_tier, domain, owner_email, created_at
) VALUES (
    '__TENANT_SLUG__',
    '__TENANT_NAME__',
    'active',
    '__PLAN_TIER__',
    '__DOMAIN__',
    '__OWNER_EMAIL__',
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create config with sensible defaults
INSERT INTO config (
    tenant_id,
    store_name,
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

-- 3. Create feature flags (all defaults — can be customized later)
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
    true,   -- cash on delivery
    false,  -- bank transfer
    true,   -- registration
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
    true,   -- social links
    true,   -- order notes
    true,   -- address management
    false,  -- maintenance mode
    true,   -- owner panel
    true,   -- customer accounts
    true    -- order tracking
FROM tenants WHERE slug = '__TENANT_SLUG__'
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Create plan limits based on tier
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
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 50
        WHEN 'pro' THEN 200
        WHEN 'enterprise' THEN 1000
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 100
        WHEN 'pro' THEN 500
        WHEN 'enterprise' THEN 10000
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 200
        WHEN 'pro' THEN 1000
        WHEN 'enterprise' THEN 10000
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 10
        WHEN 'pro' THEN 30
        WHEN 'enterprise' THEN 100
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 5
        WHEN 'pro' THEN 15
        WHEN 'enterprise' THEN 30
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 5
        WHEN 'pro' THEN 20
        WHEN 'enterprise' THEN 100
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 5
        WHEN 'pro' THEN 15
        WHEN 'enterprise' THEN 30
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 2
        WHEN 'pro' THEN 5
        WHEN 'enterprise' THEN 20
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 1
        WHEN 'pro' THEN 3
        WHEN 'enterprise' THEN 10
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 1
        WHEN 'pro' THEN 3
        WHEN 'enterprise' THEN 10
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 3
        WHEN 'pro' THEN 10
        WHEN 'enterprise' THEN 50
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 5
        WHEN 'pro' THEN 20
        WHEN 'enterprise' THEN 100
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 200
        WHEN 'pro' THEN 1000
        WHEN 'enterprise' THEN 10000
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 1
        WHEN 'pro' THEN 3
        WHEN 'enterprise' THEN 10
    END,
    CASE '__PLAN_TIER__'
        WHEN 'starter' THEN 250
        WHEN 'pro' THEN 1000
        WHEN 'enterprise' THEN 5000
    END
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
SELECT t.slug, t.name, t.plan_tier, t.status
FROM tenants t
WHERE t.slug = '__TENANT_SLUG__';
