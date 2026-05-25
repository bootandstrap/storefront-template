---
'@bootandstrap/platform-contract': minor
'@bootandstrap/tenant-context': minor
---

Make `platform-contract` and `tenant-context` publishable through GitHub Packages with built `dist` artifacts, explicit package metadata, and a shared pack workflow.

Also generalize `tenant-context` so auth-scoped `profileTenantId` is preserved for non-panel actors while panel authorization still depends on `isPanelRole`.
