---
"@bootandstrap/shared": minor
---

## v0.5.0 — Module Registry Alignment & Medusa Integration

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
