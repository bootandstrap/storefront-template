# Supabase Schema — `public` Schema

> Tables managed by Supabase in the `public` schema. Medusa tables also live in `public` (no separate schema). Do NOT modify Medusa-managed tables manually.

## Tables

### `profiles`
Extends `auth.users` with application-specific data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `role` | TEXT | `'customer'`, `'owner'`, `'admin'`, `'super_admin'` |
| `full_name` | TEXT | Display name |
| `avatar_url` | TEXT | Supabase Storage URL |
| `phone` | TEXT | Contact phone |
| `medusa_customer_id` | TEXT | Links to Medusa customer |
| `created_at` | TIMESTAMPTZ | Default `now()` |
| `updated_at` | TIMESTAMPTZ | Default `now()` |

### `config`
Global store configuration (single row).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Single row |
| `business_name` | TEXT | |
| `whatsapp_number` | TEXT | |
| `default_country_prefix` | TEXT | Default `'57'` (Colombia) |
| `accent_color` | TEXT | Hex color |
| `primary_color` | TEXT | Hex color |
| `secondary_color` | TEXT | Hex color |
| `logo_url` | TEXT | Supabase Storage URL |
| `language` | TEXT | Default `'es'` |
| `timezone` | TEXT | e.g. `'America/Bogota'` |
| `meta_title` | TEXT | SEO title |
| `meta_description` | TEXT | SEO description |
| `favicon_url` | TEXT | Storage URL |
| `hero_title` | TEXT | |
| `hero_subtitle` | TEXT | |
| `hero_image` | TEXT | Storage URL |
| `footer_description` | TEXT | |
| `active_languages` | TEXT[] | Default `'{en}'` — Admin Panel sets active locales |
| `active_currencies` | TEXT[] | Default `'{usd}'` — Admin Panel sets active currencies |
| `default_currency` | TEXT | Default `'usd'` — fallback currency |

### `feature_flags`
Singleton table — all features toggleable remotely. See `GEMINI.md` for complete list.

| Column | Type | Default | Controls |
|--------|------|---------|----------|
| `enable_whatsapp_checkout` | BOOLEAN | `true` | WhatsApp order method |
| `enable_online_payments` | BOOLEAN | `true` | Stripe card payment |
| `enable_cash_on_delivery` | BOOLEAN | `true` | COD payment method |
| `enable_bank_transfer` | BOOLEAN | `false` | Bank transfer method |
| `enable_user_registration` | BOOLEAN | `true` | Registration page |
| `enable_guest_checkout` | BOOLEAN | `true` | Checkout without account |
| `require_auth_to_order` | BOOLEAN | `false` | Force login for checkout |
| `enable_google_auth` | BOOLEAN | `true` | Google OAuth button |
| `enable_email_auth` | BOOLEAN | `true` | Email/password form |
| `enable_reviews` | BOOLEAN | `true` | Product reviews |
| `enable_wishlist` | BOOLEAN | `true` | Wishlist feature |
| `enable_carousel` | BOOLEAN | `true` | Homepage carousel |
| `enable_cms_pages` | BOOLEAN | `true` | Dynamic CMS pages |
| `enable_analytics` | BOOLEAN | `true` | Event tracking |
| `enable_promotions` | BOOLEAN | `true` | Discount codes |
| `enable_multi_language` | BOOLEAN | `true` | i18n support (language selector) |
| `enable_multi_currency` | BOOLEAN | `false` | Multi-currency (currency selector) |
| `enable_admin_api` | BOOLEAN | `true` | External admin API |

RLS: public read, service_role-only write.

### `plan_limits`
Singleton — enforces SaaS tier restrictions.

| Column | Type | Default |
|--------|------|---------|
| `max_products` | INTEGER | `100` |
| `max_customers` | INTEGER | `100` |
| `max_orders_month` | INTEGER | `500` |
| `max_categories` | INTEGER | `20` |
| `max_images_per_product` | INTEGER | `10` |
| `max_cms_pages` | INTEGER | `10` |
| `max_carousel_slides` | INTEGER | `10` |
| `max_admin_users` | INTEGER | `3` |
| `storage_limit_mb` | INTEGER | `500` |
| `plan_name` | TEXT | `'starter'` |
| `plan_expires_at` | TIMESTAMPTZ | `NULL` |
| `max_languages` | INTEGER | `1` |
| `max_currencies` | INTEGER | `1` |

RLS: public read, service_role-only write.

### `whatsapp_templates`
Stored message templates for WhatsApp checkout.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default `gen_random_uuid()` |
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
| `event_type` | TEXT | `page_view`, `product_view`, `add_to_cart`, etc. |
| `user_id` | UUID | FK → `auth.users(id)`, nullable |
| `metadata` | JSONB | Event-specific data |
| `created_at` | TIMESTAMPTZ | |

## RLS Policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Own row | Trigger only | Own row | — |
| `config` | Public | service_role | service_role | — |
| `feature_flags` | Public | service_role | service_role | — |
| `plan_limits` | Public | service_role | service_role | — |
| `whatsapp_templates` | Public | service_role | service_role | service_role |
| `cms_pages` | Public (published) | service_role | service_role | service_role |
| `carousel_slides` | Public (active) | `is_admin()` | `is_admin()` | `is_admin()` |
| `analytics_events` | `is_admin()` | Authenticated | — | — |

## Triggers

| Trigger | On | Action |
|---------|-----|--------|
| `on_auth_user_created` | `auth.users` INSERT | Creates `profiles` row |
| `on_profile_updated` | `profiles` UPDATE | Sets `updated_at = now()` |

## Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `is_admin()` | BOOLEAN | Checks current user has admin/super_admin role |
