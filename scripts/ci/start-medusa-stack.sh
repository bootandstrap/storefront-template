#!/usr/bin/env bash
# =============================================================================
# start-medusa-stack.sh — Start Medusa + Redis for CI E2E tests
# =============================================================================
set -euo pipefail

echo "=== Starting Medusa stack for E2E tests ==="

# Start Redis and Medusa via Docker Compose
docker compose up -d redis medusa-server 2>/dev/null || {
    echo "⚠️  Docker Compose not available — starting Medusa directly"
    cd apps/medusa
    pnpm medusa start &
    MEDUSA_PID=$!
    echo "Medusa PID: $MEDUSA_PID"
    echo "$MEDUSA_PID" > /tmp/medusa-ci.pid
}

echo "=== Medusa stack started ==="
