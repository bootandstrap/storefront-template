# Operational Runbook — CAMPIFRUT Storefront

## Health Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `GET /api/health` | Quick status + uptime | Monitoring dashboards |
| `GET /api/health?deep=1` | Full dependency check | Manual debugging |
| `GET /api/health/live` | Liveness probe | Docker `HEALTHCHECK`, k8s `livenessProbe` |
| `GET /api/health/ready` | Readiness probe | Load balancer, k8s `readinessProbe` |

### Expected Responses

**Healthy** (HTTP 200):
```json
{ "status": "ok", "checks": { "supabase": { "status": "ok", "latency_ms": 45 }, "medusa": { "status": "ok", "latency_ms": 120 } } }
```

**Degraded** (HTTP 503):
```json
{ "status": "degraded", "checks": { "supabase": { "status": "ok" }, "medusa": { "status": "error", "error": "Medusa unreachable" } } }
```

---

## Common Incidents

### 1. Medusa API Down

**Symptoms**: Products don't load, checkout fails.
**Detection**: `/api/health/ready` returns `medusa.status: "error"`.

**Steps**:
1. Check Medusa container: `docker ps | grep medusa`
2. Check logs: `docker logs campifrut-medusa-1 --tail 100`
3. Check Redis: `docker exec campifrut-redis-1 redis-cli ping`
4. Restart: `docker compose restart medusa`

### 2. Supabase Connection Issues

**Symptoms**: Auth fails, config not loading, analytics not recording.
**Detection**: `/api/health/ready` shows `supabase.status: "error"`.

**Steps**:
1. Check Supabase status: https://status.supabase.com
2. Verify env vars are set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Test connection: `curl -H "apikey: $ANON_KEY" "$SUPABASE_URL/rest/v1/config?limit=1"`
4. If credentials rotated, update `.env` and restart

### 3. Storefront Not Starting

**Steps**:
1. Check container: `docker ps | grep storefront`
2. Check build logs: `docker logs campifrut-storefront-1 --tail 200`
3. Verify env: all required vars in `.env` (see `.env.example`)
4. Rebuild: `docker compose build storefront && docker compose up -d storefront`

### 4. High Latency

**Detection**: Health check `latency_ms` > 1000ms.

**Steps**:
1. Check DB connections: Supabase dashboard → Database → Connections
2. Check Redis memory: `docker exec campifrut-redis-1 redis-cli info memory`
3. Review recent deployments for regressions

---

## Structured Logging

Logs are emitted as JSON for aggregation:

```json
{
  "level": "info",
  "message": "Order placed",
  "timestamp": "2026-02-10T00:00:00.000Z",
  "service": "storefront",
  "tenant_id": "tenant-abc",
  "request_id": "req-123"
}
```

### Log Levels
- **debug**: Verbose dev-only info (suppressed in production)
- **info**: Normal operations (order placed, config loaded)
- **warn**: Recoverable issues (rate limit, missing optional env var)
- **error**: Failures requiring attention (API down, auth failure)

### Filtering Logs
```bash
# All errors for a specific tenant
docker logs storefront | jq 'select(.level == "error" and .tenant_id == "abc")'

# All logs for a specific request
docker logs storefront | jq 'select(.request_id == "req-123")'
```

---

## Deployment Checklist

1. ✅ All env vars set (no `PLACEHOLDER_` values)
2. ✅ `pnpm lint` → 0 errors, 0 warnings
3. ✅ `pnpm test:run` → all pass
4. ✅ `pnpm build` → clean build
5. ✅ `docker compose config --quiet` → valid
6. ✅ No hardcoded secrets (`rg supersecret` returns nothing)
7. ✅ Health check responds: `curl http://localhost:3000/api/health/live`
