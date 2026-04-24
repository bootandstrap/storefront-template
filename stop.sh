#!/bin/bash
# ============================================
# stop.sh — Stop all development services
# ============================================
# Stops: Medusa, Storefront, Redis, react-rewrite,
#        react-email preview, and orphaned workers
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
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m'

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

docker_ready() {
    command_exists docker && docker info >/dev/null 2>&1
}

echo -e "${YELLOW}⏹  Stopping development services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STOPPED=0

# ── All known dev ports ──────────────────────
# 3000  = Storefront (Next.js)
# 3001  = Storefront fallback / alt port
# 3333  = react-email preview server
# 3456  = react-rewrite proxy
# 3457  = react-rewrite WebSocket
# 9000  = Medusa API
# 6379  = Redis (local)
DEV_PORTS=("$STOREFRONT_PORT" 3001 3333 3456 3457 9000 6379)

echo -e "\n${BLUE}[1/4]${NC} Killing processes on dev ports..."
for PORT in "${DEV_PORTS[@]}"; do
    PORT_PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"
    if [[ -n "$PORT_PIDS" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            # Get process name for nicer output
            PROC_NAME="$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")"
            echo -e "  ${YELLOW}→${NC} :${PORT}  PID ${pid}  ${DIM}(${PROC_NAME})${NC}"
            kill "$pid" 2>/dev/null || true
            STOPPED=$((STOPPED + 1))
        done <<< "$PORT_PIDS"
    fi
done

# Brief wait, then force-kill stragglers
sleep 0.5
for PORT in "${DEV_PORTS[@]}"; do
    STALE="$(lsof -ti :"$PORT" 2>/dev/null || true)"
    if [[ -n "$STALE" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${RED}→${NC} Force-killing PID ${pid} on :${PORT}"
            kill -9 "$pid" 2>/dev/null || true
        done <<< "$STALE"
    fi
done

# ── Kill orphaned workers by name ────────────
echo -e "\n${BLUE}[2/4]${NC} Killing orphaned workers..."
PROCESS_PATTERNS=(
    "@medusajs/cli"
    "next-server"
    "next dev"
    "react-rewrite"
    "react-email"
    "turbopack"
)

for pattern in "${PROCESS_PATTERNS[@]}"; do
    ORPHANS="$(pgrep -f "$pattern" 2>/dev/null || true)"
    if [[ -n "$ORPHANS" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${YELLOW}→${NC} Killing orphan ${DIM}${pattern}${NC} (PID: ${pid})"
            kill "$pid" 2>/dev/null || true
            STOPPED=$((STOPPED + 1))
        done <<< "$ORPHANS"
    fi
done

# Wait and force-kill any survivors
sleep 0.5
for pattern in "${PROCESS_PATTERNS[@]}"; do
    STALE="$(pgrep -f "$pattern" 2>/dev/null || true)"
    if [[ -n "$STALE" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${RED}→${NC} Force-killing orphan ${pattern} (PID: ${pid})"
            kill -9 "$pid" 2>/dev/null || true
        done <<< "$STALE"
    fi
done

# ── Stop Redis ───────────────────────────────
echo -e "\n${BLUE}[3/4]${NC} Stopping Redis..."

if [[ -f "$DEV_REDIS_PID_FILE" ]]; then
    REDIS_PID="$(cat "$DEV_REDIS_PID_FILE" 2>/dev/null || true)"
    if [[ -n "${REDIS_PID:-}" ]] && kill -0 "$REDIS_PID" 2>/dev/null; then
        echo -e "  ${YELLOW}→${NC} Stopping local Redis (PID: ${REDIS_PID})"
        kill "$REDIS_PID" 2>/dev/null || true
        STOPPED=$((STOPPED + 1))
    fi
    rm -f "$DEV_REDIS_PID_FILE"
fi

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
    echo -e "  ${DIM}Docker unavailable; skipped container cleanup${NC}"
fi

# ── Clean caches ─────────────────────────────
echo -e "\n${BLUE}[4/4]${NC} Cleaning caches..."

if [[ "$CLEAN_CACHE" -eq 1 ]]; then
    if [[ -d "$ROOT_DIR/apps/storefront/.next" ]]; then
        rm -rf "$ROOT_DIR/apps/storefront/.next"
        echo -e "  ${GREEN}✓${NC} Cleaned storefront .next cache"
    else
        echo -e "  ${DIM}No .next cache to clean${NC}"
    fi
    # Clean Turbo persistent caches (prevents stale module graph)
    for turbo_dir in "$ROOT_DIR/.turbo" "$ROOT_DIR/packages/shared/.turbo" "$ROOT_DIR/apps/medusa/.turbo" "$ROOT_DIR/apps/storefront/node_modules/.cache"; do
        if [[ -d "$turbo_dir" ]]; then
            rm -rf "$turbo_dir"
            echo -e "  ${GREEN}✓${NC} Cleaned $(basename "$(dirname "$turbo_dir")")/$(basename "$turbo_dir")"
        fi
    done
else
    echo -e "  ${DIM}Cache clean skipped (--no-cache-clean)${NC}"
fi

# ── Final verification ───────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$STOPPED" -gt 0 ]]; then
    echo -e "${GREEN}✅ ${STOPPED} service(s) stopped.${NC}"
else
    echo -e "${GREEN}✅ No running services found.${NC}"
fi

# Quick port verification
STILL_OPEN=""
for PORT in "${DEV_PORTS[@]}"; do
    if lsof -ti :"$PORT" >/dev/null 2>&1; then
        STILL_OPEN="${STILL_OPEN} :${PORT}"
    fi
done
if [[ -n "$STILL_OPEN" ]]; then
    echo -e "${YELLOW}⚠ Ports still in use:${STILL_OPEN}${NC}"
else
    echo -e "${GREEN}✓ All dev ports clear.${NC}"
fi
