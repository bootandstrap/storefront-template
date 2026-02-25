# Template Usage Guide — Deploying for a New Client

> **Audience**: BootandStrap superadmin / developer
> **Last updated**: 14 Feb 2026
> **Model**: Multitenant — each client gets a `tenant_id` in the shared Supabase instance

This guide walks through deploying a new instance of the BootandStrap e-commerce template for a client. The entire process can be completed in under 2 hours.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Template repo** | Access to [bootandstrap/bootandstrap-ecommerce](https://github.com/bootandstrap/bootandstrap-ecommerce) |
| **VPS** | Contabo VPS with Dokploy installed (or equivalent Docker host) |
| **Supabase account** | Free tier is sufficient for most clients |
| **Stripe account** | Client's own Stripe account (or BootandStrap's for testing) |
| **Domain** | Client's domain with DNS access |
| **Node.js 20+** | For local development and build |
| **pnpm 9+** | Package manager |
| **Docker** | For Redis in local dev and production deployment |

---

## Step 1: Clone & Configure Repository

```bash
# Clone the template
git clone https://github.com/bootandstrap/bootandstrap-ecommerce.git client-name
cd client-name

# Remove git history and start fresh
rm -rf .git
git init

# Install dependencies
pnpm install
```

---

## Step 2: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project (choose region closest to client)
3. Note down:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service role key** → `SUPABASE_SERVICE_ROLE_KEY`
   - **Database URL** (pooler mode: transaction) → `DATABASE_URL`

### Apply Schema Migrations

The template includes all required migrations. Apply them via the Supabase SQL editor or MCP tools:

Migrations are stored as Supabase migration records. The key tables created are:

| Table | Purpose |
|-------|---------|
| `tenants` | Tenant registry (id, name, slug, domain, status, plan) |
| `config` | Store branding, hero content, delivery, socials, Medusa creds (per `tenant_id`) |
| `feature_flags` | 34+ toggleable feature flags (per `tenant_id`) |
| `plan_limits` | Module governance enforcement — products, customers, orders (per `tenant_id`) |
| `profiles` | User profiles with `role` + `tenant_id` + `medusa_customer_id` |
| `whatsapp_templates` | Editable WhatsApp message templates (per `tenant_id`) |
| `cms_pages` | Dynamic content pages (per `tenant_id`) |
| `carousel_slides` | Homepage hero carousel (per `tenant_id`) |
| `analytics_events` | Page views and conversion tracking |
| `tenant_errors` | Error Inbox — per-tenant error log |
| `stripe_webhook_events` | Idempotent webhook deduplication |
| `audit_log` | Mutation audit trail for admin operations |

### Configure Auth Providers

1. **Email/Password**: Enabled by default in Supabase
2. **Google OAuth** (optional):
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
   - Add redirect URL: `https://YOUR_SUPABASE_URL/auth/v1/callback`
   - Configure in Supabase Auth → Providers → Google

---

## Step 3: Configure Environment Variables

Copy the template and fill in client-specific values:

```bash
cp .env.example .env
```

### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# Medusa
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx  # Created after first Medusa boot
COOKIE_SECRET=generate-a-random-string
JWT_SECRET=generate-another-random-string

# Stripe (optional — leave empty to disable)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Resend Email (optional)
RESEND_API_KEY=re_xxx

# Production
NEXT_PUBLIC_STORE_URL=https://clientdomain.com
REVALIDATE_SECRET=generate-another-random-string
```

---

## Step 4: Initialize Medusa

```bash
# Run database migrations
cd apps/medusa && npx medusa db:migrate && cd ../..

# Start Medusa to create the publishable API key
cd apps/medusa && pnpm dev
# → Visit http://localhost:9000/app
# → Create admin user
# → Create publishable API key → add to .env as NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
```

---

## Step 5: Customize Branding (Zero Code Changes)

All branding is controlled via the `config` table in Supabase. Update these values:

```sql
-- ⚠️ All queries must be scoped by tenant_id.
-- Replace <TENANT_ID> with the tenant's UUID from the `tenants` table.
UPDATE config SET
  business_name = 'Client Store Name',
  business_description = 'Short description for SEO',
  language = 'es',               -- Default locale
  
  -- Hero section
  hero_title = 'Welcome to Our Store',
  hero_subtitle = 'Fresh products delivered to your door',
  
  -- Contact
  whatsapp_number = '+34612345678',
  store_email = 'hello@clientdomain.com',
  
  -- Theme (pick a preset or use 'custom')
  color_preset = 'nature',       -- nature | ocean | sunset | berry | monochrome | custom
  theme_mode = 'light',          -- light | dark | auto
  
  -- i18n
  active_languages = '{es}',     -- Which locales are available
  active_currencies = '{eur}',   -- Which currencies are available
  default_currency = 'eur'
WHERE tenant_id = '<TENANT_ID>';
```

### Color Presets

| Preset | Primary | Character |
|--------|---------|-----------|
| `nature` | Green tones | Fresh, organic, health |
| `ocean` | Blue tones | Calm, professional, trustworthy |
| `sunset` | Warm orange/coral | Energetic, inviting, warm |
| `berry` | Purple/magenta | Luxury, creative, bold |
| `monochrome` | Gray/black/white | Minimal, modern, elegant |
| `custom` | Set your own | Full control via config columns |

---

## Step 6: Configure Feature Flags

Enable/disable features per client. All flags default to sensible values, but adjust based on the client's plan:

```sql
-- Example: Client uses WhatsApp + Bank Transfer, no Stripe
UPDATE feature_flags SET
  enable_whatsapp_checkout = true,
  enable_bank_transfer = true,
  enable_online_payments = false,   -- Disables Stripe
  enable_cash_on_delivery = false,
  enable_user_registration = true,
  enable_guest_checkout = true,
  enable_google_auth = false,       -- Email-only auth
  enable_carousel = true,
  enable_multi_language = false,    -- Single language
  enable_multi_currency = false,    -- Single currency
  enable_owner_panel = true,        -- Give owner self-service
  owner_lite_enabled = true,        -- Essential panel modules
  owner_advanced_modules_enabled = false  -- Advanced modules off
