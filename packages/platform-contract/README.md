# @bootandstrap/platform-contract

Shared contract primitives for BootandStrap platform surfaces.

Current scope:

- `OwnerExperienceMode`
- `PanelRole`
- `normalizeOwnerExperienceMode()`
- `isPanelRole()`

## Installation

```bash
npm install @bootandstrap/platform-contract
```

For BootandStrap internal consumers, the package is published to GitHub Packages.

## Usage

```ts
import {
  normalizeOwnerExperienceMode,
  isPanelRole,
  type OwnerExperienceMode,
  type PanelRole,
} from '@bootandstrap/platform-contract'
```

## Release

```bash
pnpm changeset
pnpm version
pnpm release
```
