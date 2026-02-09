# Supabase Schema — `public` Schema

> Tables managed by Supabase in the `public` schema. Medusa tables also live in `public` (no separate schema). Do NOT modify Medusa-managed tables manually.
>
> **Last updated**: 9 Feb 2026 — reflects `20260209_multi_tenant_foundation.sql` migration.

## Tables

### `tenants`
Multi-tenant root table. Each client deployment gets one row.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default `gen_random_uuid()` |
| `slug` | TEXT UNIQUE NOT NULL | e.g. `'campifrut'` |
| `name` | TEXT NOT NULL | Display name |
| `domain` | TEXT | e.g. `'campifrut.com'` |
| `status` | TEXT | `'active'`, `'paused'`, `'suspended'`, `'trial'` |
| `created_at` | TIMESTAMPTZ | Default `now()` |
| `updated_at` | TIMESTAMPTZ | Default `now()` |

RLS: Only `super_admin` has full access.

### `profiles`
Extends `auth.users` with application-specific data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `tenant_id` | UUID | FK → `tenants(id)` ON DELETE SET NULL |
| `role` | TEXT | `'customer'`, `'owner'`, `'admin'`, `'super_admin'` |
| `full_name` | TEXT | Display name |
| `avatar_url` | TEXT | Supabase Storage URL |
| `phone` | TEXT | Contact phone |
| `medusa_customer_id` | TEXT | Links to Medusa customer |
| `created_at` | TIMESTAMPTZ | Default `now()` |
| `updated_at` | TIMESTAMPTZ | Default `now()` |

### `config`
Store configuration (one row per tenant).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID | FK → `tenants(id)` ON DELETE CASCADE |
| **Branding** | | |
| `business_name` | TEXT | |
| `logo_url` | TEXT | Supabase Storage URL |
| `favicon_url` | TEXT | Storage URL |
| `color_preset` | TEXT | `'nature'`/`'ocean'`/`'sunset'`/`'berry'`/`'monochrome'`/`'custom'` |
| `theme_mode` | TEXT | `'light'`/`'dark'`/`'auto'` |
| `accent_color` | TEXT | Hex color |
| `primary_color` | TEXT | Hex color |
| `secondary_color` | TEXT | Hex color |
| `custom_css` | TEXT | Custom CSS injection |
| **Storefront Content** | | |
| `hero_title` | TEXT | |
| `hero_subtitle` | TEXT | |
| `hero_image` | TEXT | Storage URL |
| `hero_cta_text` | TEXT | |
| `hero_cta_link` | TEXT | |
| `footer_description` | TEXT | |
| `announcement_bar_text` | TEXT | |
| `announcement_bar_enabled` | BOOLEAN | Default `false` |
| **Contact & Social** | | |
| `whatsapp_number` | TEXT | |
| `default_country_prefix` | TEXT | Default `'57'` |
| `store_email` | TEXT | |
| `store_phone` | TEXT | |
| `store_address` | TEXT | |
| `social_facebook` | TEXT | |
| `social_instagram` | TEXT | |
| `social_tiktok` | TEXT | |
| `social_twitter` | TEXT | |
| **Business Settings** | | |
| `language` | TEXT | Default `'es'` |
| `timezone` | TEXT | e.g. `'America/Bogota'` |
| `min_order_amount` | INTEGER | Default `0` (cents) |
| `max_delivery_radius_km` | INTEGER | |
| `business_hours` | JSONB | |
| `delivery_info_text` | TEXT | |
| **Bank Details** | | |
| `bank_name` | TEXT | |
| `bank_account_type` | TEXT | |
| `bank_account_number` | TEXT | |
| `bank_account_holder` | TEXT | |
| `bank_id_number` | TEXT | |
| **i18n / Currency** | | |
| `active_languages` | TEXT[] | Default `'{en}'` |
| `active_currencies` | TEXT[] | Default `'{usd}'` |
| `default_currency` | TEXT | Default `'usd'` |
| **SEO** | | |
| `meta_title` | TEXT | |
| `meta_description` | TEXT | |
| **Tracking** | | |
| `google_analytics_id` | TEXT | |
| `facebook_pixel_id` | TEXT | |

### `feature_flags`
Per-tenant feature toggles. All features remotely toggleable.

| Column | Type | Default | Controls |
|--------|------|---------|----------|
| `tenant_id` | UUID | — | FK → `tenants(id)` |
| **Payment Methods** | | | |
| `enable_whatsapp_checkout` | BOOLEAN | `true` | WhatsApp order method |
| `enable_online_payments` | BOOLEAN | `true` | Stripe card payment |
| `enable_cash_on_delivery` | BOOLEAN | `true` | COD payment method |
| `enable_bank_transfer` | BOOLEAN | `false` | Bank transfer method |
| **Auth** | | | |
| `enable_user_registration` | BOOLEAN | `true` | Registration page |
| `enable_guest_checkout` | BOOLEAN | `true` | Checkout without account |
| `require_auth_to_order` | BOOLEAN | `false` | Force login for checkout |
| `enable_google_auth` | BOOLEAN | `true` | Google OAuth button |
| `enable_email_auth` | BOOLEAN | `true` | Email/password form |
| `enable_customer_accounts` | BOOLEAN | `true` | Customer account area |
| **Features** | | | |
| `enable_reviews` | BOOLEAN | `true` | Product reviews |
| `enable_wishlist` | BOOLEAN | `true` | Wishlist feature |
| `enable_carousel` | BOOLEAN | `true` | Homepage carousel |
| `enable_cms_pages` | BOOLEAN | `true` | Dynamic CMS pages |
| `enable_analytics` | BOOLEAN | `true` | Event tracking |
| `enable_promotions` | BOOLEAN | `true` | Discount codes |
| `enable_product_search` | BOOLEAN | `true` | Product search bar |
| `enable_order_notes` | BOOLEAN | `true` | Notes field at checkout |
| `enable_order_tracking` | BOOLEAN | `true` | Order status tracking |
| `enable_social_links` | BOOLEAN | `true` | Social media links in footer |
| `enable_address_management` | BOOLEAN | `true` | Customer address CRUD |
| **Admin** | | | |
| `enable_multi_language` | BOOLEAN | `true` | i18n (language selector) |
| `enable_multi_currency` | BOOLEAN | `false` | Multi-currency (currency selector) |
| `enable_admin_api` | BOOLEAN | `true` | External admin API |
| `enable_owner_panel` | BOOLEAN | `true` | Owner panel access |
| `enable_maintenance_mode` | BOOLEAN | `false` | Maintenance mode page |

