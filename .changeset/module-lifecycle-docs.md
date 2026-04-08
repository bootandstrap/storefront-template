---
"@bootandstrap/shared": patch
---

## v0.5.1 — Module Lifecycle & Documentation

### Added
- Full lifecycle validation in E2E drill: activate → upgrade → downgrade → deactivate (71 checks)
- Subscriber governance mapping validation (5 subscribers verified)
- Deactivation path coverage: all 13 Medusa-integrated modules produce cleanup actions

### Documentation
- Subscriber README with governance gate pattern, matrix, and architecture diagram
- Shared package README with MedusaModuleRouter, BillingGateway, and BSWEB bridge docs
- Changesets versioning workflow documented