WHERE tenant_id = '<TENANT_ID>';
```

---

## Step 7: Set Plan Limits

Control resource usage based on the client's active modules:

```sql
-- Example: Starter plan
UPDATE plan_limits SET
  max_products = 50,
  max_customers = 200,
  max_orders_month = 300,
  max_categories = 10,
  max_images_per_product = 5,
  max_cms_pages = 5,
  max_carousel_slides = 5,
  max_admin_users = 2,
  max_languages = 1,
  max_currencies = 1,
  storage_limit_mb = 250
WHERE tenant_id = '<TENANT_ID>';
```

---

## Step 8: Seed Products (Optional)

If migrating from the E-Commerce Template seed, replace with client products:

```bash
# Option A: Use Medusa Admin UI (recommended for clients)
# Visit http://localhost:9000/app → Products → Add Product

# Option B: Custom seed script
# Edit apps/medusa/src/scripts/seed.ts with client products
cd apps/medusa && npx medusa exec ./src/scripts/seed.ts && cd ../..
```

---

## Automated Provisioning (Alternative)

For faster client setup, use the provisioning scripts:

```bash
# Interactive wizard — generates .env, Docker Compose, and outputs next steps
./scripts/provision-client.sh

# Or generate .env non-interactively from config.json (for CI)
./scripts/generate-env.sh <client-slug>

# Then provision tenant in Supabase
# Edit scripts/provision-tenant.sql with client details, then run:
psql $DATABASE_URL < scripts/provision-tenant.sql
```

See [CLIENT_HANDOFF.md](../operations/CLIENT_HANDOFF.md) for the full handoff checklist.

> **Note**: The SuperAdmin panel at BOOTANDSTRAP_WEB (`/app/tenants/new`) provides automated tenant provisioning with config presets, which handles Steps 2–7 automatically.

---

## Step 9: Deploy to Production

### Dokploy on Contabo VPS

1. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/bootandstrap/client-name.git
   git push -u origin main
   ```

2. **Configure Dokploy**:
   - Connect GitHub repo
   - Set build method: Docker Compose
   - Upload `.env` via Dokploy secrets panel
   - Configure domains:
     - `clientdomain.com` → storefront:3000
     - `api.clientdomain.com` → medusa-server:9000
   - Enable SSL (Let's Encrypt auto-provisioning)
   - Set deploy hooks → auto-deploy on push to `main`

3. **First deploy**:
   ```bash
   git push main
   # Dokploy handles: pull → build → Docker Compose → health checks → go live
   ```

### DNS Configuration

| Record | Type | Value |
|--------|------|-------|
| `@` / `clientdomain.com` | A | VPS IP |
| `api.clientdomain.com` | A | VPS IP |
| `www.clientdomain.com` | CNAME | `clientdomain.com` |

---

## Step 10: Post-Deploy Verification

| Check | How |
|-------|-----|
| Storefront loads | Visit `https://clientdomain.com` |
| Products visible | Homepage shows featured products |
| Theme applied | Colors match chosen preset |
| Cart works | Add product → cart drawer opens |
| Auth works | Register → login → account page |
| WhatsApp works | Checkout → WhatsApp opens with formatted message |
| SSL valid | `https://` green lock |
| Admin accessible | `https://api.clientdomain.com/app` |
| Health check | `https://clientdomain.com/api/health` returns 200 |

---

## Client Handoff

After deployment, the client manages their store via:

| Task | Where |
|------|-------|
| Add/edit products | Medusa Admin (`api.clientdomain.com/app`) |
| View/fulfill orders | Medusa Admin |
| Edit WhatsApp templates | Owner Panel (when Phase 8 is complete) |
| Manage carousel | Owner Panel (when Phase 8 is complete) |
| Edit CMS pages | Owner Panel (when Phase 8 is complete) |

Until the Owner Panel is enabled (`enable_owner_panel = true` in feature flags), configuration changes require direct Supabase access by BootandStrap.

---

## Module Governance (Recommended)

| Feature | Starter | Growth | Pro |
|---------|---------|--------|-----|
| Products | 50 | 200 | Unlimited |
| Customers | 200 | 1,000 | Unlimited |
| Orders/month | 300 | 2,000 | Unlimited |
| Languages | 1 | 3 | 5 |
| Currencies | 1 | 2 | 5 |
| Storage | 250 MB | 1 GB | 5 GB |
| CMS pages | 5 | 15 | Unlimited |
| Payment methods | WhatsApp + 1 | All | All |
| Custom theme | Presets only | Presets + custom | Full custom |
| Analytics | Basic | Full | Full + export |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Products not showing | Check `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is set |
| DB connection timeout | Verify `DATABASE_URL` uses correct pooler hostname |
| Auth not working | Check Supabase project URL and anon key |
| Stripe webhook fails | Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard |
| Theme not applying | Check `config.color_preset` value in Supabase |
| Build fails in CI | Ensure `.env.example` has all required variables |

See [DEVELOPMENT.md](DEVELOPMENT.md) for more debugging tips.
