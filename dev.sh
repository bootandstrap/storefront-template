#!/bin/bash
# ============================================
# E-Commerce Template — Development Startup Script
# ============================================
# Starts local development services:
#   • Redis (existing local, Docker, or local redis-server)
#   • Medusa backend (native — hot-reload)
#   • Storefront (native — hot-reload or production build)
#   • react-rewrite visual editor (optional)
#
# Usage: ./dev.sh             (interactive menu)
#        ./dev.sh --prod      (production build — skip menu)
#        ./dev.sh --rewrite   (dev + visual editor — skip menu)
#        ./dev.sh --medusa    (medusa only — skip menu)
# Stop:  Ctrl+C
# ============================================

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
REDIS_CONTAINER_NAME="ecommerce-redis-dev"
DEV_REDIS_PID_FILE="$ROOT_DIR/.dev-redis.pid"
STOREFRONT_PORT="${STOREFRONT_PORT:-3000}"
PROD_MODE=0
REWRITE_MODE=0
MEDUSA_ONLY=0

cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Parse CLI flags (non-interactive) ─────
FLAG_SET=0
for arg in "$@"; do
    case "$arg" in
        --prod|--production) PROD_MODE=1; FLAG_SET=1 ;;
        --rewrite)           REWRITE_MODE=1; FLAG_SET=1 ;;
        --medusa)            MEDUSA_ONLY=1; FLAG_SET=1 ;;
        --dev)               FLAG_SET=1 ;;
    esac
done

# ── Interactive menu (when no flags) ──────
if [[ "$FLAG_SET" -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}🍊 E-Commerce Template${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "  ${BOLD}${CYAN}1)${NC}  ${GREEN}▶ Development${NC}         ${DIM}— Full stack with Turbopack HMR${NC}"
    echo -e "  ${BOLD}${CYAN}2)${NC}  ${YELLOW}▶ Production${NC}          ${DIM}— Full stack with production build${NC}"
    echo -e "  ${BOLD}${CYAN}3)${NC}  ${BLUE}▶ Medusa Only${NC}          ${DIM}— Backend API only (no storefront)${NC}"
    echo -e "  ${BOLD}${CYAN}4)${NC}  ${GREEN}▶ Dev + Visual Editor${NC}  ${DIM}— Full stack + react-rewrite overlay${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -ne "  ${BOLD}Select mode [1-4]:${NC} "
    read -r CHOICE

    case "${CHOICE:-1}" in
        1) ;;
        2) PROD_MODE=1 ;;
        3) MEDUSA_ONLY=1 ;;
        4) REWRITE_MODE=1 ;;
        *)
            echo -e "  ${RED}✗ Invalid option '${CHOICE}'. Exiting.${NC}"
            exit 1
            ;;
    esac
    echo ""
fi

PIDS=()
REDIS_DOCKER_STARTED=0
REDIS_LOCAL_PID=""
REDIS_READY=0
DONE_CLEANUP=0

# ── Node version (nvm) ────────────────────
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    source "$NVM_DIR/nvm.sh"
    if [[ -f "$ROOT_DIR/.nvmrc" ]]; then
        REQUIRED_NODE=$(cat "$ROOT_DIR/.nvmrc" | tr -d '[:space:]')
        nvm use "$REQUIRED_NODE" --silent 2>/dev/null || nvm install "$REQUIRED_NODE"
    fi
fi

NODE_VERSION=$(node --version 2>/dev/null || echo "none")
echo -e "${GREEN}⚙${NC}  Node: ${NODE_VERSION}  ($(which node))"
if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
    echo -e "${RED}✗ Node 20.x required (got $NODE_VERSION). Install via: nvm install 20${NC}"
    exit 1
fi

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
        eval "$cmd" 2>&1 | sed "s/^/  [$label] /"
    ) &
    PIDS+=("$!")
}

if [[ "$PROD_MODE" -eq 1 ]]; then
    echo -e "${GREEN}🍊 E-Commerce Template — Starting ${YELLOW}PRODUCTION${GREEN} Environment${NC}"
