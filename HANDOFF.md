# 🚀 HANDOFF — Checklist Operativa de Nuevo Tenant

> Lista maestra para el equipo humano. Cubre TODO lo que hay que hacer cuando se vende una nueva web a un cliente.
> Última actualización: 2026-04-14.

---

## Fase 0: Pre-Venta

- [ ] Recoger datos del cliente (ver §Datos del Cliente abajo)
- [ ] Confirmar plan: Web Base (1500 CHF) + Maintenance (40 CHF/mo) + módulos extra
- [ ] Crear checkout link en Stripe o usar el flujo `/api/tenant-checkout`

---

## Fase 1: Provisioning (Automático)

> El sistema hace esto al completarse el pago. Solo verificar que terminó OK.

- [ ] Stripe checkout completado → webhook `checkout.session.completed` recibido
- [ ] `provision_tenant` RPC ejecutado (5 tablas: tenants, config, feature_flags, plan_limits, tenant_domains)
- [ ] Suscripción de mantenimiento creada (40 CHF/mo, 30 días trial)
- [ ] Repo creado en GitHub (`bootandstrap/store-{slug}`)
- [ ] Deploy en Dokploy (Redis + Medusa + Storefront)
- [ ] Medusa arrancado y accesible (`:9000/health` → 200)
- [ ] Storefront accesible (`/api/readiness` → `{"status":"ok"}`)
- [ ] SuperAdmin → Deploy tab → verificar timeline verde

---

## Fase 2: Branding & Assets (Manual — Humano o IA)

### 2.1 Assets del cliente

| Asset | Formato | Dónde va | Notas |
|-------|---------|----------|-------|
| Logo principal | SVG o PNG (transparente, ≥240px ancho) | `public/logo.svg` | Header + Emails |
| Favicon | ICO 32×32 o PNG | `src/app/favicon.ico` | Tab del navegador |
| Icono PWA 192px | PNG 192×192 | `public/icon-192.png` | Install en móvil |
| Icono PWA 512px | PNG 512×512 | `public/icon-512.png` | Splash screen |
| Hero image | JPG/WebP ≥1920×800 | Supabase Storage → `config.hero_image` | Homepage hero |
| OG image | JPG 1200×630 | `public/og-image.jpg` | Compartir en RRSS |
| Fotos de productos | JPG/WebP ≥800px | Supabase Storage (via seed o panel) | Catálogo |

### 2.2 Colores de marca

Editar `apps/storefront/src/app/globals.css` → bloque `@theme inline`:

```css
/* Reemplazar TODOS los valores #2D5016 por el color del cliente */
--color-brand: #CLIENT_HEX;
--color-brand-light: #CLIENT_HEX_LIGHT;   /* +15% luminosidad */
--color-brand-dark: #CLIENT_HEX_DARK;     /* -15% luminosidad */
--color-brand-50 a --color-brand-950;      /* Generar escala completa */
```

