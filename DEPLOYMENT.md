# Deployment Guide — BootandStrap Platform

> Guía para desplegar la plataforma completa (Storefront + Medusa + SuperAdmin) en Dokploy.

---

## Estructura de Carpetas (Local)

```
~/DESARROLLO/BOOTANDSTRAP/
├── bootandstrap-admin/              ← Repo: bootandstrap/bootandstrap-admin
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
└── CLIENTES/
    └── CAMPIFRUT/                   ← Repo: bootandstrap/bootandstrap-ecommerce  
        ├── apps/storefront/
        ├── apps/medusa/
        ├── docker-compose.yml       ← Referencia admin como ../../bootandstrap-admin
        ├── docker-compose.dev.yml
        └── ...
```

> [!IMPORTANT]
> Ambos repos son **hermanos** bajo `BOOTANDSTRAP/`. El docker-compose referencia el admin con la path relativa `../../bootandstrap-admin`.

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
│  │  :3100       │  │    :6379     │                         │
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
| **Domain** | `campifrut.com` → `:3000` |
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
| **Domain** | `api.campifrut.com` → `:9000` |
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

### 4. SuperAdmin Panel

| Setting | Value |
|---------|-------|
| **Source** | GitHub: `bootandstrap/bootandstrap-admin` |
| **Build** | Dockerfile (root) |
| **Port** | 3100 |
| **Domain** | `admin.bootandstrap.com` → `:3100` |
| **Build Args** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Memory** | 256 MB |

**Env vars del Admin Panel:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # ⚠️ SOLO server-side
NODE_ENV=production
PORT=3100
HOSTNAME=0.0.0.0

# Instant cache revalidation
STOREFRONT_URL=https://campifrut.com         # Storefront reachable URL
REVALIDATION_SECRET=your-shared-secret       # Must match storefront's REVALIDATION_SECRET
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
- **Admin repo** → Dokploy webhook URL → Events: `push` on `main`

---

## Opción B: Docker Compose Unificado en el VPS

```bash
# En el VPS, estructura requerida:
mkdir -p /opt/bootandstrap/CLIENTES
cd /opt/bootandstrap

git clone git@github.com:bootandstrap/bootandstrap-admin.git
git clone git@github.com:bootandstrap/bootandstrap-ecommerce.git CLIENTES/CAMPIFRUT

# Configurar y levantar
cp CLIENTES/CAMPIFRUT/.env.example CLIENTES/CAMPIFRUT/.env
# Edita .env con credenciales reales

cd CLIENTES/CAMPIFRUT
docker compose up -d --build
```

---

## Opción C: Local Dev

```bash
# Desde el repo template:
cd ~/DESARROLLO/BOOTANDSTRAP/CLIENTES/CAMPIFRUT
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
cd ~/DESARROLLO/BOOTANDSTRAP/CLIENTES/CAMPIFRUT && ./dev.sh

# Terminal 2: Admin
cd ~/DESARROLLO/BOOTANDSTRAP/bootandstrap-admin && pnpm dev
```

---

## Dominios

| Dominio | Servicio | Notas |
|---------|----------|-------|
| `campifrut.com` | Storefront :3000 | SSL via Let's Encrypt |
| `api.campifrut.com` | Medusa :9000 | CORS configurado |
| `admin.bootandstrap.com` | SuperAdmin :3100 | No indexado |

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
