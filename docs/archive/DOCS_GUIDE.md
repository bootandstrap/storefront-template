# 📚 Documentación del Proyecto — Guía Interna

> Mapa completo de la documentación del ecosistema BootandStrap. Lee esto primero para orientarte.

---

## Visión General

Este proyecto tiene **dos repositorios** que comparten una misma instancia de Supabase:

| Repositorio | Ruta actual | Deploy | Puerto |
|------------|-------------|--------|--------|
| **Template** (storefront + Medusa) | `./` (este repo) | `dominiocliente.com` | 3000 / 9000 |
| **SuperAdmin** (panel SaaS) | `../BOOTANDSTRAP_WEB/` (integrado en web corporativa) | `admin.bootandstrap.com` | — |

> [!NOTE]
> El SuperAdmin Panel está ahora integrado en la web corporativa (`BOOTANDSTRAP_WEB/`).
> En el workspace de desarrollo vive en `../BOOTANDSTRAP_WEB/` junto al template.

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
| [`API_REFERENCE.md`](docs/operations/API_REFERENCE.md) | Custom API routes, Server Actions (storefront + Owner Panel), Medusa endpoints, tablas de governance |
| [`DEPENDENCY_RISK_REGISTER.md`](docs/operations/DEPENDENCY_RISK_REGISTER.md) | Registro de riesgos de dependencias y mitigaciones |
| [`SECRETS_ROTATION_RUNBOOK.md`](docs/operations/SECRETS_ROTATION_RUNBOOK.md) | Runbook de rotación de secretos (Supabase, Stripe, Medusa, Redis) |
| [`rls-access-control.md`](docs/rls-access-control.md) | Matriz de acceso RLS por tabla — políticas efectivas |
| [`QUALITY_GATES_2026-02-10.md`](docs/operations/QUALITY_GATES_2026-02-10.md) | Quality gates: build, tests, lint, type-check, Lighthouse scores |

---

## SuperAdmin Panel

> **Estado**: ✅ Integrado en web corporativa — [`BOOTANDSTRAP_WEB/`](../BOOTANDSTRAP_WEB)

El SuperAdmin Panel es la **app de control SaaS** que gestiona todos los tenants desde un dashboard dark-theme. Solo accesible por `admin`/`staff`.

**Ubicación en workspace**: `../BOOTANDSTRAP_WEB/src/app/app/*`

**Documentación propia**:

| Documento | Contenido |
|-----------|-----------|
| [`BOOTANDSTRAP_WEB/GEMINI.md`](../BOOTANDSTRAP_WEB/GEMINI.md) | Master guide — arquitectura, stack, features, admin panel |

### Qué controla el SuperAdmin

| Tab | Función |
|-----|---------|
| Dashboard | Stats globales, distribución de tenants |
| Tenants | CRUD de clientes, filtro por status |
| Tenant Detail | 4 tabs: feature flags, plan limits, usage, **errors** |
| Flags | Visualización de 37 flags en 8 categorías |
| **Errors** | **Error Inbox global + per-tenant (resolve/resolve all)** |

---

## Scripts de Operaciones

| Script | Propósito |
|--------|-----------|
| [`scripts/release-gate.sh`](scripts/release-gate.sh) | **Release gate** — 7 checks (RLS, audit, lint, tests, type-check, build) |
| [`scripts/check-rls.sh`](scripts/check-rls.sh) | Verifica políticas RLS en migraciones SQL |
| [`scripts/check-audit-waiver.sh`](scripts/check-audit-waiver.sh) | Verifica vigencia del waiver de auditía |
| [`scripts/provision-client.sh`](scripts/provision-client.sh) | Wizard interactivo para onboarding de clientes |
| [`scripts/generate-env.sh`](scripts/generate-env.sh) | Generador de `.env` (para CI) |
| [`scripts/provision-tenant.sql`](scripts/provision-tenant.sql) | SQL para crear tenant en Supabase |
| [`scripts/healthcheck.sh`](scripts/healthcheck.sh) | Health checks con alertas webhook |
| [`scripts/backup.sh`](scripts/backup.sh) | Backup de Supabase + Redis + configs |
| [`scripts/restore.sh`](scripts/restore.sh) | Restauración desde backup |

---

## Modelo de Governance (3 Tiers)

```
┌─────────────────────────────────────────────────────┐
│  Tier 1: Admin Panel (SaaS — BootandStrap)          │
│  → Feature flags, plan limits, color presets         │
│  → Solo accesible por super_admin                    │
├─────────────────────────────────────────────────────┤
│  Tier 2: Owner Panel (Cliente — Medusa Admin API)    │
│  → Catálogo (productos + categorías + imágenes),     │
│    pedidos (fulfill/cancel), clientes (read-only),   │
│    carousel, WhatsApp, CMS, config, analytics        │
│  → Accesible por owner del negocio                   │
├─────────────────────────────────────────────────────┤
│  Tier 3: Template Storefront (Público — Next.js)     │
│  → Lee config + flags → renderiza condicionalmente   │
│  → Los clientes finales interactúan aquí             │
└─────────────────────────────────────────────────────┘
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
| Gestionar tenants desde SaaS | `../BOOTANDSTRAP_WEB/GEMINI.md` |
| Ver políticas RLS por tabla | `docs/rls-access-control.md` |
| Rotar secretos | `docs/operations/SECRETS_ROTATION_RUNBOOK.md` |
| Verificar calidad antes de release | `scripts/release-gate.sh` |
