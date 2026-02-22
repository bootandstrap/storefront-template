# BootandStrap Storefront

Next.js 16 storefront for the BootandStrap SaaS e-commerce template. Features App Router, Server Components, Streaming (Suspense), and Tailwind CSS v4.

## Quick Start

```bash
pnpm dev
```

Opens at [http://localhost:3000](http://localhost:3000). Requires Medusa + Redis running (use `./dev.sh` from repo root).

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/[lang]/(shop)/` | Public storefront routes |
| `src/app/[lang]/(panel)/` | Owner Panel (auth-guarded) |
| `src/app/[lang]/(auth)/` | Login / Registration |
| `src/components/` | Reusable UI components |
| `src/lib/` | Config, Medusa client, i18n, auth, limits |
| `src/contexts/` | CartContext (global state) |

## Full Documentation

See [GEMINI.md](../../GEMINI.md) at the repo root for architecture, patterns, governance, and development guides.
