# Quick Start — BootandStrap Storefront (5 minutes)

> For detailed development docs, see [`DEVELOPMENT.md`](./DEVELOPMENT.md).

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 8 | `npm i -g pnpm` |
| PostgreSQL | ≥ 14 | [postgresql.org](https://www.postgresql.org/download/) |
| Docker | Any | [docker.com](https://www.docker.com) (optional, for Redis) |

## Setup

```bash
# 1. Clone the repository
git clone <repo-url> && cd ecommerce-template

# 2. Run the interactive setup
npx tsx scripts/setup-local-dev.ts

# 3. Start development
./dev.sh
```

The setup script will:
- ✅ Check prerequisites
- ✅ Prompt for Supabase credentials
- ✅ Auto-generate secrets (JWT, cookies, admin password)
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Seed demo data

## URLs

| Service | URL |
|---------|-----|
| Storefront | http://localhost:3000/es |
| Medusa Admin | http://localhost:9000/app |
| Medusa API | http://localhost:9000 |

## Dev Tenant

To get a fully-featured dev tenant with all modules at max tier:

```bash
# From BOOTANDSTRAP_WEB directory
npx tsx scripts/demo-tenant-engine.ts --up
```

See `DEVELOPMENT.md` for details.

## Common Issues

| Issue | Fix |
|-------|-----|
| Storefront shows "Maintenance Mode" | Check `GOVERNANCE_SUPABASE_ANON_KEY` in `.env` |
| Medusa boot fails | Ensure PostgreSQL is running + check `DATABASE_URL` |
| Redis connection errors | Redis is optional — `dev.sh` handles this gracefully |
| "Invalid API key" | Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches your Supabase project |

## Manual Setup (Alternative)

If you prefer manual configuration:

```bash
cp .env.template .env
# Edit .env with your values
pnpm install
cd apps/medusa && npx medusa db:migrate
cd ../.. && ./dev.sh
```
