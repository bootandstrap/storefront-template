#!/bin/bash
# ============================================
# restart.sh — Clean restart for local dev
# ============================================
# Stops services, clears local caches, checks ports,
# and starts dev.sh again.
#
# Usage: ./restart.sh
# ============================================

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🔄 Restarting development environment...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Stop services ───────────────────────
echo -e "\n${BLUE}[1/4]${NC} Stopping services..."
"$ROOT_DIR/stop.sh"

# ── 2. Clear local caches ──────────────────
echo -e "\n${BLUE}[2/4]${NC} Clearing caches..."
rm -rf "$ROOT_DIR/apps/storefront/.next" 2>/dev/null || true
rm -rf "$ROOT_DIR/apps/medusa/.medusa" 2>/dev/null || true
rm -rf "$ROOT_DIR/apps/medusa/dist" 2>/dev/null || true
rm -rf "$ROOT_DIR/.turbo" 2>/dev/null || true
rm -rf "$ROOT_DIR/node_modules/.cache" 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Caches cleared"

# ── 3. Verify ports ────────────────────────
echo -e "\n${BLUE}[3/4]${NC} Verifying ports..."
ALL_FREE=true
for PORT in 3000 3100 9000 6379; do
    if lsof -ti :"$PORT" >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠${NC} Port $PORT is still in use"
        ALL_FREE=false
    else
        echo -e "  ${GREEN}✓${NC} Port $PORT is free"
    fi
done

if [[ "$ALL_FREE" == "false" ]]; then
    echo -e "  ${YELLOW}⚠${NC} Continuing restart even with occupied ports"
fi

# ── 4. Restart dev environment ─────────────
echo -e "\n${BLUE}[4/4]${NC} Starting dev environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
exec "$ROOT_DIR/dev.sh"
