# Disaster Recovery Runbook

## Backup Strategy

| Data | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| Medusa DB (per tenant) | `pg_dump` via Docker | Daily 3AM | 30 days |
| Supabase governance | REST API export | Daily 3AM | 30 days |
| Redis cache | `BGSAVE` + copy | Daily 3AM | 7 days |
| Supabase full | Point-in-time (Supabase Pro) | Continuous | 7 days |
| GHCR images | Immutable tags | Indefinite | Per tag |

```bash
# Daily cron (VPS)
0 3 * * * /opt/bootandstrap/scripts/backup-tenant.sh demo /opt/backups
0 3 * * * /opt/bootandstrap/scripts/backup-tenant.sh client1 /opt/backups
```

## Recovery Procedures

### Scenario 1: Medusa Container Crash

**Detection**: Dokploy health check fails → alert
**Impact**: Single tenant storefront down
**Recovery** (< 5 min):

```bash
# 1. Check container status
docker ps -a | grep {slug}-medusa

# 2. Restart via Dokploy
curl -X POST "https://cloud.dokploy.com/api/trpc/application.redeploy" \
  -H "x-api-key: $DOKPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"json":{"applicationId":"APP_ID"}}'

# 3. Verify readiness
curl -s https://{slug}.bootandstrap.com/api/readiness | jq .status
```

### Scenario 2: Supabase Outage

**Detection**: `readiness` probe fails on Supabase check
**Impact**: All tenants — governance, auth, config unavailable
**Recovery**:

1. **Immediate**: Storefront enters maintenance mode automatically (circuit breaker)
2. **Wait**: Check [status.supabase.com](https://status.supabase.com)
3. **If extended**: No action needed — circuit breaker auto-recovers when Supabase returns
4. **Post-recovery**: Verify tenant capabilities re-resolve (`invalidateCache()` for all tenants)

### Scenario 3: VPS Failure (Contabo)

**Detection**: All tenant storefronts unreachable
**Impact**: Total platform outage
**Recovery** (~30 min):

1. **DNS**: Point `*.bootandstrap.com` to backup VPS IP
2. **Restore Docker Swarm** on backup VPS
3. **Pull GHCR images**: `docker pull ghcr.io/bootandstrap/...`
4. **Restore Dokploy config** from backup
5. **Restore tenant databases** from backups:
   ```bash
   cat medusa_db.sql | docker exec -i {slug}-medusa psql -U postgres medusa
   ```
6. **Verify**: Hit readiness endpoints for all tenants

### Scenario 4: Data Corruption

**Detection**: Inconsistent data in SuperAdmin, customer complaints
**Impact**: Affected tenant(s)
**Recovery**:

1. **Identify scope**: Which tenant(s) and table(s) affected
2. **Supabase PITR**: Restore to point before corruption (Supabase Dashboard)
3. **Or manual**: Restore from daily backup JSON files
   ```bash
   # Restore governance data
   curl -X POST "${SUPABASE_URL}/rest/v1/feature_flags" \
     -H "apikey: ${SERVICE_KEY}" \
     -d @backups/feature_flags.json
   ```
4. **Invalidate caches**: Call `invalidateCache(tenantId)` via admin API

### Scenario 5: Stripe Webhook Failure

**Detection**: `tenant_errors` table entries for webhook failures
**Impact**: Module purchases not activating
**Recovery**:

1. **Check**: Stripe Dashboard → Webhooks → Failed events
2. **Retry**: Click "Resend" in Stripe Dashboard
3. **Manual**: If webhook keeps failing:
   ```sql
   -- Manually activate flags
   UPDATE feature_flags SET value = true
   WHERE tenant_id = '...' AND key = 'enable_loyalty_points';
   ```
4. **Fix root cause**: Check webhook endpoint URL + shared secret

## Escalation Matrix

| Severity | Impact | Response Time | Actions |
|----------|--------|---------------|---------|
| SEV-1 | All tenants down | < 15 min | Page on-call, DNS failover |
| SEV-2 | Single tenant down | < 1 hour | Container restart, Dokploy redeploy |
| SEV-3 | Degraded performance | < 4 hours | Scale resources, investigate |
| SEV-4 | Minor issue | Next business day | Fix in next release |

## Health Check Endpoints

| Service | Endpoint | Expected |
|---------|----------|----------|
| Storefront | `/api/readiness` | `{"status":"ok"}` |
| Medusa | `:9000/health` | `200 OK` |
| BSWEB | `/api/health` | `{"status":"ok"}` |
