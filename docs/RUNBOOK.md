# Operational Runbook — ecommerce-template Storefront

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
2. Check logs: `docker logs ecommerce-template-medusa-1 --tail 100`
3. Check Redis: `docker exec ecommerce-template-redis-1 redis-cli ping`
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
2. Check build logs: `docker logs ecommerce-template-storefront-1 --tail 200`
3. Verify env: all required vars in `.env` (see `.env.example`)
4. Rebuild: `docker compose build storefront && docker compose up -d storefront`

### 4. High Latency

**Detection**: Health check `latency_ms` > 1000ms.

**Steps**:
1. Check DB connections: Supabase dashboard → Database → Connections
2. Check Redis memory: `docker exec ecommerce-template-redis-1 redis-cli info memory`
3. Review recent deployments for regressions

### 5. Medusa Crashes with `reading 'def'` Error

**Symptoms**: Medusa fails to start, logs show `Cannot read properties of undefined (reading 'def')` during API route registration.
**Root cause**: Zod 4 (from storefront) hoisted over Medusa's required Zod 3. Medusa uses `._def` which was removed in Zod 4.

**Steps**:
1. Verify `apps/medusa/package.json` has `"zod": "3.25.76"` in dependencies
2. Verify root `package.json` has `pnpm.overrides` with `"zod-validation-error>zod": "3.25.76"`
3. Run `pnpm install` to resolve
4. Restart: `./dev.sh`

### 6. Credential Rotation

**When**: Secret exposed, scheduled rotation, or compliance requirement.

#### Supabase Keys

1. Generate new keys in Supabase Dashboard → Project Settings → API
2. Update `.env`: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy all services: `docker compose up -d --build`
4. Verify: `curl http://localhost:3000/api/health?deep=1`

#### Stripe Keys

1. Roll keys in Stripe Dashboard → Developers → API keys
2. Update `.env`: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Update webhook secret: `STRIPE_WEBHOOK_SECRET`
4. Redeploy storefront
5. Verify: test checkout flow with test card

#### JWT / Cookie Secrets (Medusa)

1. Generate new secrets: `openssl rand -base64 32`
2. Update `.env`: `JWT_SECRET`, `COOKIE_SECRET`
3. Redeploy Medusa (all existing sessions invalidated)
4. Verify: admin login + storefront auth flow

#### Revalidation Secret

1. Generate: `openssl rand -base64 32`
2. Update `.env`: `REVALIDATION_SECRET`
3. Update SuperAdmin config to match
4. Verify: `curl -X POST http://localhost:3000/api/revalidate -d '{"secret":"new-secret"}'`

### 7. Return/Refund Operations

**Managed via Medusa native returns API.**

#### Customer initiates return:
- `POST /api/returns` with `order_id` + `items[]` (gated by `enable_self_service_returns` flag)

#### Owner processes return:
1. View returns in Owner Panel → Devoluciones (or Medusa Admin → Orders → Returns)
2. "Receive" return → Medusa adjusts inventory + processes refund automatically
3. "Cancel" return → Return request dismissed

#### Manual refund (no return):
- Process via Stripe Dashboard → Payments → Select payment → Issue refund

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
2. ✅ `pnpm lint` → warnings only (non-blocking)
3. ✅ `pnpm test:run` → all pass (328 storefront tests, 24 medusa tests)
4. ✅ `pnpm build` → clean build
5. ✅ `docker compose config --quiet` → valid
6. ✅ Health check responds: `curl http://localhost:3000/api/health/live`
7. ✅ Stripe webhooks idempotent: `stripe_webhook_events` table dedup
8. ✅ SuperAdmin mutations validated + audit logged
