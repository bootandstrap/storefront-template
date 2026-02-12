#!/bin/bash
# ============================================
# stop.sh — Stop all development services
# ============================================
# Stops: Medusa, Storefront, SuperAdmin, Redis container
#
# Usage: ./stop.sh
# ============================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}⏹  Stopping development services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STOPPED=0

# ── Kill Node processes (Medusa + Storefront) ──
# Find processes started by dev.sh or running on known ports
for PORT in 3000 3100 9000; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [[ -n "$PID" ]]; then
        echo -e "  ${YELLOW}→${NC} Killing process on port $PORT (PID: $PID)"
        kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null
        STOPPED=$((STOPPED + 1))
    fi
done

# ── Stop Redis container ──
if docker ps -q --filter "name=campifrut-redis-dev" 2>/dev/null | grep -q .; then
    echo -e "  ${YELLOW}→${NC} Stopping Redis container..."
    docker stop campifrut-redis-dev >/dev/null 2>&1
    docker rm campifrut-redis-dev >/dev/null 2>&1
    STOPPED=$((STOPPED + 1))
    echo -e "  ${GREEN}✓${NC} Redis stopped"
else
    echo -e "  ${GREEN}✓${NC} Redis not running"
fi

# ── Kill any remaining dev.sh background processes ──
DEVSH_PIDS=$(pgrep -f "dev.sh" 2>/dev/null || true)
if [[ -n "$DEVSH_PIDS" ]]; then
    echo -e "  ${YELLOW}→${NC} Killing dev.sh processes..."
    echo "$DEVSH_PIDS" | xargs kill 2>/dev/null || true
    STOPPED=$((STOPPED + 1))
fi

echo ""
if [[ $STOPPED -gt 0 ]]; then
    echo -e "${GREEN}✅ All services stopped.${NC}"
else
    echo -e "${GREEN}✅ No running services found.${NC}"
fi