RLS: public read, service_role-only write. Tenant-isolated via `tenant_id`.

### `plan_limits`
Per-tenant SaaS tier enforcement.

| Column | Type | Default |
|--------|------|---------|
| `tenant_id` | UUID | FK → `tenants(id)` |
| `plan_name` | TEXT | `'starter'` |
| `plan_expires_at` | TIMESTAMPTZ | `NULL` |
| `max_products` | INTEGER | `100` |
| `max_customers` | INTEGER | `100` |
| `max_orders_month` | INTEGER | `500` |
| `max_categories` | INTEGER | `20` |
| `max_images_per_product` | INTEGER | `10` |
| `max_cms_pages` | INTEGER | `10` |
| `max_carousel_slides` | INTEGER | `10` |
| `max_admin_users` | INTEGER | `3` |
| `storage_limit_mb` | INTEGER | `500` |
| `max_languages` | INTEGER | `1` |
| `max_currencies` | INTEGER | `1` |
| `max_whatsapp_templates` | INTEGER | `5` |
| `max_file_upload_mb` | INTEGER | `5` |
| `max_email_sends_month` | INTEGER | `500` |
| `max_custom_domains` | INTEGER | `1` |

RLS: public read, service_role-only write.

### `whatsapp_templates`
Stored message templates for WhatsApp checkout.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default `gen_random_uuid()` |
| `tenant_id` | UUID | FK → `tenants(id)` |
| `name` | TEXT | e.g. "Pedido estándar" |
| `template` | TEXT | Template with `{{var}}` + `{{#each}}` syntax |
| `is_default` | BOOLEAN | Only one should be `true` |
| `variables` | JSONB | Available vars: `["items", "total", "customer_name", ...]` |
| `created_at` | TIMESTAMPTZ | |

RLS: public read, service_role-only write.

### `cms_pages`
Dynamic content pages.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID | FK → `tenants(id)` |
| `slug` | TEXT UNIQUE | URL path |
| `title` | TEXT | |
| `body` | TEXT | Content (markdown or HTML) |
| `published` | BOOLEAN | Default `false` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

RLS: public read (published only), service_role write.

### `carousel_slides`
Homepage hero carousel.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID | FK → `tenants(id)` |
| `type` | TEXT | `'product'`, `'image'`, `'offer'` |
| `medusa_product_id` | TEXT | Reference to Medusa product |
| `image` | TEXT | Storage URL |
| `title` | TEXT | |
| `subtitle` | TEXT | |
| `cta_text` | TEXT | |
| `cta_url` | TEXT | |
| `sort_order` | INTEGER | |
| `active` | BOOLEAN | Default `true` |

### `analytics_events`
High-resolution event tracking.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID | FK → `tenants(id)` |
| `event_type` | TEXT | `page_view`, `product_view`, `add_to_cart`, `order_placed`, etc. |
| `user_id` | UUID | FK → `auth.users(id)`, nullable |
| `metadata` | JSONB | Event-specific data |
| `created_at` | TIMESTAMPTZ | |

## RLS Policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `tenants` | super_admin | super_admin | super_admin | super_admin |
| `profiles` | Own row | Trigger only | Own row | — |
| `config` | Public | super_admin/owner (tenant) | super_admin/owner (tenant) | — |
| `feature_flags` | Public | service_role | service_role | — |
| `plan_limits` | Public | service_role | service_role | — |
| `whatsapp_templates` | Public | service_role | service_role | service_role |
| `cms_pages` | Public (published) | service_role | service_role | service_role |
| `carousel_slides` | Public (active) | `is_admin()` | `is_admin()` | `is_admin()` |
| `analytics_events` | `is_admin()` | Authenticated | — | — |

## Indexes

| Index | Table | Column |
|-------|-------|--------|
| `idx_config_tenant` | `config` | `tenant_id` |
| `idx_feature_flags_tenant` | `feature_flags` | `tenant_id` |
| `idx_plan_limits_tenant` | `plan_limits` | `tenant_id` |
| `idx_carousel_slides_tenant` | `carousel_slides` | `tenant_id` |
| `idx_whatsapp_templates_tenant` | `whatsapp_templates` | `tenant_id` |
| `idx_cms_pages_tenant` | `cms_pages` | `tenant_id` |
| `idx_analytics_events_tenant` | `analytics_events` | `tenant_id` |
| `idx_profiles_tenant` | `profiles` | `tenant_id` |

## Triggers

| Trigger | On | Action |
|---------|-----|--------|
| `on_auth_user_created` | `auth.users` INSERT | Creates `profiles` row |
| `on_profile_updated` | `profiles` UPDATE | Sets `updated_at = now()` |

## Functions

| Function | Returns | Purpose |
|----------|---------|---------||
| `is_admin()` | BOOLEAN | Checks current user has admin/super_admin role |
