# _DEPRECATED — Historical Governance Migration Archive

These files are preserved as the original migration history that once lived in
`ecommerce-template/supabase/migrations/`.

> ⚠️ Do not re-apply these files from the data-plane repo.
> Their schema is now governed by `BOOTANDSTRAP_WEB`, which is the canonical
> owner for governance tables and the source of truth for the shared Supabase
> schema.

## Why archived?

The current cross-repo ownership contract is explicit:

- governance tables such as `config`, `email_preferences`, and `email_log`
  are owned by `BOOTANDSTRAP_WEB`
- `ecommerce-template` may read or write tenant-scoped data through approved
  contracts, but it does not own governance schema evolution
- the live shared schema is reflected in `BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql`

These files remain here only as historical reference because they introduced
governance-table DDL from the data-plane repo before the ownership contract was
fully enforced.

## Archived files

- `20260412_custom_email_domain.sql`
- `20260413_email_governance_v1.sql`
- `20260711_automation_notification_config.sql`

## Canonical source

For active governance schema, use:

- `../generated/` for generated artifacts in this repo
- `../../../../BOOTANDSTRAP_WEB/supabase/migrations/00_GROUND_TRUTH.sql` for
  the canonical shared schema snapshot
