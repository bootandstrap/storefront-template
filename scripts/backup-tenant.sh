#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# backup-tenant.sh — Tenant data backup script
# Usage: ./scripts/backup-tenant.sh <tenant_slug> [backup_dir]
# Cron:  0 3 * * * /opt/bootandstrap/scripts/backup-tenant.sh demo /opt/backups
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

TENANT_SLUG="${1:?Usage: backup-tenant.sh <tenant_slug> [backup_dir]}"
BACKUP_DIR="${2:-/tmp/bns-backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TENANT_SLUG}/${DATE}"
RETENTION_DAYS=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[backup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1" >&2; }

# ── Validate prerequisites ──────────────────────────────────────
command -v docker >/dev/null 2>&1 || { err "docker not found"; exit 1; }

MEDUSA_CONTAINER="${TENANT_SLUG}-medusa"
if ! docker ps --format '{{.Names}}' | grep -q "^${MEDUSA_CONTAINER}"; then
    err "Container ${MEDUSA_CONTAINER} not running"
    exit 1
fi

# ── Create backup directory ─────────────────────────────────────
mkdir -p "${BACKUP_PATH}"
log "Backing up tenant '${TENANT_SLUG}' → ${BACKUP_PATH}"

# ── 1. Medusa PostgreSQL dump ───────────────────────────────────
log "1/4 Dumping Medusa database..."
if docker exec "${MEDUSA_CONTAINER}" pg_dump -U postgres medusa \
    --no-owner --no-privileges --clean --if-exists \
    > "${BACKUP_PATH}/medusa_db.sql" 2>/dev/null; then
    MEDUSA_SIZE=$(wc -c < "${BACKUP_PATH}/medusa_db.sql" | tr -d ' ')
    log "  ✓ medusa_db.sql (${MEDUSA_SIZE} bytes)"
else
    warn "  ✗ Medusa dump failed (container may not have pg_dump)"
fi

# ── 2. Supabase governance data (via REST API) ──────────────────
log "2/4 Exporting governance data..."
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -n "${SUPABASE_URL}" ] && [ -n "${SUPABASE_SERVICE_KEY}" ]; then
    # Get tenant_id
    TENANT_ID=$(curl -s "${SUPABASE_URL}/rest/v1/tenants?slug=eq.${TENANT_SLUG}&select=id" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" | \
        python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)

    if [ -n "${TENANT_ID}" ]; then
        TABLES=("config" "feature_flags" "plan_limits" "module_orders" "module_order_items" "capability_overrides" "project_phases")
        for TABLE in "${TABLES[@]}"; do
            curl -s "${SUPABASE_URL}/rest/v1/${TABLE}?tenant_id=eq.${TENANT_ID}" \
                -H "apikey: ${SUPABASE_SERVICE_KEY}" \
                -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                > "${BACKUP_PATH}/${TABLE}.json" 2>/dev/null
            log "  ✓ ${TABLE}.json"
        done
    else
        warn "  Tenant '${TENANT_SLUG}' not found in Supabase"
    fi
else
    warn "  Skipping (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set)"
fi

# ── 3. Redis dump ───────────────────────────────────────────────
log "3/4 Dumping Redis..."
REDIS_CONTAINER="${TENANT_SLUG}-redis"
if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}"; then
    docker exec "${REDIS_CONTAINER}" redis-cli BGSAVE >/dev/null 2>&1
    sleep 2
    docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "${BACKUP_PATH}/redis.rdb" 2>/dev/null && \
        log "  ✓ redis.rdb" || warn "  ✗ Redis dump failed"
else
    warn "  Redis container not found"
fi

# ── 4. Compress ─────────────────────────────────────────────────
log "4/4 Compressing..."
ARCHIVE="${BACKUP_DIR}/${TENANT_SLUG}/${TENANT_SLUG}_${DATE}.tar.gz"
tar -czf "${ARCHIVE}" -C "${BACKUP_DIR}/${TENANT_SLUG}" "${DATE}" 2>/dev/null
rm -rf "${BACKUP_PATH}"
ARCHIVE_SIZE=$(wc -c < "${ARCHIVE}" | tr -d ' ')
log "  ✓ ${ARCHIVE} (${ARCHIVE_SIZE} bytes)"

# ── 5. Cleanup old backups ──────────────────────────────────────
CLEANED=$(find "${BACKUP_DIR}/${TENANT_SLUG}" -name "*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l | tr -d ' ')
if [ "${CLEANED}" -gt 0 ]; then
    log "  Cleaned ${CLEANED} backups older than ${RETENTION_DAYS} days"
fi

# ── Summary ─────────────────────────────────────────────────────
echo ""
log "═══ Backup complete ═══"
log "  Tenant:  ${TENANT_SLUG}"
log "  Archive: ${ARCHIVE}"
log "  Size:    ${ARCHIVE_SIZE} bytes"
log "  Date:    ${DATE}"