> 💡 Usar [uicolors.app](https://uicolors.app) para generar la escala completa desde un hex base.

> ⚠️ Después de cambiar colores: `rm -rf apps/storefront/.next` → rebuild.

### 2.3 Textos e i18n

Editar `apps/storefront/src/lib/i18n/dictionaries/es.json` (y los otros 4 idiomas activos):

| Key | Qué es | Ejemplo |
|-----|--------|---------|
| `trust.freshDaily` | Propuesta de valor 1 | "Ingredientes frescos" |
| `trust.freshDailyDesc` | Descripción valor 1 | "Del productor a tu puerta en 24h" |
| `trust.fastDelivery` | Propuesta de valor 2 | "Envío express" |
| `trust.fastDeliveryDesc` | Descripción valor 2 | "Recibe tu pedido en menos de 48h" |
| `trust.bestPrice` | Propuesta de valor 3 | "Precio justo" |
| `trust.bestPriceDesc` | Descripción valor 3 | "Sin intermediarios, mejor precio" |
| `trust.easyOrder` | Propuesta de valor 4 | "Compra fácil" |
| `trust.easyOrderDesc` | Descripción valor 4 | "Pide desde tu móvil en segundos" |
| `trust.title` | Título sección confianza | "¿Por qué elegirnos?" |

> 📋 Las demás keys (checkout, cart, panel, etc.) son genéricas y no suelen necesitar cambio.

### 2.4 PWA Manifest

Editar `apps/storefront/public/manifest.json`:

```json
{
    "name": "NOMBRE_COMPLETO_DEL_NEGOCIO",
    "short_name": "NOMBRE_CORTO",
    "description": "DESCRIPCIÓN_BREVE",
    "theme_color": "#CLIENT_HEX"
}
```

### 2.5 Emails

- Los **layouts** (Minimal/Brand/Modern) son automáticos por tier de módulo
- El **contenido** de los templates se puede personalizar editando `src/emails/*.tsx`
- El `EMAIL_FROM` se configura en `.env` por el provisioning (normalmente `pedidos@{dominio}`)
- El owner elige su diseño en Panel → Email → Diseño

---

## Fase 3: Datos del Negocio (Governance Supabase)

> Estos datos se configuran en la tabla `config` del tenant en Supabase governance.

| Campo | Tabla | Ejemplo | Cómo se usa |
|-------|-------|---------|-------------|
| `business_name` | `config` | "Campifruit" | Header, footer, emails, SEO title |
| `logo_url` | `config` | URL Supabase Storage | Header logo |
| `hero_title` | `config` | "Frutas frescas del campo a tu mesa" | Homepage hero |
| `hero_subtitle` | `config` | "Seleccionadas a mano, entregadas hoy" | Homepage hero |
| `hero_image` | `config` | URL Supabase Storage | Homepage background |
| `hero_badge` | `config` | "🍓 Temporada de fresas" | Badge hero |
| `footer_description` | `config` | "Frutas y verduras frescas desde 2018" | Footer brand |
| `whatsapp_number` | `config` | "+573001234567" | WhatsApp CTA |
| `contact_email` | `config` | "info@campifruit.com" | Footer contacto |
| `contact_phone` | `config` | "+573001234567" | Footer teléfono |
| `contact_address` | `config` | "Finca El Paraíso, Pueblo" | Footer dirección |
| `social_instagram` | `config` | "https://instagram.com/campifruit" | Footer RRSS |
| `social_facebook` | `config` | "https://facebook.com/campifruit" | Footer RRSS |
| `social_tiktok` | `config` | "https://tiktok.com/@campifruit" | Footer RRSS |
| `meta_title` | `config` | "Campifruit — Frutas Frescas" | SEO `<title>` |
| `meta_description` | `config` | "Tienda online de frutas..." | SEO meta description |
| `language` | `config` | "es" | Idioma default |
| `currency` | `config` | "cop" | Moneda default |

---

## Fase 4: Catálogo (Medusa)

### Productos

| Método | Cuándo |
|--------|--------|
| **Seed script** | Setup inicial con catálogo completo → `npx tsx scripts/seed-demo.ts --template={id}` |
| **Admin panel** | Owner sube productos 1 a 1 → `https://{dominio}/app` (Medusa Admin) |
| **Owner panel** | Gestión diaria → `https://{dominio}/{lang}/panel/productos` |

### Para usar el seed script con un nuevo cliente:

1. Crear template en `scripts/seed-demo.ts` (copiar `CAMPIFRUIT` como modelo)
2. Definir categorías y productos con precios en la moneda del cliente
3. Subir imágenes: `npx tsx scripts/seed-campifruit-images.ts` (adaptar para el cliente)
4. Ejecutar: `npx tsx scripts/seed-demo.ts --template={nuevo-id}`

---

## Fase 5: Módulos Add-on (Según venta)

> Cada módulo se activa comprando en la tienda de módulos del panel, o manualmente desde SuperAdmin.

| Módulo | Precio/mo | Flags que activa |
|--------|-----------|------------------|
| `ecommerce` | 15-50 CHF | Pagos online, envíos, devoluciones |
| `chatbot` | 15-30 CHF | Chat IA en la tienda |
| `crm` | 15-30 CHF | Segmentación, export |
| `email_marketing` | 15-30 CHF | Campañas, abandoned cart |
| `seo` | 15-30 CHF | SEO avanzado, sitemap dinámico |
| `pos` | 15-30 CHF | Punto de venta |
| `pos_kiosk` | 15-30 CHF | Kiosk mode |
| `i18n` | 15-30 CHF | Multi-idioma |
| `sales_channels` | 15-50 CHF | WhatsApp, pagos online, transferencia |
| `auth_advanced` | 15-30 CHF | Google login, guest checkout |
| `rrss` | 15-30 CHF | Links redes sociales |
| `automation` | 15-30 CHF | Automatizaciones |
| `capacidad` | 15-30 CHF | Capacidad tráfico extra |

---

## Fase 6: DNS & Dominio

- [ ] Cliente compra dominio (o ya tiene uno)
- [ ] Configurar DNS: A record → `38.242.133.148` (VPS)
- [ ] Añadir dominio en Dokploy → Traefik genera TLS automáticamente
- [ ] Actualizar `tenant_domains` en Supabase governance
- [ ] Actualizar `NEXT_PUBLIC_SITE_URL` y `STORE_CORS` en Dokploy env
- [ ] Verificar HTTPS funcional

---

## Fase 7: Go-Live

- [ ] Homepage revisada con el cliente (hero, categorías, productos)
- [ ] Checkout probado de extremo a extremo (crear pedido → pago → confirmación)
- [ ] Emails de prueba recibidos (order confirmation al menos)
- [ ] Panel de owner funcional (el owner puede acceder y gestionar)
- [ ] SEO: `meta_title`, `meta_description`, OG image configurados
- [ ] PWA: manifest.json actualizado, iconos presentes
- [ ] Responsive: probado en móvil (hero, catálogo, checkout, panel)
- [ ] WhatsApp CTA funcional (si aplica)
- [ ] Analytics: `enable_analytics` flag activado
- [ ] Performance: Lighthouse ≥ 90 en mobile
- [ ] Avisar al cliente: "Tu tienda está lista"

---

## Fase 8: Post-Launch (Primeros 30 días)

- [ ] Monitorear health dashboard en SuperAdmin
- [ ] Verificar que el owner usa el panel (smart-tips activos)
- [ ] Primer billing cycle sin errores (maintenance + módulos)
- [ ] Atender dudas del owner por WhatsApp/email
- [ ] Recordar: 1er mes de maintenance es GRATIS (trial 30 días)

---

## Datos del Cliente — Template de Recogida

```
═══ DATOS REQUERIDOS PARA NUEVO TENANT ═══

Negocio:
  Nombre comercial:     _______________
  Slug (URL):           _______________ (sin espacios, minúsculas, guiones)
  País:                 _______________
  Moneda:               _______________ (EUR, USD, COP, CHF...)
  Idioma principal:     _______________ (es, en, de, fr, it)

Contacto:
  Email del owner:      _______________
  Teléfono/WhatsApp:    _______________
  Web actual (si hay):  _______________

Branding:
  Color principal:      #______________ (hex)
  Logo:                 [ ] Adjunto
  Fotos de productos:   [ ] Adjuntas (_____ fotos)

Dominio:
  Dominio propio:       _______________
  [ ] Ya tiene dominio  [ ] Hay que comprar

Módulos contratados:
  [ ] ecommerce   [ ] chatbot   [ ] crm   [ ] email_marketing
  [ ] seo   [ ] pos   [ ] i18n   [ ] sales_channels
  [ ] auth_advanced   [ ] rrss   [ ] automation   [ ] capacidad
```

---

## Referencia Rápida de Archivos

| Qué personalizar | Archivo |
|------------------|---------|
| Colores de marca | `apps/storefront/src/app/globals.css` |
| Textos / traducciones | `apps/storefront/src/lib/i18n/dictionaries/*.json` |
| Homepage layout | `apps/storefront/src/app/[lang]/(shop)/page.tsx` |
| Hero section | `apps/storefront/src/components/home/HeroSection.tsx` |
| Header (logo, nav) | `apps/storefront/src/components/layout/Header.tsx` |
| Footer (links, legal) | `apps/storefront/src/components/layout/Footer.tsx` |
| Trust section | `apps/storefront/src/components/home/TrustSection.tsx` |
| PWA manifest | `apps/storefront/public/manifest.json` |
| Favicon | `apps/storefront/src/app/favicon.ico` |
| PWA icons | `apps/storefront/public/icon-192.png`, `icon-512.png` |
| OG image | `apps/storefront/public/og-image.jpg` |
| Email content | `apps/storefront/src/emails/*.tsx` |
| Seed data | `scripts/seed-demo.ts` |
| Env vars | `.env` (auto-provisioned) |
| Config DB | `config` table en Supabase governance |

> ⚠️ NO tocar archivos marcados como 🔴 LOCKED en `GEMINI.md`. Ante la duda, consultar la Zone Map.
