#!/bin/bash
# ============================================
# Campifrut v2 — Development Startup Script
# ============================================
# Starts all services for local development:
#   • Redis via Docker
#   • Medusa backend (native — hot-reload)
#   • Storefront (native — hot-reload)
#
# Usage: ./dev.sh
# Stop:  Ctrl+C (kills all background processes)
# ============================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🍊 Campifrut v2 — Starting Development Environment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Ensure storefront has env vars ─────────
echo -e "${YELLOW}→${NC} Linking .env → apps/storefront/.env.local"
rm -f "$ROOT_DIR/apps/storefront/.env.local"
ln -s "$ROOT_DIR/.env" "$ROOT_DIR/apps/storefront/.env.local"

# ── Cleanup on exit ────────────────────────
cleanup() {
    echo -e "\n${YELLOW}⏹  Stopping all services...${NC}"
    kill 0 2>/dev/null
    docker stop campifrut-redis-dev 2>/dev/null
    docker rm campifrut-redis-dev 2>/dev/null
    echo -e "${GREEN}✓  All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ── 1. Redis (Docker) ─────────────────────
echo -e "\n${BLUE}[1/3]${NC} Starting Redis..."
docker rm -f campifrut-redis-dev 2>/dev/null || true
docker run -d --name campifrut-redis-dev -p 6379:6379 redis:7-alpine > /dev/null
echo -e "  ${GREEN}✓${NC} Redis running on localhost:6379"

until docker exec campifrut-redis-dev redis-cli ping 2>/dev/null | grep -q PONG; do
    sleep 0.5
done

# ── 2. Medusa Backend ─────────────────────
echo -e "\n${BLUE}[2/3]${NC} Starting Medusa backend..."
(
    cd "$ROOT_DIR/apps/medusa"
    export REDIS_URL=redis://localhost:6379
    # Force IPv4 — Node 18+ tries IPv6 first, which can timeout with Supabase
    export NODE_OPTIONS="--dns-result-order=ipv4first"
    npm run dev 2>&1 | sed 's/^/  [medusa] /'
) &

# ── 3. Next.js Storefront ─────────────────
echo -e "\n${BLUE}[3/3]${NC} Starting Storefront..."
(
    cd "$ROOT_DIR/apps/storefront"
    pnpm dev 2>&1 | sed 's/^/  [storefront] /'
) &

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🚀 Development environment starting!${NC}"
echo -e "   Storefront:  ${BLUE}http://localhost:3000${NC}"
echo -e "   Medusa API:  ${BLUE}http://localhost:9000${NC}"
echo -e "   Medusa Admin: ${BLUE}http://localhost:9000/app${NC}"
echo -e "   Redis:       ${BLUE}localhost:6379${NC}"
echo ""
echo -e "   Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

wait
