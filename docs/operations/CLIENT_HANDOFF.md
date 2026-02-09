# Client Handoff Checklist

> Complete this checklist before handing off to the client. Each section ensures the client's store is production-ready.

---

## 1. Pre-Delivery Verification

### Infrastructure
- [ ] DNS configured (`domain.com` → storefront, `api.domain.com` → Medusa)
- [ ] SSL certificates active (Dokploy auto-SSL)
- [ ] Health check passing (`scripts/healthcheck.sh`)
- [ ] Backup cron configured (`scripts/backup.sh`)
- [ ] Redis persistence enabled

### Supabase
- [ ] Tenant record created (`tenants` table)
- [ ] Config populated (`config` table — store name, colors, language)
- [ ] Feature flags set (`feature_flags` — enable relevant payment methods)
- [ ] Plan limits configured (`plan_limits` — per tier)
- [ ] RLS policies active on all governance tables
- [ ] Auth providers configured (email, Google if needed)
- [ ] Storage buckets created (product-images, avatars)

### Medusa
- [ ] Products seeded or manually entered
- [ ] Categories created
- [ ] Admin user created (`medusa user -e owner@domain.com`)
- [ ] Payment providers configured (Stripe keys if online payments enabled)
- [ ] Shipping options set up

### Storefront
- [ ] Homepage renders correctly (hero, categories, featured products)
- [ ] Product pages display prices and images
- [ ] Cart flow works (add → update → remove)
- [ ] Checkout flow completes (at least WhatsApp or COD)
- [ ] Auth flow works (login, register, logout)
- [ ] Customer dashboard accessible after login
- [ ] SEO meta tags present (title, description, OG images)
- [ ] Favicon and branding applied

---

## 2. Owner Panel Training

### What the Owner Can Do
| Action | Where | How |
|--------|-------|-----|
| Add/edit products | Medusa Admin (`/app`) | Products → Create |
| Manage categories | Medusa Admin | Categories → Create |
| View orders | Medusa Admin | Orders tab |
| Edit carousel slides | Owner Panel (`/panel`) | Carousel section |
| Manage product badges | Owner Panel | Badges section |
| Edit WhatsApp templates | Owner Panel | Messages section |
| View store analytics | Owner Panel | Dashboard |

### What the Owner Cannot Do (Requires BootandStrap)
- Change feature flags (enable/disable payment methods, auth, etc.)
- Modify plan limits (max products, orders, etc.)
- Change color presets or theme mode
- Add new languages or currencies
- Domain changes
- Database modifications

### Training Agenda (30 min)
1. **Login** — How to access Medusa Admin + Owner Panel
2. **Products** — Adding, editing, images, variants, badges
3. **Orders** — Viewing, status updates, WhatsApp notifications
4. **Carousel** — Adding/reordering slides
5. **Messages** — Editing WhatsApp order templates
6. **Support** — How to request changes from BootandStrap

---

## 3. Support & Maintenance

### Included in Plan
| Plan | Support Level | Response Time |
|------|--------------|---------------|
| Starter | Email only | 48h |
| Pro | Email + WhatsApp | 24h |
| Enterprise | Priority + phone | 4h |

### Common Owner Requests
| Request | Self-Service? | BootandStrap Action |
|---------|--------------|---------------------|
| Add product | ✅ Yes | — |
| Change product image | ✅ Yes | — |
| Edit WhatsApp template | ✅ Yes | — |
| Enable Google login | ❌ No | Toggle flag + Supabase OAuth |
| Enable Stripe payments | ❌ No | Configure Stripe + toggle flag |
| Add new language | ❌ No | Upgrade plan + toggle flag |
| Change store colors | ❌ No | Update config via SuperAdmin |
| Custom feature request | ❌ No | Quote + develop |

---

## 4. Handoff Deliverables

- [ ] **Credentials document** — Medusa admin login, Supabase access (if applicable)
- [ ] **DNS records** — Document current DNS configuration
- [ ] **Backup schedule** — Confirm automated backups are running
- [ ] **Support channel** — Establish communication method
- [ ] **Training recording** — Share screen recording of training session
- [ ] **This checklist** — Mark all items complete, archive with client folder
