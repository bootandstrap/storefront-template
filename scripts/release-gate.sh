#!/usr/bin/env bash
# ============================================================================
# release-gate.sh — Single-command SOTA quality gate
# ============================================================================
# Runs ALL quality checks required before a production release.
# Exit code 0 = all gates pass. Non-zero = release blocked.
#
# Usage: bash scripts/release-gate.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

function gate() {
    local name="$1"
    shift
    echo -e "\n${BOLD}── $name ──${NC}"
    if "$@" 2>&1; then
        echo -e "${GREEN}✅ $name passed${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}❌ $name FAILED${NC}"
        FAIL=$((FAIL + 1))
    fi
}

function gate_warn() {
    local name="$1"
    shift
    echo -e "\n${BOLD}── $name ──${NC}"
    if "$@" 2>&1; then
        echo -e "${GREEN}✅ $name passed${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "${YELLOW}⚠️  $name has warnings (non-blocking)${NC}"
        WARN=$((WARN + 1))
    fi
}

cd "$ROOT_DIR"

echo -e "${BOLD}🚀 SOTA Release Gate — $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo "   Root: $ROOT_DIR"

# ── P0: Security ──
gate "RLS Policy Check" bash scripts/check-rls.sh
gate "Audit Policy" bash scripts/check-audit-waiver.sh

# ── P1: Quality ──
gate "Storefront Lint" pnpm turbo lint --filter=storefront
gate "Storefront Unit Tests" pnpm --filter=storefront test:run
gate "Medusa Unit Tests" pnpm -C apps/medusa test:unit
gate_warn "Coverage Threshold (70%)" pnpm --filter=storefront test:run -- --coverage --coverage.thresholds.lines=70
gate "Storefront Type Check" pnpm turbo type-check
gate "Storefront Build" pnpm turbo build --filter=storefront

# ── Summary ──
echo ""
echo -e "${BOLD}══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Passed:  $PASS${NC}"
if [[ $WARN -gt 0 ]]; then
    echo -e "${YELLOW}  ⚠️  Warnings: $WARN${NC}"
fi
if [[ $FAIL -gt 0 ]]; then
    echo -e "${RED}  ❌ Failed:  $FAIL${NC}"
    echo -e "${RED}  🚫 RELEASE BLOCKED${NC}"
    echo -e "${BOLD}══════════════════════════════════════${NC}"
    exit 1
else
    echo -e "${GREEN}  🟢 RELEASE GATE PASSED${NC}"
    echo -e "${BOLD}══════════════════════════════════════${NC}"
    exit 0
fi
