#!/usr/bin/env bash
# ─── BootandStrap Health Check ─────────────────────────────
# Checks storefront, Medusa API, and Redis.
# 
# Usage: ./scripts/healthcheck.sh [client-slug]
# Add to cron: */5 * * * * /path/to/healthcheck.sh >> /var/log/healthcheck.log 2>&1
# ───────────────────────────────────────────────────────────
set -euo pipefail

CLIENT="${1:-default}"
LOG_FILE="/var/log/bootandstrap/${CLIENT}-health.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"

STOREFRONT_URL="${STOREFRONT_URL:-http://localhost:3000}"
MEDUSA_URL="${MEDUSA_URL:-http://localhost:9000}"
REDIS_HOST="${REDIS_HOST:-localhost}"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [$CLIENT] $1" >> "$LOG_FILE"
}

alert() {
    local msg="$1"
    log "ALERT: ${msg}"
    
    # Webhook alert (Discord, Slack, etc.)
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"🚨 [${CLIENT}] ${msg}\"}" \
            > /dev/null 2>&1 || true
    fi
}

FAILED=0

# Check Storefront
if curl -sf "${STOREFRONT_URL}" -o /dev/null --max-time 10; then
    log "OK: Storefront responding"
else
    alert "Storefront DOWN at ${STOREFRONT_URL}"
    FAILED=$((FAILED + 1))
fi

# Check Medusa API
if curl -sf "${MEDUSA_URL}/health" -o /dev/null --max-time 10; then
    log "OK: Medusa API responding"
else
    alert "Medusa API DOWN at ${MEDUSA_URL}/health"
    FAILED=$((FAILED + 1))
fi

# Check Redis
if redis-cli -h "$REDIS_HOST" ping > /dev/null 2>&1; then
    log "OK: Redis responding"
else
    alert "Redis DOWN at ${REDIS_HOST}"
    FAILED=$((FAILED + 1))
fi

if [[ $FAILED -eq 0 ]]; then
    log "HEALTHY: All services up"
else
    log "UNHEALTHY: ${FAILED} service(s) down"
fi

exit $FAILED
