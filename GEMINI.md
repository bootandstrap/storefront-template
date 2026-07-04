# Gemini Adapter — ecommerce-template

Workspace harness: `../BOOTANDSTRAP_WEB/docs/ai/ENGINEERING_HARNESS.md`.

Role: this repo is the **canonical tenant runtime template**. It owns reusable
storefront, tenant panel and Medusa-integrated runtime behavior. It does not own
SaaS lifecycle, provisioning authority, recovery policy or billing control-plane
semantics.

## Template-first propagation

Reusable fixes originate and pass here before propagation to tenant repos.
Campifruit may reproduce a runtime defect, but it does not become the source of
the generic fix. Record source verification separately from runtime proof.

If the workspace harness is unavailable, preserve this boundary as the fail-safe.

## Read before editing

1. Workspace harness when available
2. `AGENTS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/PRODUCTION_CONTRACTS.md`
5. `.agent/workflows/dev.md` or `.agent/workflows/customize.md`
6. `docs/SCHEMA.md`, `docs/FLOWS.md` or `docs/MODULE_SDK.md` for the affected domain

## Zone map

### Customize

- branding tokens, tenant-safe home composition and public assets;
- shared copy through all five locale dictionaries;
- email content without altering platform-owned layout contracts.

### Extend carefully

- product, cart, checkout, account and reusable UI components;
- shop routes while preserving i18n, SEO and Medusa flow.

### Platform-sensitive

- `apps/storefront/src/lib/medusa/`, `lib/supabase/`, `lib/security/`;
- governance config/flags/limits and panel runtime;
- API routes, auth, proxy, analytics, email registry/layouts;
- Medusa image, migrations, CI/CD and environment contracts.

Platform-sensitive does not mean “never fix”. It means require contract evidence,
focused tests and source ownership before editing.

## Runtime invariants

- Preserve feature-flag and limit enforcement.
- Keep server-only modules out of client bundles.
- Preserve auth, checkout, payment and Medusa data flow.
- Keep five locales synchronized.
- Use structured logging; do not introduce production `console.log`.
- Do not hardcode commercial prices or governance outputs.
- Do not weaken strict types, release gates, audit or schema ownership.

## Verification

Use the repo-declared runtime. For the active slice:

```bash
CI=true npx -y pnpm@9.15.4 exec vitest run src/lib/__tests__/agent-doc-contract.test.ts
CI=true npx -y pnpm@9.15.4 exec turbo type-check --filter=storefront
CI=true npx -y pnpm@9.15.4 test:run
CI=true npx -y pnpm@9.15.4 build
bash scripts/release-gate.sh
git diff --check
```

Add governance audit, schema ownership and Sentrux check/gate when affected.
Do not reset `.sentrux/baseline.json` until final closure.
