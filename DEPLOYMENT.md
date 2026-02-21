# Deployment Guide — BootandStrap Platform

> Guía para desplegar la plataforma completa (Storefront + Medusa + SuperAdmin) en Dokploy.

---

## Estructura de Carpetas (Local)

```
~/DESARROLLO/BOOTANDSTRAP/
├── BOOTANDSTRAP_WEB/                   ← Web corporativa + SuperAdmin Panel
│   ├── src/app/app/              ← Admin panel routes
│   ├── Dockerfile
│   └── ...
└── CLIENTES/
    └── ecommerce-template/                   ← Repo: bootandstrap/bootandstrap-ecommerce  
        ├── apps/storefront/
        ├── apps/medusa/
        ├── docker-compose.yml
        └── ...
```

> [!IMPORTANT]
> El SuperAdmin Panel está integrado en `BOOTANDSTRAP_WEB` (web corporativa). Ambos repos comparten la misma instancia de Supabase.

---

## Arquitectura de Despliegue

```
┌──────────────────────────────────────────────────────────────┐
│                    Contabo VPS (Dokploy)                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Storefront  │  │  Medusa API  │  │  Medusa Worker     │ │
│  │  :3000       │──│  :9000       │──│  (background jobs) │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  SuperAdmin  │  │    Redis     │                         │
│  │  (bns-web)   │  │    :6379     │                         │
│  └──────────────┘  └──────────────┘                         │
└──────────┬──────────────────┬────────────────────────────────┘
           ▼                  ▼
      Supabase Cloud      Stripe / Resend
```

---

## Opción A: Repos Separados en Dokploy (Recomendado)

Cada servicio se despliega como un **Application** independiente en Dokploy, con su propio webhook de GitHub.

### 1. Storefront

| Setting | Value |
|---------|-------|
| **Source** | GitHub: `bootandstrap/bootandstrap-ecommerce` |
| **Build** | Dockerfile: `apps/storefront/Dockerfile` |
| **Port** | 3000 |
| **Domain** | `example.com` → `:3000` |
| **Build Args** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STORE_URL` |
| **Memory** | 512 MB |

**Runtime env (include `REVALIDATION_SECRET`):**
```bash
REVALIDATION_SECRET=your-shared-secret   # Must match SuperAdmin's REVALIDATION_SECRET
```

### 2. Medusa Server

| Setting | Value |
|---------|-------|
| **Source** | GitHub: `bootandstrap/bootandstrap-ecommerce` |
| **Build** | Dockerfile: `apps/medusa/Dockerfile` |
| **Port** | 9000 |
| **Domain** | `api.example.com` → `:9000` |
| **Env** | `MEDUSA_WORKER_MODE=server` + DB/Redis URLs |
| **Memory** | 1 GB |

### 3. Medusa Worker

| Setting | Value |
|---------|-------|
| **Source** | Same repo |
| **Build** | Dockerfile: `apps/medusa/Dockerfile` |
| **Port** | None (no public access) |
| **Env** | `MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true` |
| **Memory** | 512 MB |

### 4. SuperAdmin Panel (BOOTANDSTRAP_WEB)

| Setting | Value |
|---------|-------|
| **Source** | GitHub: `bootandstrap/bootandstrap-web` |
| **Build** | Dockerfile (root) |
| **Port** | 3000 |
| **Domain** | `admin.bootandstrap.com` |
| **Build Args** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Memory** | 256 MB |

**Env vars del Admin Panel:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # ⚠️ SOLO server-side
NODE_ENV=production

# Instant cache revalidation
STOREFRONT_URL=https://example.com         # Storefront reachable URL
REVALIDATION_SECRET=your-shared-secret       # Must match storefront's REVALIDATION_SECRET

# Medusa per-tenant creds stored in Supabase config table
# Optional: Dokploy auto-deployment
DOKPLOY_API_URL=http://your-vps-ip:3000
DOKPLOY_API_TOKEN=your-dokploy-token
```

> [!IMPORTANT]
> **Instant Revalidation**: When SuperAdmin changes tenant status/flags/limits/config, it POSTs to the storefront's `/api/revalidate` to instantly clear the config cache. Both services must share the same `REVALIDATION_SECRET`. If `STOREFRONT_URL` is unreachable, mutations still succeed — cache expires by TTL (5 min).

### 5. Redis

| Setting | Value |
|---------|-------|
| **Type** | Docker image |
| **Image** | `redis:7-alpine` |
| **Port** | 6379 (internal only) |
| **Volume** | `/data` → persistent |
| **Memory** | 128 MB |

### Webhooks de Auto-Deploy

Configura en GitHub → Settings → Webhooks:
- **Template repo** → Dokploy webhook URL → Events: `push` on `main`
- **BOOTANDSTRAP_WEB repo** → Dokploy webhook URL → Events: `push` on `main`

---

## Opción B: Docker Compose Unificado en el VPS

```bash
# En el VPS, estructura requerida:
mkdir -p /opt/bootandstrap
cd /opt/bootandstrap

git clone git@github.com:bootandstrap/bootandstrap-web.git BOOTANDSTRAP_WEB
git clone git@github.com:bootandstrap/bootandstrap-ecommerce.git ecommerce-template

# Configurar y levantar
cp ecommerce-template/.env.example ecommerce-template/.env
# Edita .env con credenciales reales

cd ecommerce-template
docker compose up -d --build
```

---

## Opción C: Local Dev

```bash
# Desde el repo template:
cd ~/DESARROLLO/BOOTANDSTRAP/CLIENTES/ecommerce-template
docker compose -f docker-compose.dev.yml up

# Servicios (todos con hot-reload):
#   Storefront:   http://localhost:3000
#   SuperAdmin:   http://localhost:3100
#   Medusa:       http://localhost:9000
#   Redis:        localhost:6379
```

> [!NOTE]
> El docker-compose.dev.yml usa networking estándar de Docker (no `network_mode: host`), compatible con Docker Desktop en macOS. Medusa se conecta a Redis via el service name `redis` en lugar de `localhost`.

O sin Docker:

```bash
# Terminal 1: Template
cd ~/DESARROLLO/BOOTANDSTRAP/CLIENTES/ecommerce-template && ./dev.sh

# Terminal 2: Admin (web corporativa)
cd ~/DESARROLLO/BOOTANDSTRAP/BOOTANDSTRAP_WEB && pnpm dev
```

---

## Dominios

| Dominio | Servicio | Notas |
|---------|----------|-------|
| `example.com` | Storefront :3000 | SSL via Let's Encrypt |
| `api.example.com` | Medusa :9000 | CORS configurado |
| `admin.bootandstrap.com` | SuperAdmin (BOOTANDSTRAP_WEB) | No indexado |

---

## Recursos del VPS

| Servicio | RAM |
|----------|-----|
| Storefront | 512 MB |
| Medusa Server | 1 GB |
| Medusa Worker | 512 MB |
| SuperAdmin | 256 MB |
| Redis | 128 MB |
| **Total** | **~2.5 GB** |

> [!TIP]
> Un Contabo VPS con 4 GB RAM y 4 vCPU es suficiente.
