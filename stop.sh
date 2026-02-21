#!/bin/bash
# ============================================
# stop.sh — Stop all development services
# ============================================
# Stops: Medusa, Storefront, SuperAdmin, Redis
#
# Usage: ./stop.sh
# ============================================

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
REDIS_CONTAINER_NAME="ecommerce-redis-dev"
DEV_REDIS_PID_FILE="$ROOT_DIR/.dev-redis.pid"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

docker_ready() {
    command_exists docker && docker info >/dev/null 2>&1
}

stop_pid() {
    local pid="$1"
    local label="$2"
    if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
        return
    fi

    echo -e "  ${YELLOW}→${NC} Stopping ${label} (PID: ${pid})"
    kill "$pid" 2>/dev/null || true
    sleep 0.2
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
    fi
}

echo -e "${YELLOW}⏹  Stopping development services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STOPPED=0

# ── Stop known service ports ─────────────────
for PORT in 3000 3100 9000; do
    PORT_PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"
    if [[ -n "$PORT_PIDS" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            stop_pid "$pid" "process on port $PORT"
            STOPPED=$((STOPPED + 1))
        done <<< "$PORT_PIDS"
    fi
done

# ── Stop local redis started by dev.sh ───────
if [[ -f "$DEV_REDIS_PID_FILE" ]]; then
    REDIS_PID="$(cat "$DEV_REDIS_PID_FILE" 2>/dev/null || true)"
    if [[ -n "${REDIS_PID:-}" ]] && kill -0 "$REDIS_PID" 2>/dev/null; then
        stop_pid "$REDIS_PID" "local Redis"
        STOPPED=$((STOPPED + 1))
    fi
    rm -f "$DEV_REDIS_PID_FILE"
fi

# ── Stop Redis container if Docker is available ──
if docker_ready; then
    if docker ps -q --filter "name=^${REDIS_CONTAINER_NAME}$" | grep -q .; then
        echo -e "  ${YELLOW}→${NC} Stopping Redis container (${REDIS_CONTAINER_NAME})"
        docker stop "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
        docker rm "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
        STOPPED=$((STOPPED + 1))
    else
        echo -e "  ${GREEN}✓${NC} Redis container not running"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Docker unavailable; skipped container cleanup"
fi

echo ""
if [[ "$STOPPED" -gt 0 ]]; then
    echo -e "${GREEN}✅ Services stopped.${NC}"
else
    echo -e "${GREEN}✅ No running services found.${NC}"
fi
