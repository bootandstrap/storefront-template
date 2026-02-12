#!/bin/bash
# ============================================
# restart.sh — Full cleanup + fresh restart
# ============================================
# Kills all services, removes Docker resources,
# frees ports, clears caches, then starts fresh.
#
# Usage: ./restart.sh
# ============================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🔄 Full Restart — Cleaning everything...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Stop all services ──
echo -e "\n${BLUE}[1/5]${NC} Stopping services..."

# Kill processes on dev ports
for PORT in 3000 3100 9000 6379; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [[ -n "$PID" ]]; then
        echo -e "  ${YELLOW}→${NC} Killing process on port $PORT (PID: $PID)"
        kill -9 $PID 2>/dev/null || true
    fi
done

# Kill dev.sh and any child processes
pkill -f "dev.sh" 2>/dev/null || true
pkill -f "medusa.*dev" 2>/dev/null || true
pkill -f "next.*dev" 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} All processes killed"

# ── 2. Remove Docker resources ──
echo -e "\n${BLUE}[2/5]${NC} Cleaning Docker resources..."

# Stop and remove campifrut containers
docker stop campifrut-redis-dev 2>/dev/null || true
docker rm -f campifrut-redis-dev 2>/dev/null || true

# Also stop any compose-managed containers
docker compose -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans 2>/dev/null || true

# Prune unused networks and volumes from this project
docker network prune -f 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} Docker resources cleaned"

# ── 3. Clear build caches ──
echo -e "\n${BLUE}[3/5]${NC} Clearing caches..."

# Next.js cache
rm -rf "$ROOT_DIR/apps/storefront/.next" 2>/dev/null
echo -e "  ${GREEN}✓${NC} Storefront .next cache cleared"

# Medusa build cache
rm -rf "$ROOT_DIR/apps/medusa/.medusa" 2>/dev/null
rm -rf "$ROOT_DIR/apps/medusa/dist" 2>/dev/null
echo -e "  ${GREEN}✓${NC} Medusa cache cleared"

# Turbo cache
rm -rf "$ROOT_DIR/.turbo" 2>/dev/null
rm -rf "$ROOT_DIR/node_modules/.cache" 2>/dev/null
echo -e "  ${GREEN}✓${NC} Turbo cache cleared"

# ── 4. Verify ports are free ──
echo -e "\n${BLUE}[4/5]${NC} Verifying ports..."

ALL_FREE=true
for PORT in 3000 3100 9000 6379; do
    if lsof -ti :$PORT >/dev/null 2>&1; then
        echo -e "  ${RED}✗${NC} Port $PORT still in use"
        ALL_FREE=false
    else
        echo -e "  ${GREEN}✓${NC} Port $PORT is free"
    fi
done

if [[ "$ALL_FREE" != true ]]; then
    echo -e "\n  ${YELLOW}⚠️  Some ports still occupied. Wait a moment or manually kill them.${NC}"
fi

# ── 5. Restart dev environment ──
echo -e "\n${BLUE}[5/5]${NC} Starting fresh dev environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec "$ROOT_DIR/dev.sh"
