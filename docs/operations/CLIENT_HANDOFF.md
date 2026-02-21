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
| Add/edit products | Owner Panel (`/panel/catalogo`) | Catálogo → Productos tab → Create/edit |
| Upload product images | Owner Panel (`/panel/catalogo`) | Product form → Image dropzone |
| Manage categories | Owner Panel (`/panel/catalogo`) | Catálogo → Categorías tab → Create/edit |
| View/fulfill/cancel orders | Owner Panel (`/panel/pedidos`) | Pedidos → expand order → Fulfill/Cancel |
| View customers | Owner Panel (`/panel/clientes`) | Clientes → read-only overview |
| Edit carousel slides | Owner Panel (`/panel/carrusel`) | Carousel section |
| Manage product badges | Owner Panel (`/panel/catalogo`) | Product → toggle badges |
| Edit WhatsApp templates | Owner Panel (`/panel/mensajes`) | Messages section |
| Manage CMS pages | Owner Panel (`/panel/paginas`) | Create/edit/publish pages |
| Edit store config | Owner Panel (`/panel/tienda`) | Store identity, contact, socials |
| View store analytics | Owner Panel (`/panel/analiticas`) | Dashboard + charts |

### What the Owner Cannot Do (Requires BootandStrap)
- Change feature flags (enable/disable payment methods, auth providers, etc.)
- Modify plan limits (max products, orders, etc.)
- Domain changes
- Database modifications
- Infrastructure changes (SSL, DNS, backups)

### Training Agenda (45 min)
1. **Login** — How to access Owner Panel (`/panel`)
2. **Catálogo** — Products tab (add, edit, images, variants) + Categories tab
3. **Pedidos** — Viewing orders, fulfilling, cancelling
4. **Clientes** — Customer overview (read-only)
5. **Carousel** — Adding/reordering homepage slides
6. **Mensajes** — Editing WhatsApp order templates
7. **CMS** — Creating/editing/publishing pages
8. **Mi Tienda** — Store config (name, contact, socials)
9. **Support** — How to request changes from BootandStrap

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
| Add product | ✅ Yes (Owner Panel) | — |
| Change product image | ✅ Yes (Owner Panel) | — |
| Fulfill/cancel order | ✅ Yes (Owner Panel) | — |
| View customers | ✅ Yes (Owner Panel) | — |
| Edit WhatsApp template | ✅ Yes (Owner Panel) | — |
| Manage CMS pages | ✅ Yes (Owner Panel) | — |
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
