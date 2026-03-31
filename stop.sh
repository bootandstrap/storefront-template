#!/bin/bash
# ============================================
# stop.sh — Stop all development services
# ============================================
# Stops: Medusa, Storefront (3000+3001), Redis
# Cleans: .next cache to avoid stale builds
#
# Usage: ./stop.sh [--no-cache-clean]
# ============================================

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
REDIS_CONTAINER_NAME="ecommerce-redis-dev"
DEV_REDIS_PID_FILE="$ROOT_DIR/.dev-redis.pid"
STOREFRONT_PORT="${STOREFRONT_PORT:-3000}"
CLEAN_CACHE=1

# Parse flags
for arg in "$@"; do
    case "$arg" in
        --no-cache-clean) CLEAN_CACHE=0 ;;
    esac
done

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

stop_port() {
    local port="$1"
    local pids
    pids="$(lsof -ti :"$port" 2>/dev/null || true)"
    if [[ -z "$pids" ]]; then
        return 0
    fi
    local count=0
    while IFS= read -r pid; do
        [[ -z "$pid" ]] && continue
        echo -e "  ${YELLOW}→${NC} Killing PID ${pid} on port ${port}"
        kill "$pid" 2>/dev/null || true
        count=$((count + 1))
    done <<< "$pids"

    # Wait briefly, then force-kill stragglers
    sleep 0.3
    pids="$(lsof -ti :"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            kill -9 "$pid" 2>/dev/null || true
        done <<< "$pids"
    fi
    return $count
}

echo -e "${YELLOW}⏹  Stopping development services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STOPPED=0

# ── Stop known service ports ─────────────────
# Kill 3000 + 3001 (fallback port) + 9000 (Medusa)
for PORT in "$STOREFRONT_PORT" 3001 9000; do
    PORT_PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"
    if [[ -n "$PORT_PIDS" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${YELLOW}→${NC} Stopping process on port ${PORT} (PID: ${pid})"
            kill "$pid" 2>/dev/null || true
            STOPPED=$((STOPPED + 1))
        done <<< "$PORT_PIDS"
    fi
done

# Force-kill stragglers after a brief wait
sleep 0.5
for PORT in "$STOREFRONT_PORT" 3001 9000; do
    STALE="$(lsof -ti :"$PORT" 2>/dev/null || true)"
    if [[ -n "$STALE" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${RED}→${NC} Force-killing PID ${pid} on port ${PORT}"
            kill -9 "$pid" 2>/dev/null || true
        done <<< "$STALE"
    fi
done

# ── Kill orphaned Medusa / Next workers by name ──
# Zombie pattern: @medusajs/cli spawns child processes (--types workers)
# that survive after parent dies. They don't bind ports, so lsof misses them.
for pattern in "@medusajs/cli" "next-server" "next dev"; do
    ORPHANS="$(pgrep -f "$pattern" 2>/dev/null || true)"
    if [[ -n "$ORPHANS" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${YELLOW}→${NC} Killing orphan ${pattern} (PID: ${pid})"
            kill "$pid" 2>/dev/null || true
            STOPPED=$((STOPPED + 1))
        done <<< "$ORPHANS"
    fi
done

# Wait and force-kill any survivors
sleep 0.5
for pattern in "@medusajs/cli" "next-server" "next dev"; do
    STALE="$(pgrep -f "$pattern" 2>/dev/null || true)"
    if [[ -n "$STALE" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${RED}→${NC} Force-killing orphan ${pattern} (PID: ${pid})"
            kill -9 "$pid" 2>/dev/null || true
        done <<< "$STALE"
    fi
done

# ── Stop local redis started by dev.sh ───────
if [[ -f "$DEV_REDIS_PID_FILE" ]]; then
    REDIS_PID="$(cat "$DEV_REDIS_PID_FILE" 2>/dev/null || true)"
    if [[ -n "${REDIS_PID:-}" ]] && kill -0 "$REDIS_PID" 2>/dev/null; then
        echo -e "  ${YELLOW}→${NC} Stopping local Redis (PID: ${REDIS_PID})"
        kill "$REDIS_PID" 2>/dev/null || true
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

# ── Clean .next cache ────────────────────────
if [[ "$CLEAN_CACHE" -eq 1 ]]; then
    if [[ -d "$ROOT_DIR/apps/storefront/.next" ]]; then
        rm -rf "$ROOT_DIR/apps/storefront/.next"
        echo -e "  ${GREEN}✓${NC} Cleaned storefront .next cache"
    fi
fi

echo ""
if [[ "$STOPPED" -gt 0 ]]; then
    echo -e "${GREEN}✅ ${STOPPED} service(s) stopped.${NC}"
else
    echo -e "${GREEN}✅ No running services found.${NC}"
fi
