#!/usr/bin/env bash
# ============================================================================
# dual-repo-release-gate.sh — Unified quality gate for ecommerce-template + SuperAdmin
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

# NOTE: no `set -e` — the gate() function handles exit codes individually.
# `set -e` would cause the script to exit on the first gate failure,
# preventing subsequent gates from running and hiding the full picture.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Assumes this script lives in ecommerce-template/scripts/ops/
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ADMIN_DIR="$(cd "$TEMPLATE_DIR/../BOOTANDSTRAP_WEB" && pwd 2>/dev/null)" || ADMIN_DIR=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

FAILURES=0
TOTAL=0

# ── Pre-flight checks ────────────────────────────────────────
echo ""
echo -e "${BOLD}Pre-flight checks${NC}"

if ! command -v pnpm &>/dev/null; then
    echo -e "  ${RED}✗ pnpm not found on PATH${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ pnpm$(pnpm --version 2>/dev/null | head -1) found${NC}"

if [[ -n "$ADMIN_DIR" ]] && [[ -d "$ADMIN_DIR" ]]; then
    echo -e "  ${GREEN}✓ Admin dir found: $ADMIN_DIR${NC}"
else
    echo -e "  ${YELLOW}⚠️  Admin dir not found — will skip admin gates${NC}"
    ADMIN_DIR=""
fi
echo ""

# ── Gate runner ───────────────────────────────────────────────
gate() {
    local label="$1"
    shift
    TOTAL=$((TOTAL + 1))
    echo -e "${CYAN}▸ [$TOTAL] $label${NC}"
    local output
    output=$("$@" 2>&1)
    local exit_code=$?
    if [[ $exit_code -eq 0 ]]; then
        echo -e "  ${GREEN}✓ PASS${NC}"
    else
        echo -e "  ${RED}✗ FAIL (exit code: $exit_code)${NC}"
        # Show last 5 lines of output for context
        echo "$output" | tail -5 | sed 's/^/    /'
        FAILURES=$((FAILURES + 1))
    fi
}

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Dual-Repo Production Release Gate${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════════════${NC}"
echo ""

# ── ecommerce-template ──────────────────────────────────────────────────
echo -e "${BOLD}📦 ecommerce-template (Template + Medusa)${NC}"
echo -e "   ${YELLOW}$TEMPLATE_DIR${NC}"
echo ""

gate "Storefront Lint"        pnpm -C "$TEMPLATE_DIR" exec turbo lint --filter=storefront
gate "Storefront Type Check"  pnpm -C "$TEMPLATE_DIR" exec turbo type-check
gate "Storefront Unit Tests"  pnpm -C "$TEMPLATE_DIR" --filter=storefront test:run
gate "Storefront Build"       pnpm -C "$TEMPLATE_DIR" exec turbo build --filter=storefront
gate "Migration Check"        bash "$TEMPLATE_DIR/scripts/check-migration-order.sh"
gate "RLS Policy Check"       bash "$TEMPLATE_DIR/scripts/check-rls.sh"
gate "Audit Policy"           bash "$TEMPLATE_DIR/scripts/check-audit-waiver.sh"

echo ""

# ── SuperAdmin ─────────────────────────────────────────────────
if [[ -n "$ADMIN_DIR" ]]; then
    echo -e "${BOLD}🛡️  SuperAdmin Panel${NC}"
    echo -e "   ${YELLOW}$ADMIN_DIR${NC}"
    echo ""

    gate "Admin Lint"           pnpm -C "$ADMIN_DIR" lint
    gate "Admin Type Check"     pnpm -C "$ADMIN_DIR" type-check
    gate "Admin Unit Tests"     pnpm -C "$ADMIN_DIR" test:run
    gate "Admin Build"          pnpm -C "$ADMIN_DIR" build
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
