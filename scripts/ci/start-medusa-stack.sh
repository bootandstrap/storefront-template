#!/usr/bin/env bash
# =============================================================================
# start-medusa-stack.sh — Start Medusa + Redis for CI E2E tests
# =============================================================================
# Starts the backend stack needed for E2E tests. Tries Docker Compose first,
# falls back to direct process start. Logs are preserved for debugging.
#
# EXIT CODES:
#   0 — Stack started successfully
#   1 — Failed to start
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="${ROOT_DIR}/ci-logs"
mkdir -p "$LOG_DIR"

echo "=== Starting Medusa stack for E2E tests ==="

# Try Docker Compose first
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    echo "  Using Docker Compose..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" up -d redis medusa-server 2>&1 | tee "$LOG_DIR/docker-compose.log"
    echo "  Docker Compose stack started"
else
    echo "  ⚠️  Docker Compose not available — starting Medusa directly"
    echo "  Starting Medusa from $ROOT_DIR/apps/medusa..."
    cd "$ROOT_DIR/apps/medusa"
    pnpm medusa start > "$LOG_DIR/medusa.log" 2>&1 &
    MEDUSA_PID=$!
    echo "  Medusa PID: $MEDUSA_PID"
    echo "$MEDUSA_PID" > /tmp/medusa-ci.pid
    echo "  Logs: $LOG_DIR/medusa.log"
fi

echo "=== Medusa stack start initiated ==="
echo "  Log directory: $LOG_DIR"
