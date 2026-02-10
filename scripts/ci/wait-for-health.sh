#!/usr/bin/env bash
# =============================================================================
# wait-for-health.sh — Poll health endpoints until services are ready
# =============================================================================
set -euo pipefail

URL="${1:-http://localhost:9000/health}"
MAX_WAIT="${2:-120}"  # seconds
INTERVAL=3

echo "Waiting for $URL (max ${MAX_WAIT}s)..."

elapsed=0
while [ "$elapsed" -lt "$MAX_WAIT" ]; do
    if curl -sf "$URL" > /dev/null 2>&1; then
        echo "✅ $URL is ready (${elapsed}s)"
        exit 0
    fi
    sleep $INTERVAL
    elapsed=$((elapsed + INTERVAL))
    echo "  ⏳ ${elapsed}s..."
done

echo "❌ $URL not ready after ${MAX_WAIT}s"
exit 1
