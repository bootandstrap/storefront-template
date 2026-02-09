# Deployment Guide — BootandStrap Platform

> Guía para desplegar la plataforma completa (Storefront + Medusa + SuperAdmin) en Dokploy.

---

## Arquitectura de Despliegue

```
┌──────────────────────────────────────────────────────────────┐
│                    Contabo VPS (Dokploy)                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Storefront  │  │  Medusa API  │  │  Medusa Worker     │ │
│  │  :3000       │──│  :9000       │──│  (background jobs) │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘ │
│         │                 │                                   │
│  ┌──────┴───────┐  ┌──────┴───────┐                         │
│  │  SuperAdmin  │  │    Redis     │                         │
│  │  :3100       │  │    :6379     │                         │
│  └──────────────┘  └──────────────┘                         │
└──────────┬──────────────────┬────────────────────────────────┘
           │                  │
           ▼                  ▼
      Supabase Cloud      Stripe / Resend
```

---

## Opción A: Repos Separados en Dokploy (Recomendado)

Cada servicio se despliega como un **Application** independiente en Dokploy, con su propio webhook de GitHub.

### 1. Template (Storefront + Medusa)

**Repo**: `bootandstrap/bootandstrap-ecommerce`

En Dokploy, crear **3 Application services** desde este repo:

#### Storefront

| Setting | Value |
|---------|-------|
| **Source** | GitHub: `bootandstrap/bootandstrap-ecommerce` |
| **Build** | Dockerfile: `apps/storefront/Dockerfile` |
| **Port** | 3000 |
| **Domain** | `campifrut.com` → `:3000` |
| **Build Args** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STORE_URL` |
| **Env Vars** | All from `.env.example` |
| **Health** | `GET /api/health` |
| **Memory** | 512 MB |

#### Medusa Server

| Setting | Value |
|---------|-------|
| **Source** | GitHub: `bootandstrap/bootandstrap-ecommerce` |
| **Build** | Dockerfile: `apps/medusa/Dockerfile` |
| **Port** | 9000 |
| **Domain** | `api.campifrut.com` → `:9000` |
| **Env** | `MEDUSA_WORKER_MODE=server` + DB/Redis URLs |
| **Health** | `GET /health` |
| **Memory** | 1 GB |

#### Medusa Worker

| Setting | Value |
|---------|-------|
| **Source** | Same repo |
| **Build** | Dockerfile: `apps/medusa/Dockerfile` |
| **Port** | None (no public access) |
| **Env** | `MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true` |
| **Memory** | 512 MB |

### 2. SuperAdmin Panel

**Repo**: `bootandstrap/bootandstrap-admin`

| Setting | Value |
|---------|-------|
| **Source** | GitHub: `bootandstrap/bootandstrap-admin` |
| **Build** | Dockerfile (root) |
| **Port** | 3100 |
| **Domain** | `admin.bootandstrap.com` → `:3100` |
| **Build Args** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Env Vars** | See below |
| **Health** | `GET /` (returns 200 or redirect) |
| **Memory** | 256 MB |

**Env vars del Admin Panel:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fopjqjoxwelmrrfowbmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # ⚠️ SOLO server-side
NODE_ENV=production
PORT=3100
HOSTNAME=0.0.0.0
```

### 3. Redis

| Setting | Value |
|---------|-------|
| **Type** | Docker image |
| **Image** | `redis:7-alpine` |
| **Port** | 6379 (internal only) |
| **Volume** | `/data` → persistent |
| **Memory** | 128 MB |

> [!IMPORTANT]
> Redis solo necesita ser accesible internamente por Medusa. No expongas el puerto 6379 públicamente.

### Webhooks de Auto-Deploy

Cada Application en Dokploy genera un webhook URL. Configúralos en GitHub:

1. Repo `bootandstrap-ecommerce` → Settings → Webhooks → Add webhook
   - URL: `https://dokploy.tu-vps.com/api/webhook/...` (Dokploy te da la URL)
   - Events: `push` on `main`
   
2. Repo `bootandstrap-admin` → Settings → Webhooks → Add webhook
   - URL: webhook del servicio admin en Dokploy
   - Events: `push` on `main`

---

## Opción B: Docker Compose Unificado en el VPS

Si prefieres un solo `docker compose up -d` que levante todo:

```bash
# En el VPS, clona ambos repos como hermanos:
mkdir -p /opt/bootandstrap
cd /opt/bootandstrap

git clone git@github.com:bootandstrap/bootandstrap-admin.git
git clone git@github.com:bootandstrap/bootandstrap-ecommerce.git CLIENTES/CAMPIFRUT

# Crea el .env en el repo template
cp CLIENTES/CAMPIFRUT/.env.example CLIENTES/CAMPIFRUT/.env
# Edita con credenciales reales

# Levanta todo
cd CLIENTES/CAMPIFRUT
docker compose up -d --build
```

Esto usa el `docker-compose.yml` del template que referencia el admin repo como hermano.

---

## Opción C: Local Dev (Para Desarrollo)

```bash
# Desde el repo template:
docker compose -f docker-compose.dev.yml up

# Servicios:
#   Storefront:   http://localhost:3000  (hot-reload)
#   SuperAdmin:   http://localhost:3100  (hot-reload)
#   Medusa:       http://localhost:9000  (hot-reload)
#   Redis:        localhost:6379
```

O sin Docker (usando `dev.sh`):

```bash
./dev.sh
# + en otra terminal:
cd ~/DESARROLLO/BOOTANDSTRAP/bootandstrap-admin && pnpm dev
```

---

## Dominios

| Dominio | Servicio | Notas |
|---------|----------|-------|
| `campifrut.com` | Storefront :3000 | SSL via Dokploy/Let's Encrypt |
| `api.campifrut.com` | Medusa :9000 | CORS configurado para storefront |
| `admin.bootandstrap.com` | SuperAdmin :3100 | No indexado, solo super_admin |

---

## Recursos del VPS

| Servicio | RAM | CPU |
|----------|-----|-----|
| Storefront | 512 MB | 0.5 |
| Medusa Server | 1 GB | 1.0 |
| Medusa Worker | 512 MB | 0.5 |
| SuperAdmin | 256 MB | 0.25 |
| Redis | 128 MB | 0.1 |
| **Total** | **~2.5 GB** | **~2.35** |

> [!TIP]
> Un Contabo VPS con 4 GB RAM y 4 vCPU es suficiente para este setup.
