#!/usr/bin/env bash
# =============================================================================
# wait-for-health.sh — Poll health endpoints until services are ready
# =============================================================================
# Fail-closed: exits 1 if the endpoint is not reachable within the timeout.
#
# Usage: bash wait-for-health.sh [URL] [MAX_WAIT_SECONDS]
#
# EXIT CODES:
#   0 — Health endpoint responded 200
#   1 — Timeout reached — endpoint never responded
# =============================================================================
set -euo pipefail

URL="${1:-http://localhost:9000/health}"
MAX_WAIT="${2:-120}"  # seconds
INTERVAL=3

echo "⏳ Waiting for $URL (max ${MAX_WAIT}s)..."

elapsed=0
while [ "$elapsed" -lt "$MAX_WAIT" ]; do
    HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $URL is ready (${elapsed}s) — HTTP $HTTP_CODE"
        exit 0
    fi

    sleep "$INTERVAL"
    elapsed=$((elapsed + INTERVAL))

    if [ $((elapsed % 15)) -eq 0 ]; then
        echo "  ⏳ ${elapsed}s... (last response: HTTP $HTTP_CODE)"
    fi
done

echo ""
echo "❌ FAIL-CLOSED: $URL not ready after ${MAX_WAIT}s"
echo "   Last HTTP code: $HTTP_CODE"
echo "   This is a hard failure — E2E tests will not run without a healthy backend."
exit 1
