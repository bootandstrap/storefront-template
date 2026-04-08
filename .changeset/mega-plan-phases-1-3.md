---
"@bootandstrap/shared": minor
---

### Mega Plan Phase 1-3: Platform Governance Unification

- **BillingGateway**: Provider-agnostic billing abstraction (Stripe + Mock)
- **UnifiedProvisioner**: 4-mode pipeline (local/demo/staging/production)
- **ModuleRegistry**: Contract-driven module catalog with feature gates
- **MedusaModuleRouter**: Governance → Medusa action mapping (10 action types)
- **MEDUSA_INTEGRATIONS**: Deep integration metadata for all 13 governance modules
- **Template Drift Check**: Local CLI for template sync verification
- **ModuleGate**: Supastarter-inspired inline gating component (4 variants)
