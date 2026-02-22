#!/bin/bash
# ============================================
# E-Commerce Template — Development Startup Script
# ============================================
# Starts local development services:
#   • Redis (existing local, Docker, or local redis-server)
#   • Medusa backend (native — hot-reload)
#   • Storefront (native — hot-reload)
#
# Usage: ./dev.sh
# Stop:  Ctrl+C
# ============================================

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
REDIS_CONTAINER_NAME="ecommerce-redis-dev"
DEV_REDIS_PID_FILE="$ROOT_DIR/.dev-redis.pid"
STOREFRONT_PORT="${STOREFRONT_PORT:-3000}"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PIDS=()
REDIS_DOCKER_STARTED=0
REDIS_LOCAL_PID=""
REDIS_READY=0
DONE_CLEANUP=0

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

is_port_open() {
    local port="$1"
    if command_exists lsof; then
        lsof -ti :"$port" >/dev/null 2>&1
        return $?
    fi
    if command_exists nc; then
        nc -z localhost "$port" >/dev/null 2>&1
        return $?
    fi
    return 1
}

wait_for_port() {
    local port="$1"
    local max_retries="${2:-20}"
    local i
    for ((i = 1; i <= max_retries; i++)); do
        if is_port_open "$port"; then
            return 0
        fi
        sleep 0.5
    done
    return 1
}

cleanup() {
    if [[ "$DONE_CLEANUP" -eq 1 ]]; then
        return
    fi
    DONE_CLEANUP=1

    echo -e "\n${YELLOW}⏹  Stopping services...${NC}"

    for pid in "${PIDS[@]:-}"; do
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    for pid in "${PIDS[@]:-}"; do
        if [[ -n "$pid" ]]; then
            wait "$pid" 2>/dev/null || true
        fi
    done

    if [[ "$REDIS_DOCKER_STARTED" -eq 1 ]] && command_exists docker; then
        docker stop "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
        docker rm "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
    fi

    if [[ -n "$REDIS_LOCAL_PID" ]] && kill -0 "$REDIS_LOCAL_PID" 2>/dev/null; then
        kill "$REDIS_LOCAL_PID" 2>/dev/null || true
        wait "$REDIS_LOCAL_PID" 2>/dev/null || true
    fi
    rm -f "$DEV_REDIS_PID_FILE"

    echo -e "${GREEN}✓  Services stopped.${NC}"
}

trap 'cleanup; exit 130' INT TERM
trap cleanup EXIT

start_service() {
    local label="$1"
    local dir="$2"
    local cmd="$3"
    (
        set -o pipefail
        cd "$dir"
        bash -lc "$cmd" 2>&1 | sed "s/^/  [$label] /"
    ) &
    PIDS+=("$!")
}

echo -e "${GREEN}🍊 E-Commerce Template — Starting Development Environment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Prechecks ──────────────────────────────
if ! command_exists pnpm; then
    echo -e "${RED}✗ pnpm is required but not found in PATH.${NC}"
    exit 1
fi

if [[ ! -d "$ROOT_DIR/apps/medusa" ]] || [[ ! -d "$ROOT_DIR/apps/storefront" ]]; then
    echo -e "${RED}✗ Expected apps/medusa and apps/storefront in $ROOT_DIR${NC}"
    exit 1
fi

if [[ -f "$DEV_REDIS_PID_FILE" ]]; then
    OLD_REDIS_PID="$(cat "$DEV_REDIS_PID_FILE" 2>/dev/null || true)"
    if [[ -n "${OLD_REDIS_PID:-}" ]] && ! kill -0 "$OLD_REDIS_PID" 2>/dev/null; then
        rm -f "$DEV_REDIS_PID_FILE"
    fi
fi

# ── Ensure storefront env symlink ──────────
if [[ -f "$ROOT_DIR/.env" ]]; then
    echo -e "${YELLOW}→${NC} Linking .env → apps/storefront/.env.local"
    ln -sfn "$ROOT_DIR/.env" "$ROOT_DIR/apps/storefront/.env.local"
else
    echo -e "${YELLOW}⚠${NC} .env not found at $ROOT_DIR/.env (continuing)"
fi

# ── 1. Redis ───────────────────────────────
echo -e "\n${BLUE}[1/3]${NC} Ensuring Redis on localhost:6379..."

if is_port_open 6379; then
    REDIS_READY=1
    echo -e "  ${GREEN}✓${NC} Redis already running on localhost:6379"
fi

if [[ "$REDIS_READY" -eq 0 ]] && command_exists docker && docker info >/dev/null 2>&1; then
    docker rm -f "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
    if docker run -d --name "$REDIS_CONTAINER_NAME" -p 6379:6379 redis:7-alpine >/dev/null 2>&1; then
        if wait_for_port 6379 30; then
            REDIS_READY=1
            REDIS_DOCKER_STARTED=1
            echo -e "  ${GREEN}✓${NC} Redis started via Docker (${REDIS_CONTAINER_NAME})"
        else
            echo -e "  ${YELLOW}⚠${NC} Docker Redis started but not reachable on port 6379"
            docker rm -f "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
        fi
    fi
fi

if [[ "$REDIS_READY" -eq 0 ]] && command_exists redis-server; then
    redis-server --port 6379 --save "" --appendonly no > >(sed 's/^/  [redis] /') 2>&1 &
    REDIS_LOCAL_PID="$!"
    echo "$REDIS_LOCAL_PID" > "$DEV_REDIS_PID_FILE"
    if wait_for_port 6379 20; then
        REDIS_READY=1
        echo -e "  ${GREEN}✓${NC} Redis started via local redis-server"
    else
        echo -e "  ${YELLOW}⚠${NC} Local redis-server failed to open port 6379"
        kill "$REDIS_LOCAL_PID" 2>/dev/null || true
        REDIS_LOCAL_PID=""
        rm -f "$DEV_REDIS_PID_FILE"
    fi
fi

if [[ "$REDIS_READY" -eq 0 ]]; then
    echo -e "  ${YELLOW}⚠${NC} Redis unavailable. Starting Medusa/Storefront anyway with REDIS_URL disabled."
fi

if [[ "$REDIS_READY" -eq 1 ]]; then
    DEV_REDIS_URL="redis://localhost:6379"
else
    DEV_REDIS_URL=""
fi

# ── 2. Medusa Backend ─────────────────────
echo -e "\n${BLUE}[2/3]${NC} Starting Medusa backend..."
start_service "medusa" "$ROOT_DIR/apps/medusa" "REDIS_URL='$DEV_REDIS_URL' NODE_OPTIONS='--dns-result-order=ipv4first' pnpm dev"

# ── 3. Next.js Storefront ─────────────────
echo -e "\n${BLUE}[3/3]${NC} Starting Storefront on port ${STOREFRONT_PORT}..."
start_service "storefront" "$ROOT_DIR/apps/storefront" "REDIS_URL='$DEV_REDIS_URL' pnpm dev --port '$STOREFRONT_PORT'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🚀 Development environment starting!${NC}"
echo -e "   Storefront:   ${BLUE}http://localhost:${STOREFRONT_PORT}${NC}"
echo -e "   Medusa API:   ${BLUE}http://localhost:9000${NC}"
echo -e "   Medusa Admin: ${BLUE}http://localhost:9000/app${NC}"
if [[ "$REDIS_READY" -eq 1 ]]; then
    echo -e "   Redis:        ${BLUE}localhost:6379${NC}"
else
    echo -e "   Redis:        ${YELLOW}disabled for this run${NC}"
fi
echo ""
echo -e "   Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

wait "${PIDS[@]}"
