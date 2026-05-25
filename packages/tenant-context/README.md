# @bootandstrap/tenant-context

Shared tenant identity resolver for BootandStrap control-plane and tenant runtime surfaces.

Current scope:

- `resolveTenantContext()`
- `TenantContext`
- `ResolveTenantContextInput`

## Installation

```bash
npm install @bootandstrap/tenant-context @bootandstrap/platform-contract
```

For BootandStrap internal consumers, the package is published to GitHub Packages.

## Usage

```ts
import { resolveTenantContext } from '@bootandstrap/tenant-context'

const context = resolveTenantContext({
  profileRole: 'owner',
  profileTenantId: 'tenant-123',
  ownerExperienceMode: 'starter_collaborative',
})
```

## Release

```bash
pnpm changeset
pnpm version
pnpm release
```
