#!/usr/bin/env bash
# ─── BootandStrap Restore Script ───────────────────────────
# Restores Supabase governance tables and Redis from backup.
#
# Usage: ./scripts/restore.sh <backup-date> [client-slug]
# Example: ./scripts/restore.sh 20260209_020000 fresh-market
# ───────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DATE="${1:?Usage: $0 <backup-date> [client-slug]}"
CLIENT="${2:-default}"
BACKUP_DIR="/var/backups/bootandstrap/${CLIENT}"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [restore/${CLIENT}] $1"
}

echo "╔════════════════════════════════════════════╗"
echo "║     BootandStrap — Restore from Backup      ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "  Client: ${CLIENT}"
echo "  Date:   ${BACKUP_DATE}"
echo "  Dir:    ${BACKUP_DIR}"
echo ""

# List available backups for this date
echo "Available backups:"
ls -la "${BACKUP_DIR}/"*"${BACKUP_DATE}"* 2>/dev/null || { log "ERROR: No backups found for ${BACKUP_DATE}"; exit 1; }
echo ""

read -rp "⚠️  This will OVERWRITE current data. Continue? (y/N): " CONFIRM
[[ "$CONFIRM" =~ ^[Yy] ]] || { echo "Aborted."; exit 1; }

# ── 1. Restore Supabase ───────────────────────────────────
SUPA_FILE="${BACKUP_DIR}/supabase_${BACKUP_DATE}.sql.gz"
SUPA_FILE_RAW="${BACKUP_DIR}/supabase_${BACKUP_DATE}.sql"

if [[ -f "$SUPA_FILE" ]]; then
    log "Restoring Supabase governance tables..."
    gunzip -c "$SUPA_FILE" | psql "$DATABASE_URL" && \
        log "OK: Supabase restored" || \
        log "ERROR: Supabase restore failed"
elif [[ -f "$SUPA_FILE_RAW" ]]; then
    log "Restoring Supabase governance tables (uncompressed)..."
    psql "$DATABASE_URL" < "$SUPA_FILE_RAW" && \
        log "OK: Supabase restored" || \
        log "ERROR: Supabase restore failed"
else
    log "SKIP: No Supabase backup file found"
fi

# ── 2. Restore Redis ──────────────────────────────────────
REDIS_FILE="${BACKUP_DIR}/redis_${BACKUP_DATE}.rdb"
REDIS_CONTAINER="${REDIS_CONTAINER:-redis-${CLIENT}}"

if [[ -f "$REDIS_FILE" ]]; then
    log "Restoring Redis..."
    docker exec "$REDIS_CONTAINER" redis-cli SHUTDOWN NOSAVE 2>/dev/null || true
    sleep 1
    docker cp "$REDIS_FILE" "${REDIS_CONTAINER}:/data/dump.rdb" && \
        docker start "$REDIS_CONTAINER" && \
        log "OK: Redis restored" || \
        log "ERROR: Redis restore failed"
else
    log "SKIP: No Redis backup file found"
fi

# ── 3. Verify ─────────────────────────────────────────────
log "Verifying restoration..."
if [[ -n "${DATABASE_URL:-}" ]]; then
    TENANT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM tenants WHERE slug = '${CLIENT}';" 2>/dev/null | tr -d ' ')
    log "Tenant records: ${TENANT_COUNT}"
fi

if docker exec "$REDIS_CONTAINER" redis-cli ping > /dev/null 2>&1; then
    log "Redis: responding"
else
    log "Redis: NOT responding"
fi

echo ""
log "Restore complete. Please verify the application is working correctly."
