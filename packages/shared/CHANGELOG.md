# @bootandstrap/shared

## 0.5.0

### Minor Changes

- b7e245a: ## v0.6.0 — MEGA PLAN 2: Platform Completion

  ### Phase 7: Distribution Pipeline

  - Changesets-integrated publish workflow (semantic versioning + CHANGELOG)
  - Turborepo governance pipeline (generate-contract → build → test → drill)
  - BSWEB shared-imports prepared for package switchover (commented imports ready)

  ### Phase 8: Medusa Deep Integration

  - 4 new Medusa modules: POS, CRM, Email Marketing, Automation
    - POS: PosSession, PosTransaction, PosShift (3 models)
    - CRM: CrmContact, CrmInteraction, CrmSegment (3 models)
    - Email: EmailCampaign, EmailTemplate, EmailSend (3 models)
    - Automation: AutomationRule, AutomationExecution (2 models)
  - 3 Link Modules: Customer↔CRM, Order↔POS, Product↔Review
  - Stripe metadata sync script (test mode, idempotent)

  ### Phase 9: Infrastructure

  - .templatesyncignore already existed (verified complete)
  - Governance Execute API already existed (315 LOC, full executor registry)
  - provisionTenantCore and UnifiedProvisioner work complementarily (no refactor needed)

  ### Phase 10: Analytics & Observability

  - Client-side batch analytics tracker (5s flush, 10-event buffer, sendBeacon)
  - 6 dashboard query functions (KPIs, funnel, top products, revenue, visitors, module usage)
  - MeteringEngine design document (future implementation guide)

- b7e245a: ### Mega Plan Phase 1-3: Platform Governance Unification

  - **BillingGateway**: Provider-agnostic billing abstraction (Stripe + Mock)
  - **UnifiedProvisioner**: 4-mode pipeline (local/demo/staging/production)
  - **ModuleRegistry**: Contract-driven module catalog with feature gates
  - **MedusaModuleRouter**: Governance → Medusa action mapping (10 action types)
  - **MEDUSA_INTEGRATIONS**: Deep integration metadata for all 13 governance modules
  - **Template Drift Check**: Local CLI for template sync verification
  - **ModuleGate**: Supastarter-inspired inline gating component (4 variants)

- b7e245a: ## v0.5.0 — Module Registry Alignment & Medusa Integration

  ### Fixed

  - `GovernanceContractSource` type now matches the real contract format (`modules.catalog[]` with `flag_effects`/`limit_effects`)
  - `createModuleRegistry()` reads `flag_effects`/`limit_effects` from contract tiers instead of the old `flags`/`limits` format
  - Module dependencies now derived from contract `requires` field

  ### Added

  - Convenience methods on registry: `getAllModules()`, `getFeatureGateMap()`, `getPanelPolicy()`
  - 13 Medusa integration definitions covering all governance modules
  - `version` field on `GovernanceContractSource`
  - `payment_types` and `count` fields on modules section

  ### Internal

  - E2E Provisioning Drill validates full pipeline: 59/59 checks passing
  - Registry builder enriches from `modules.catalog[].flag_effects` (real format)

### Patch Changes

- b7e245a: ## v0.5.1 — Module Lifecycle & Documentation

  ### Added

  - Full lifecycle validation in E2E drill: activate → upgrade → downgrade → deactivate (71 checks)
  - Subscriber governance mapping validation (5 subscribers verified)
  - Deactivation path coverage: all 13 Medusa-integrated modules produce cleanup actions

  ### Documentation

  - Subscriber README with governance gate pattern, matrix, and architecture diagram
  - Shared package README with MedusaModuleRouter, BillingGateway, and BSWEB bridge docs
  - Changesets versioning workflow documented
