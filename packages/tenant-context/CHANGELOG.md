# @bootandstrap/tenant-context

## 1.0.0

### Minor Changes

- 19e64ca: Make `platform-contract` and `tenant-context` publishable through GitHub Packages with built `dist` artifacts, explicit package metadata, and a shared pack workflow.

  Also generalize `tenant-context` so auth-scoped `profileTenantId` is preserved for non-panel actors while panel authorization still depends on `isPanelRole`.

### Patch Changes

- Updated dependencies [19e64ca]
  - @bootandstrap/platform-contract@0.2.0
