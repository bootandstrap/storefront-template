# Backup & Recovery — BootandStrap Operations

> RPO: 24 hours · RTO: 4 hours · Last reviewed: 2026-02-22

## Overview

BootandStrap uses Supabase Cloud (managed PostgreSQL with automatic PITR) supplemented by application-level backups for governance tables, Redis data, and tenant configurations.

## Automatic Backups

### Supabase (Database)
- **PITR** enabled on Pro plan (7-day retention)
- **Daily automated backups** by Supabase (Dashboard → Database → Backups)
- **Governance tables** backed up nightly via `scripts/backup.sh`

### Application-Level (`scripts/backup.sh`)
- **Schedule**: Daily at 02:00 UTC via cron
- **What it backs up**:
  1. Supabase governance tables: `tenants`, `config`, `feature_flags`, `plan_limits`, `whatsapp_templates`, `profiles`
  2. Redis data: RDB snapshot from container
  3. Client configuration directories
- **Retention**: 30 days (configurable via `RETENTION_DAYS`)
- **Location**: `/var/backups/bootandstrap/{client-slug}/`

### Cron Setup
```bash
# /etc/cron.d/bootandstrap-backup
0 2 * * * root /path/to/ecommerce-template/scripts/backup.sh default >> /var/log/backup.log 2>&1
```

## Manual Backup

```bash
# Backup specific client
./scripts/backup.sh fresh-market

# Backup with custom retention
RETENTION_DAYS=90 ./scripts/backup.sh default
```

## Restore Procedure

### From Application Backup (`scripts/restore.sh`)

```bash
# Interactive restore (will prompt for confirmation)
./scripts/restore.sh 20260222_020000 fresh-market

# Steps performed:
# 1. Restores Supabase governance tables (psql)
# 2. Restores Redis (docker cp + restart)
# 3. Verifies: tenant count + Redis ping
```

### From Supabase PITR

1. Go to Supabase Dashboard → Database → Backups
2. Select the target recovery point (within 7 days)
3. Click "Restore" → follow the wizard
4. After restore, verify application health

### Full Recovery Checklist

1. ☐ Restore database (PITR or backup.sh)
2. ☐ Restore Redis (`restore.sh`)
3. ☐ Verify `scripts/backup-verify.sh` passes
4. ☐ Verify storefront health: `curl /api/health`
5. ☐ Verify SuperAdmin health: `curl /api/health`
6. ☐ Verify Medusa health: `curl :9000/health`
7. ☐ Spot-check: login as owner, view dashboard
8. ☐ Spot-check: browse storefront, add to cart

## Verification (`scripts/backup-verify.sh`)

Monthly automated check:
```bash
SUPABASE_PROJECT_REF=xxx bash scripts/backup-verify.sh
```

Checks:
- Supabase project status (ACTIVE)
- Database connectivity via REST API
- Tenant count as data integrity indicator
- Manual checklist for PITR and backup recency

## Quarterly DR Test

| Quarter | Date | Tested | Result | Notes |
|---------|------|--------|--------|-------|
| Q1 2026 | TBD | ☐ | — | — |

### DR Test Procedure
1. Create staging Supabase project
2. Run `restore.sh` against staging
3. Deploy storefront pointing to staging
4. Execute smoke tests (auth, catalog, checkout)
5. Record results in this table
6. Delete staging project