elif [[ "$MEDUSA_ONLY" -eq 1 ]]; then
    echo -e "${GREEN}🍊 E-Commerce Template — Starting ${BLUE}Medusa Only${GREEN} Environment${NC}"
elif [[ "$REWRITE_MODE" -eq 1 ]]; then
    echo -e "${GREEN}🍊 E-Commerce Template — Starting Development + ${YELLOW}Visual Editor${GREEN} Environment${NC}"
else
    echo -e "${GREEN}🍊 E-Commerce Template — Starting Development Environment${NC}"
fi
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

# ── Clean stale ports ─────────────────────
echo -e "\n${BLUE}[pre]${NC} Cleaning stale ports & cache..."
CLEAN_PORTS=(9000)
if [[ "$MEDUSA_ONLY" -eq 0 ]]; then
    CLEAN_PORTS+=("$STOREFRONT_PORT")
fi
for PORT in "${CLEAN_PORTS[@]}"; do
    STALE_PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"
    if [[ -n "$STALE_PIDS" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            echo -e "  ${YELLOW}→${NC} Killing stale PID ${pid} on port ${PORT}"
            kill -9 "$pid" 2>/dev/null || true
        done <<< "$STALE_PIDS"
    fi
done

# ── Clean .next cache for fresh build ─────
if [[ "$MEDUSA_ONLY" -eq 0 ]] && [[ -d "$ROOT_DIR/apps/storefront/.next" ]]; then
    rm -rf "$ROOT_DIR/apps/storefront/.next"
    echo -e "  ${GREEN}✓${NC} Cleaned .next cache"
fi

# ── Ensure storefront env symlink ──────────
if [[ "$MEDUSA_ONLY" -eq 0 ]]; then
    if [[ -f "$ROOT_DIR/.env" ]]; then
        echo -e "${YELLOW}→${NC} Linking .env → apps/storefront/.env.local"
        ln -sfn "$ROOT_DIR/.env" "$ROOT_DIR/apps/storefront/.env.local"
    else
        echo -e "${YELLOW}⚠${NC} .env not found at $ROOT_DIR/.env (continuing)"
    fi
fi

# ── Determine total steps ─────────────────
if [[ "$MEDUSA_ONLY" -eq 1 ]]; then
    TOTAL_STEPS=2
elif [[ "$REWRITE_MODE" -eq 1 ]]; then
    TOTAL_STEPS=4
else
    TOTAL_STEPS=3
fi
STEP=0

# ── 1. Redis ───────────────────────────────
STEP=$((STEP + 1))
echo -e "\n${BLUE}[${STEP}/${TOTAL_STEPS}]${NC} Ensuring Redis on localhost:6379..."

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
STEP=$((STEP + 1))
echo -e "\n${BLUE}[${STEP}/${TOTAL_STEPS}]${NC} Starting Medusa backend..."

# Source .env so MEDUSA_ADMIN_EMAIL/PASSWORD are available
if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source <(grep -v '^#' "$ROOT_DIR/.env" | grep -v '^\s*$' | sed 's/[[:space:]]*$//')
    set +a
fi

# Ensure Medusa admin user exists (mirrors docker-entrypoint.sh behavior in production)
# Without this, the owner panel can't authenticate with the Medusa Admin API
if [[ -n "${MEDUSA_ADMIN_EMAIL:-}" ]] && [[ -n "${MEDUSA_ADMIN_PASSWORD:-}" ]]; then
    echo -e "  ${YELLOW}→${NC} Ensuring Medusa admin user: $MEDUSA_ADMIN_EMAIL"
    (cd "$ROOT_DIR/apps/medusa" && NODE_OPTIONS='--dns-result-order=ipv4first' npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" 2>&1 | sed 's/^/  [medusa-user] /') || true
fi

start_service "medusa" "$ROOT_DIR/apps/medusa" "REDIS_URL='$DEV_REDIS_URL' NODE_OPTIONS='--dns-result-order=ipv4first' npm run dev"

# ── Wait for Medusa before starting Storefront ──
echo -e "\n${BLUE}[wait]${NC} Waiting for Medusa API on :9000 (up to 90s)..."
MEDUSA_UP=0
for i in {1..45}; do
    medusa_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/health 2>/dev/null || echo "000")
    if [[ "$medusa_code" == "200" ]]; then
        echo -e "  ${GREEN}✓${NC} Medusa API ready (${i}×2s)"
        MEDUSA_UP=1
        break
    fi
    sleep 2
done
if [[ "$MEDUSA_UP" -eq 0 ]]; then
    if [[ "$MEDUSA_ONLY" -eq 0 ]]; then
        echo -e "  ${YELLOW}⚠${NC} Medusa not yet healthy — starting storefront anyway"
    else
        echo -e "  ${YELLOW}⚠${NC} Medusa not yet healthy — still booting"
    fi
fi

if [[ "$MEDUSA_ONLY" -eq 0 ]]; then
    # ── 2.5. Governance Pre-flight Check ──────
    # Ensures local tenant governance is seeded before storefront starts.
    # This eliminates the "maintenance mode loop" during local dev.
    GOVERNANCE_CHECK_SCRIPT="$ROOT_DIR/scripts/governance-check.ts"
    if [[ -f "$GOVERNANCE_CHECK_SCRIPT" ]] && [[ -n "${LOCAL_TENANT_ID:-${TENANT_ID:-}}" ]]; then
        echo -e "\n${BLUE}[gov]${NC} Running governance pre-flight check..."
        if npx tsx "$GOVERNANCE_CHECK_SCRIPT" 2>&1 | sed 's/^/  [gov] /'; then
            echo -e "  ${GREEN}✓${NC} Governance check passed"
        else
            echo -e "  ${YELLOW}⚠${NC} Governance check had issues (storefront may show maintenance mode)"
            echo -e "  ${YELLOW}→${NC} Run manually: npx tsx scripts/governance-check.ts --force-seed"
        fi
    else
        echo -e "\n${BLUE}[gov]${NC} ${YELLOW}Skipping${NC} governance check (no TENANT_ID set or script missing)"
    fi

    # ── 3. Next.js Storefront ─────────────────
    STEP=$((STEP + 1))
    if [[ "$PROD_MODE" -eq 1 ]]; then
        echo -e "\n${BLUE}[${STEP}/${TOTAL_STEPS}]${NC} Building Storefront for production..."
        (cd "$ROOT_DIR/apps/storefront" && REDIS_URL="$DEV_REDIS_URL" pnpm build 2>&1 | sed 's/^/  [build] /')
        BUILD_EXIT=$?
        if [[ "$BUILD_EXIT" -ne 0 ]]; then
            echo -e "  ${RED}✗ Production build failed (exit $BUILD_EXIT)${NC}"
            exit 1
        fi
        echo -e "  ${GREEN}✓${NC} Build complete — starting production server on :${STOREFRONT_PORT}"
        start_service "storefront" "$ROOT_DIR/apps/storefront" "REDIS_URL='$DEV_REDIS_URL' pnpm start --port '$STOREFRONT_PORT'"
    else
        echo -e "\n${BLUE}[${STEP}/${TOTAL_STEPS}]${NC} Starting Storefront on port ${STOREFRONT_PORT}..."
        start_service "storefront" "$ROOT_DIR/apps/storefront" "REDIS_URL='$DEV_REDIS_URL' pnpm dev --port '$STOREFRONT_PORT'"
    fi
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$PROD_MODE" -eq 1 ]]; then
    echo -e "${GREEN}🚀 Production environment starting!${NC}"
elif [[ "$MEDUSA_ONLY" -eq 1 ]]; then
    echo -e "${GREEN}🚀 Medusa-only environment starting!${NC}"
elif [[ "$REWRITE_MODE" -eq 1 ]]; then
    echo -e "${GREEN}🚀 Development + Visual Editor environment starting!${NC}"
else
    echo -e "${GREEN}🚀 Development environment starting!${NC}"
fi
if [[ "$MEDUSA_ONLY" -eq 0 ]]; then
    echo -e "   Storefront:   ${BLUE}http://localhost:${STOREFRONT_PORT}${NC}"
fi
echo -e "   Medusa API:   ${BLUE}http://localhost:9000${NC}"
echo -e "   Medusa Admin: ${BLUE}http://localhost:9000/app${NC}"
if [[ "$REDIS_READY" -eq 1 ]]; then
    echo -e "   Redis:        ${BLUE}localhost:6379${NC}"
else
    echo -e "   Redis:        ${YELLOW}disabled for this run${NC}"
fi
if [[ "$REWRITE_MODE" -eq 1 ]]; then
    echo -e "   Visual Editor:${BLUE} auto-detected port${NC}  (opens browser after storefront is ready)"
fi
echo ""
echo -e "   Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Health Check Loop ─────────────────────
echo -e "\n${BLUE}[health]${NC} Waiting for services to become ready..."
MEDUSA_HEALTHY=0
STOREFRONT_HEALTHY=0

# In medusa-only mode, mark storefront as "healthy" so we don't wait for it
if [[ "$MEDUSA_ONLY" -eq 1 ]]; then
    STOREFRONT_HEALTHY=1
fi

for i in {1..90}; do
    if [[ "$MEDUSA_HEALTHY" -eq 0 ]]; then
        medusa_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/health 2>/dev/null || echo "000")
        if [[ "$medusa_code" == "200" ]]; then
            echo -e "  ${GREEN}✓${NC} Medusa API healthy (${i}s)"
            MEDUSA_HEALTHY=1
        fi
    fi

    if [[ "$STOREFRONT_HEALTHY" -eq 0 ]]; then
        if is_port_open "$STOREFRONT_PORT"; then
            echo -e "  ${GREEN}✓${NC} Storefront listening on :${STOREFRONT_PORT} (${i}×2s)"
            STOREFRONT_HEALTHY=1
        fi
    fi

    if [[ "$MEDUSA_HEALTHY" -eq 1 ]] && [[ "$STOREFRONT_HEALTHY" -eq 1 ]]; then
        echo -e "\n${GREEN}✅ All services ready!${NC}\n"
        break
    fi

    sleep 2
done

if [[ "$MEDUSA_HEALTHY" -eq 0 ]] || [[ "$STOREFRONT_HEALTHY" -eq 0 ]]; then
    echo -e "\n${YELLOW}⚠ Some services may still be starting. Check the logs above.${NC}"
    [[ "$MEDUSA_HEALTHY" -eq 0 ]] && echo -e "  ${YELLOW}→ Medusa not yet responding on :9000${NC}"
    [[ "$MEDUSA_ONLY" -eq 0 ]] && [[ "$STOREFRONT_HEALTHY" -eq 0 ]] && echo -e "  ${YELLOW}→ Storefront not yet responding on :${STOREFRONT_PORT}${NC}"
    echo ""
fi

# ── 4. react-rewrite Visual Editor (optional) ──
if [[ "$REWRITE_MODE" -eq 1 ]] && [[ "$STOREFRONT_HEALTHY" -eq 1 ]]; then
    STEP=$((STEP + 1))
    echo -e "${BLUE}[${STEP}/${TOTAL_STEPS}]${NC} Starting react-rewrite visual editor..."
    start_service "rewrite" "$ROOT_DIR/apps/storefront" "npx react-rewrite '$STOREFRONT_PORT'"
    echo -e "  ${GREEN}✓${NC} Visual editor starting — browser will open automatically"
    echo -e "  ${YELLOW}→${NC} Edit UI visually: changes write directly to source files"
elif [[ "$REWRITE_MODE" -eq 1 ]]; then
    echo -e "${YELLOW}⚠${NC} Storefront not healthy — skipping react-rewrite. Run manually:"
    echo -e "  ${BLUE}cd apps/storefront && npx react-rewrite ${STOREFRONT_PORT}${NC}"
fi

wait "${PIDS[@]}"
