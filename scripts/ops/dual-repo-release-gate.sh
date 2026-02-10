#!/usr/bin/env bash
# ============================================================================
# dual-repo-release-gate.sh — Unified quality gate for CAMPIFRUT + SuperAdmin
# ============================================================================
# Runs all verification commands for both repositories in sequence.
# Designed for pre-release validation.
#
# Usage: bash scripts/ops/dual-repo-release-gate.sh
#
# EXIT CODES:
#   0 — All gates pass
#   1 — One or more gates failed
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Assumes this script lives in CAMPIFRUT/scripts/ops/
CAMPIFRUT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ADMIN_DIR="$(cd "$CAMPIFRUT_DIR/../bootandstrap-admin" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

FAILURES=0
TOTAL=0

gate() {
    local label="$1"
    shift
    TOTAL=$((TOTAL + 1))
    echo -e "${CYAN}▸ [$TOTAL] $label${NC}"
    if "$@" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ PASS${NC}"
    else
        echo -e "  ${RED}✗ FAIL${NC}"
        FAILURES=$((FAILURES + 1))
    fi
}

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Dual-Repo Production Release Gate${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo ""

# ── CAMPIFRUT ──────────────────────────────────────────────────
echo -e "${BOLD}📦 CAMPIFRUT (Template + Medusa)${NC}"
echo -e "   ${YELLOW}$CAMPIFRUT_DIR${NC}"
echo ""

gate "Storefront Lint"        pnpm -C "$CAMPIFRUT_DIR" turbo lint --filter=storefront
gate "Storefront Type Check"  pnpm -C "$CAMPIFRUT_DIR" -C apps/storefront exec tsc --noEmit
gate "Storefront Unit Tests"  pnpm -C "$CAMPIFRUT_DIR" --filter=storefront test:run
gate "Storefront Build"       pnpm -C "$CAMPIFRUT_DIR" turbo build --filter=storefront
gate "RLS Policy Check"       bash "$CAMPIFRUT_DIR/scripts/check-rls.sh"

echo ""

# ── SuperAdmin ─────────────────────────────────────────────────
if [[ -d "$ADMIN_DIR" ]]; then
    echo -e "${BOLD}🛡️  SuperAdmin Panel${NC}"
    echo -e "   ${YELLOW}$ADMIN_DIR${NC}"
    echo ""

    gate "Admin Lint"           pnpm -C "$ADMIN_DIR" lint
    gate "Admin Type Check"     pnpm -C "$ADMIN_DIR" type-check
    gate "Admin Unit Tests"     pnpm -C "$ADMIN_DIR" test:run
    gate "Admin Build"          pnpm -C "$ADMIN_DIR" build
else
    echo -e "${YELLOW}⚠️  SuperAdmin directory not found at $ADMIN_DIR — skipping${NC}"
fi

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"

if [[ $FAILURES -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}  ✅ ALL $TOTAL GATES PASSED — Ready for release${NC}"
    echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}  ❌ $FAILURES / $TOTAL GATES FAILED${NC}"
    echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
