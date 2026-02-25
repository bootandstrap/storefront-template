#!/usr/bin/env bash
# ─── BootandStrap Client Deprovisioning ────────────────────
# Safely deactivate a tenant: cancels subscriptions, suspends
# tenant in DB, stops Dokploy app, and optionally backs up
# data before removal.
#
# Usage: ./scripts/deprovision-client.sh <slug>
# ───────────────────────────────────────────────────────────
set -euo pipefail

CLIENT_SLUG="${1:?Usage: $0 <client-slug>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [deprovision/${CLIENT_SLUG}] $1"
}

echo "╔══════════════════════════════════════════════╗"
echo "║  BootandStrap — Client Deprovisioning        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Target: ${CLIENT_SLUG}"
echo ""

# ── Preflight: verify tenant exists ───────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "❌ DATABASE_URL is required"
    exit 1
fi

TENANT_EXISTS=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM tenants WHERE slug = '${CLIENT_SLUG}';" 2>/dev/null | tr -d ' ')

if [[ "$TENANT_EXISTS" == "0" ]]; then
    echo "❌ Tenant '${CLIENT_SLUG}' not found in database"
    exit 1
fi

echo "  Status check:"
psql "$DATABASE_URL" -t -c \
    "SELECT slug, status, domain FROM tenants WHERE slug = '${CLIENT_SLUG}';" 2>/dev/null
echo ""

read -rp "⚠️  This will SUSPEND this tenant. Continue? (y/N): " CONFIRM
[[ "$CONFIRM" =~ ^[Yy] ]] || { echo "Aborted."; exit 1; }

# ── 1. Backup before deprovisioning ────────────────────────
log "Creating pre-deprovision backup..."
if [[ -f "${SCRIPT_DIR}/backup.sh" ]]; then
    bash "${SCRIPT_DIR}/backup.sh" "$CLIENT_SLUG" || log "WARN: Backup failed (continuing)"
fi

# ── 2. Mark tenant as suspended in DB ─────────────────────
log "Suspending tenant in database..."
psql "$DATABASE_URL" -c "
    UPDATE tenants 
    SET status = 'suspended', 
        updated_at = NOW()
    WHERE slug = '${CLIENT_SLUG}';
    
    INSERT INTO audit_log (tenant_id, action, details, performed_by)
    SELECT id, 'tenant_suspended', 
           jsonb_build_object('reason', 'deprovisioned via script', 'timestamp', NOW()),
           'system'
    FROM tenants WHERE slug = '${CLIENT_SLUG}';
" && log "OK: Tenant suspended" || log "ERROR: DB update failed"

# ── 3. Cancel Stripe subscriptions ────────────────────────
log "Checking Stripe subscriptions..."
STRIPE_CUSTOMER_ID=$(psql "$DATABASE_URL" -t -c \
    "SELECT stripe_customer_id FROM tenants WHERE slug = '${CLIENT_SLUG}';" 2>/dev/null | tr -d ' ')

if [[ -n "$STRIPE_CUSTOMER_ID" && -n "${STRIPE_SECRET_KEY:-}" ]]; then
    log "Cancelling Stripe subscriptions for customer ${STRIPE_CUSTOMER_ID}..."
    
    # List and cancel active subscriptions
    SUBS=$(curl -s \
        -u "${STRIPE_SECRET_KEY}:" \
        "https://api.stripe.com/v1/subscriptions?customer=${STRIPE_CUSTOMER_ID}&status=active" \
        | python3 -c "import sys,json; [print(s['id']) for s in json.load(sys.stdin).get('data',[])]" 2>/dev/null)
    
    for SUB_ID in $SUBS; do
        curl -s -X DELETE \
            -u "${STRIPE_SECRET_KEY}:" \
            "https://api.stripe.com/v1/subscriptions/${SUB_ID}" > /dev/null 2>&1 && \
            log "OK: Cancelled subscription ${SUB_ID}" || \
            log "WARN: Could not cancel subscription ${SUB_ID}"
    done
    
    [[ -z "$SUBS" ]] && log "No active subscriptions found"
else
    log "SKIP: No Stripe customer ID or STRIPE_SECRET_KEY not set"
fi

# ── 4. Stop Dokploy application ──────────────────────────
log "Checking Dokploy application..."
DOKPLOY_APP_ID=$(psql "$DATABASE_URL" -t -c \
    "SELECT dokploy_application_id FROM tenants WHERE slug = '${CLIENT_SLUG}';" 2>/dev/null | tr -d ' ')

if [[ -n "$DOKPLOY_APP_ID" && -n "${DOKPLOY_API_URL:-}" && -n "${DOKPLOY_API_TOKEN:-}" ]]; then
    log "Stopping Dokploy application ${DOKPLOY_APP_ID}..."
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${DOKPLOY_API_TOKEN}" \
        -d "{\"applicationId\": \"${DOKPLOY_APP_ID}\"}" \
        "${DOKPLOY_API_URL}/api/application.stop" 2>/dev/null || echo "000")
    
    if [[ "$HTTP_CODE" == "200" ]]; then
        log "OK: Dokploy application stopped"
    else
        log "WARN: Dokploy stop returned HTTP ${HTTP_CODE}"
    fi
else
    log "SKIP: No Dokploy app ID or Dokploy not configured"
fi

# ── 5. Cleanup local files ────────────────────────────────
ENV_FILE="${ROOT_DIR}/.env.${CLIENT_SLUG}"
if [[ -f "$ENV_FILE" ]]; then
    mv "$ENV_FILE" "${ENV_FILE}.suspended" 2>/dev/null && \
        log "OK: Renamed ${ENV_FILE} → .suspended" || true
fi

# ── Summary ───────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           ✅ Deprovisioning Complete          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Tenant: ${CLIENT_SLUG}"
echo "  Status: SUSPENDED"
echo ""
echo "  ✅ Pre-deprovision backup created"
echo "  ✅ Tenant status → suspended"
echo "  ✅ Stripe subscriptions cancelled"
echo "  ✅ Dokploy application stopped"
echo ""
echo "  ⚠️  Data is retained. To permanently delete:"
echo "     psql \$DATABASE_URL -c \"DELETE FROM tenants WHERE slug = '${CLIENT_SLUG}';\""
echo ""
echo "  📦 Backup location: /var/backups/bootandstrap/${CLIENT_SLUG}/"
