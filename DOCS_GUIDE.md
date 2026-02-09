# 📚 Documentación del Proyecto — Guía Interna

> Mapa completo de la documentación del ecosistema BootandStrap. Lee esto primero para orientarte.

---

## Visión General

Este proyecto tiene **dos repositorios** que comparten una misma instancia de Supabase:

| Repositorio | Ruta actual | Deploy | Puerto |
|------------|-------------|--------|--------|
| **Template** (storefront + Medusa) | `./` (este repo) | `dominiocliente.com` | 3000 / 9000 |
| **SuperAdmin** (panel SaaS) | `./bootandstrap-admin/` | `admin.bootandstrap.com` | 3100 |

> [!IMPORTANT]
> El SuperAdmin Panel vive temporalmente dentro de este repo en `bootandstrap-admin/`.
> Está pendiente de separarse en su propio repositorio Git (`bootandstrap/bootandstrap-admin`)
> e inicializar con `git init` + push al remoto. Ver sección [SuperAdmin](#superadmin-panel) abajo.

---

## Documentos Raíz

| Archivo | Propósito |
|---------|-----------|
| [`GEMINI.md`](GEMINI.md) | **Master guide** — contexto completo para AI agents y desarrolladores. Arquitectura, stack, patrones, governance, design system |
| [`ROADMAP.md`](ROADMAP.md) | Estado de cada fase de implementación (1-9). Progreso y siguiente paso |
| **`DOCS_GUIDE.md`** | ← Estás aquí. Índice de toda la documentación |

---

## `/docs/` — Documentación Técnica

Organizada en 4 categorías:

### 🏗️ `docs/architecture/` — Cómo está construido

| Documento | Contenido |
|-----------|-----------|
| [`ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) | Diagrama del sistema, principios clave, flujo de datos, strategy de caching y errores |
| [`DOMAIN_SPLIT.md`](docs/architecture/DOMAIN_SPLIT.md) | Qué gestiona Medusa vs Supabase — la "regla de oro" del dominio split |
| [`STACK_REFERENCE.md`](docs/architecture/STACK_REFERENCE.md) | Referencia detallada de cada tecnología: Medusa v2, Supabase, Next.js 16, React 19, Tailwind v4, Redis, Turborepo |
| [`SUPABASE_SCHEMA.md`](docs/architecture/SUPABASE_SCHEMA.md) | Esquema completo de tablas en Supabase: `profiles`, `config`, `feature_flags`, `plan_limits`, `whatsapp_templates`, RLS policies |

### 📖 `docs/guides/` — Cómo usarlo

| Documento | Contenido |
|-----------|-----------|
| [`DEVELOPMENT.md`](docs/guides/DEVELOPMENT.md) | Setup local, prerequisitos, `dev.sh`, comandos comunes, debugging, troubleshooting |
| [`DEPLOYMENT.md`](docs/guides/DEPLOYMENT.md) | Docker Compose, Dokploy, VPS, multi-client topology, monitoring, backups |
| [`TEMPLATE_USAGE.md`](docs/guides/TEMPLATE_USAGE.md) | Guía paso a paso: clonar → configurar → personalizar → desplegar un nuevo cliente |

### 🔄 `docs/flows/` — Cómo funcionan los flujos

| Documento | Contenido |
|-----------|-----------|
| [`AUTH_FLOW.md`](docs/flows/AUTH_FLOW.md) | Autenticación flag-driven: Supabase Auth → Medusa JWT → proxy.ts route protection |
| [`CHECKOUT_FLOWS.md`](docs/flows/CHECKOUT_FLOWS.md) | Sistema de N métodos de pago dinámicos: WhatsApp, Stripe, COD, transferencia |
| [`MEDUSA_CUSTOMIZATIONS.md`](docs/flows/MEDUSA_CUSTOMIZATIONS.md) | Módulos custom (supabase-auth, supabase-storage), subscribers, workflows, seed script |

### ⚙️ `docs/operations/` — Operaciones y entrega

| Documento | Contenido |
|-----------|-----------|
| [`CLIENT_HANDOFF.md`](docs/operations/CLIENT_HANDOFF.md) | Checklist de entrega: verificaciones pre-deploy, training del owner, soporte por tier |
| [`API_REFERENCE.md`](docs/operations/API_REFERENCE.md) | Custom API routes, Server Actions, Medusa endpoints, tablas de governance |

---

## SuperAdmin Panel

> **Estado**: ⏳ Pendiente de separación a repositorio propio

El SuperAdmin Panel es la **app de control SaaS** que gestiona todos los tenants desde un dashboard dark-theme. Solo accesible por `super_admin`.

**Ubicación temporal**: `./bootandstrap-admin/`

**Documentación propia**:

| Documento | Contenido |
|-----------|-----------|
| [`bootandstrap-admin/GEMINI.md`](bootandstrap-admin/GEMINI.md) | Master guide del SuperAdmin — arquitectura, stack, features, quick start |
| [`bootandstrap-admin/docs/ARCHITECTURE.md`](bootandstrap-admin/docs/ARCHITECTURE.md) | Data flow, auth flow, design decisions, types strategy |
| [`bootandstrap-admin/docs/DEPLOYMENT.md`](bootandstrap-admin/docs/DEPLOYMENT.md) | Dokploy, Docker, CI/CD, resource requirements |

### Pasos para separar el SuperAdmin

```bash
# 1. Desde la carpeta del admin
cd bootandstrap-admin

# 2. Inicializar git
git init
git add .
git commit -m "Initial: SuperAdmin Panel standalone"

# 3. Conectar al remoto
git remote add origin git@github.com:bootandstrap/bootandstrap-admin.git
git push -u origin main

# 4. Opcional: eliminar del monorepo template
# (solo después de confirmar que el deploy independiente funciona)
```

### Qué controla el SuperAdmin

| Tab | Función |
|-----|---------|
| Dashboard | Stats globales, distribución de tenants |
| Tenants | CRUD de clientes, filtro por status |
| Tenant Detail | 3 tabs: feature flags, plan limits, usage |
| Flags | Visualización de 27 flags en 6 categorías |

---

## Scripts de Operaciones

| Script | Propósito |
|--------|-----------|
| [`scripts/provision-client.sh`](scripts/provision-client.sh) | Wizard interactivo para onboarding de clientes |
| [`scripts/generate-env.sh`](scripts/generate-env.sh) | Generador de `.env` (para CI) |
| [`scripts/provision-tenant.sql`](scripts/provision-tenant.sql) | SQL para crear tenant en Supabase |
| [`scripts/healthcheck.sh`](scripts/healthcheck.sh) | Health checks con alertas webhook |
| [`scripts/backup.sh`](scripts/backup.sh) | Backup de Supabase + Redis + configs |
| [`scripts/restore.sh`](scripts/restore.sh) | Restauración desde backup |

---

## Modelo de Governance (3 Tiers)

```
┌─────────────────────────────────────────────────┐
│  Tier 1: Admin Panel (SaaS — BootandStrap)      │
│  → Feature flags, plan limits, color presets     │
│  → Solo accesible por super_admin                │
├─────────────────────────────────────────────────┤
│  Tier 2: Owner Panel (Cliente — Medusa custom)   │
│  → Productos, pedidos, carousel, badges          │
│  → Accesible por owner del negocio               │
├─────────────────────────────────────────────────┤
│  Tier 3: Template Storefront (Público — Next.js) │
│  → Lee config + flags → renderiza condicionalmente│
│  → Los clientes finales interactúan aquí         │
└─────────────────────────────────────────────────┘
```

---

## ¿Dónde buscar qué?

| Si necesitas... | Lee... |
|----------------|--------|
| Entender el sistema completo | `GEMINI.md` |
| Montar el entorno local | `docs/guides/DEVELOPMENT.md` |
| Desplegar un nuevo cliente | `docs/guides/TEMPLATE_USAGE.md` |
| Entender qué va en Medusa vs Supabase | `docs/architecture/DOMAIN_SPLIT.md` |
| Ver las tablas de Supabase | `docs/architecture/SUPABASE_SCHEMA.md` |
| Agregar un método de pago | `docs/flows/CHECKOUT_FLOWS.md` |
| Agregar un auth provider | `docs/flows/AUTH_FLOW.md` |
| Entregar un proyecto a cliente | `docs/operations/CLIENT_HANDOFF.md` |
| Consultar endpoints y actions | `docs/operations/API_REFERENCE.md` |
| Gestionar tenants desde SaaS | `bootandstrap-admin/GEMINI.md` |
