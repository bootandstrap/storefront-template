# Documentation Index — Storefront Template

> Source of truth hierarchy: root `GEMINI.md` > per-repo `GEMINI.md` > these docs.

## Active Documentation

### Architecture
- [`ARCHITECTURE.md`](architecture/ARCHITECTURE.md) — System architecture, component relationships
- [`DOMAIN_SPLIT.md`](architecture/DOMAIN_SPLIT.md) — Control Plane vs Data Plane separation
- [`STACK_REFERENCE.md`](architecture/STACK_REFERENCE.md) — Technology stack versions
- [`SUPABASE_SCHEMA.md`](architecture/SUPABASE_SCHEMA.md) — Database schema reference

### Flows
- [`AUTH_FLOW.md`](flows/AUTH_FLOW.md) — Authentication & authorization flow
- [`CHECKOUT_FLOWS.md`](flows/CHECKOUT_FLOWS.md) — Multi-method checkout (Stripe, COD, bank, WhatsApp)
- [`MEDUSA_CUSTOMIZATIONS.md`](flows/MEDUSA_CUSTOMIZATIONS.md) — Medusa backend extensions

### Guides
- [`DEPLOYMENT.md`](guides/DEPLOYMENT.md) — Deployment procedures
- [`DEVELOPMENT.md`](guides/DEVELOPMENT.md) — Local development setup
- [`TEMPLATE_USAGE.md`](guides/TEMPLATE_USAGE.md) — How to use this template

### Operations
- [`API_REFERENCE.md`](operations/API_REFERENCE.md) — API endpoint reference
- [`CLIENT_HANDOFF.md`](operations/CLIENT_HANDOFF.md) — Client handoff checklist
- [`SCHEMA_OWNERSHIP.md`](operations/SCHEMA_OWNERSHIP.md) — Schema ownership rules
- [`SECRETS_ROTATION_RUNBOOK.md`](operations/SECRETS_ROTATION_RUNBOOK.md) — Secret rotation procedures
- [`DEPENDENCY_RISK_REGISTER.md`](operations/DEPENDENCY_RISK_REGISTER.md) — Dependency risk tracking

### Contracts & Security
- [`production-contracts.md`](production-contracts.md) — Production contract definitions
- [`flag-limit-enforcement-catalog.md`](flag-limit-enforcement-catalog.md) — Feature flag & limit enforcement catalog
- [`rls-access-control.md`](rls-access-control.md) — Row-Level Security access matrix
- [`BACKUP_RECOVERY.md`](BACKUP_RECOVERY.md) — Backup and recovery procedures
- [`RUNBOOK.md`](RUNBOOK.md) — Operational runbook

## Archived (Superseded)

Files in `archive/` are historical references. They have been superseded by documents above or by root-level GEMINI.md docs.

- `archive/DEPLOYMENT.md` → replaced by `guides/DEPLOYMENT.md`
- `archive/DOCS_GUIDE.md` → replaced by this README
- `archive/ROADMAP.md` → replaced by root `GEMINI.md` milestones table
