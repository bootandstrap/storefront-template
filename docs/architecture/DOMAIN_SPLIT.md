# Domain Split — What Lives Where

## The Golden Rule

> **Medusa** handles anything related to the **commercial transaction** (catalog → cart → checkout → order → fulfillment).
> **Supabase** handles everything **around** the transaction (auth, governance, config, CMS, analytics, storage).

## Complete Domain Matrix

| Domain | System | Schema | Reason |
|--------|--------|--------|--------|
| **Products & Variants** | Medusa | `public` | Native product model with options, variants, pricing |
| **Collections / Categories** | Medusa | `public` | Hierarchical product grouping |
| **Inventory & Stock** | Medusa | `public` | Location-based stock, reservations |
| **Pricing & Currencies** | Medusa | `public` | Price lists, region-based, multi-currency |
| **Cart & Line Items** | Medusa | `public` | Server-validated cart with price snapshots |
| **Checkout & Payments** | Medusa | `public` | Stripe integration, payment sessions |
| **Orders & Fulfillment** | Medusa | `public` | Order lifecycle, fulfillment tracking |
| **Returns & Refunds** | Medusa | `public` | Return requests, Stripe refunds |
| **Promotions & Discounts** | Medusa | `public` | Rule-based promotions, discount codes |
| **Shipping** | Medusa | `public` | Shipping profiles, flat rate |
| | | | |
| **Authentication** | Supabase | `auth` | OAuth, email/password, session management |
| **User Profiles** | Supabase | `public` | Role, name, avatar, medusa_customer_id |
| **Store Config** | Supabase | `public` | Colors, branding, hero content |
| **Feature Flags** | Supabase | `public` | Payment methods, auth providers, all features |
| **Plan Limits** | Supabase | `public` | Module governance enforcement |
| **WhatsApp Templates** | Supabase | `public` | Editable message templates |
| **CMS Pages** | Supabase | `public` | Dynamic content pages |
| **Carousel / Hero** | Supabase | `public` | Homepage slides |
| **Analytics Events** | Supabase | `public` | Page views, conversions, funnels |
| **Media / Images** | Supabase Storage | — | Product images, CMS media, avatars |
| **i18n / Dictionaries** | Storefront (filesystem) | — | 5 locale JSON files (en/es/de/fr/it), loaded at request time |
| **Language / Currency Config** | Supabase | `public` | `active_languages[]`, `active_currencies[]`, `default_currency` in `config` |

## Data Flow Between Systems

```
Medusa (public schema)              Supabase (public schema)
──────────────────────              ────────────────────────
products ◄───────────────────────── Supabase Storage (images)
orders ─────────────────────────►   analytics_events
cart ────────────────────────────►   whatsapp_templates (build msg)
                                    config ──► Next.js (dynamic theme)
                                    feature_flags ──► Next.js (toggle UI)
                                    plan_limits ──► Next.js + Medusa (enforce)
                                    profiles ◄── auth.users (trigger)
```

## Cross-System References

- **User linking**: `profiles.medusa_customer_id` links Supabase user to Medusa customer
- **Image URLs**: Medusa product images → Supabase Storage public CDN URLs
- **Order analytics**: Medusa subscriber `order.placed` → Supabase `analytics_events`
- **Config reads**: Next.js reads `config` + `feature_flags` + `plan_limits` from Supabase
- **WhatsApp messages**: Cart data from Medusa + template from Supabase → WhatsApp URL

## When to Query Which System

| From Next.js | Query... |
|-------------|----------|
| Show products | Medusa API (`/store/products`) |
| Product details | Medusa API (`/store/products/:id`) |
| Manage cart | Medusa API (`/store/carts`) |
| Process checkout | Medusa API (`/store/carts/:id/complete`) |
| Store config (colors, branding) | Supabase (`config`) |
| Feature flags | Supabase (`feature_flags`) |
| Plan limits | Supabase (`plan_limits`) |
| WhatsApp template | Supabase (`whatsapp_templates`) |
| CMS page content | Supabase (`cms_pages`) |
| Carousel slides | Supabase (`carousel_slides`) |
| Track analytics | Supabase (`analytics_events`) |
| Upload image | Supabase Storage |
| Auth operations | Supabase Auth |
| i18n dictionaries | Storefront filesystem (`lib/dictionaries/{locale}.json`) |
| Active languages/currencies | Supabase (`config.active_languages`, `config.active_currencies`) |
