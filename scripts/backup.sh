#!/usr/bin/env bash
# ─── BootandStrap Backup Script ────────────────────────────
# Backs up Supabase governance tables, Redis, and configs.
#
# Usage: ./scripts/backup.sh [client-slug]
# Cron:  0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
# ───────────────────────────────────────────────────────────
set -euo pipefail

CLIENT="${1:-default}"
BACKUP_DIR="/var/backups/bootandstrap/${CLIENT}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [backup/${CLIENT}] $1"
}

# ── 1. Supabase governance tables ──────────────────────────
log "Backing up Supabase governance tables..."
TABLES="tenants config feature_flags plan_limits whatsapp_templates profiles"
SUPA_BACKUP="${BACKUP_DIR}/supabase_${DATE}.sql"

if [[ -n "${DATABASE_URL:-}" ]]; then
    for TABLE in $TABLES; do
        pg_dump "$DATABASE_URL" \
            --table="public.${TABLE}" \
            --data-only \
            --no-owner \
            >> "$SUPA_BACKUP" 2>/dev/null || log "WARN: could not dump ${TABLE}"
    done
    gzip "$SUPA_BACKUP" 2>/dev/null && log "OK: Supabase → ${SUPA_BACKUP}.gz" || log "OK: Supabase → ${SUPA_BACKUP}"
else
    log "SKIP: DATABASE_URL not set — Supabase backup skipped"
fi

# ── 2. Redis snapshot ──────────────────────────────────────
log "Backing up Redis..."
REDIS_CONTAINER="${REDIS_CONTAINER:-redis-${CLIENT}}"
REDIS_BACKUP="${BACKUP_DIR}/redis_${DATE}.rdb"

if docker exec "$REDIS_CONTAINER" redis-cli BGSAVE > /dev/null 2>&1; then
    sleep 2  # Wait for BGSAVE
    docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "$REDIS_BACKUP" 2>/dev/null && \
        log "OK: Redis → ${REDIS_BACKUP}" || \
        log "WARN: Could not copy Redis dump"
else
    log "SKIP: Redis container not found or BGSAVE failed"
fi

# ── 3. Client configuration ───────────────────────────────
log "Backing up client configuration..."
CONFIG_BACKUP="${BACKUP_DIR}/config_${DATE}.tar.gz"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="${ROOT_DIR}/clients/${CLIENT}"

if [[ -d "$CLIENT_DIR" ]]; then
    tar -czf "$CONFIG_BACKUP" -C "$ROOT_DIR/clients" "${CLIENT}/" 2>/dev/null && \
        log "OK: Config → ${CONFIG_BACKUP}" || \
        log "WARN: Config backup failed"
else
    log "SKIP: Client directory not found at ${CLIENT_DIR}"
fi

# ── 4. Cleanup old backups ─────────────────────────────────
log "Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
REMAINING=$(find "$BACKUP_DIR" -type f | wc -l)
log "OK: ${REMAINING} backup files retained"

log "Backup complete."
