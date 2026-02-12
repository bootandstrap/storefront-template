#!/usr/bin/env bash
# ============================================================================
# check-audit-waiver.sh — Audit gate with waiver support
# ============================================================================
# Runs `pnpm audit --audit-level=moderate`. If advisories are found, checks
# docs/operations/DEPENDENCY_RISK_REGISTER.md for valid, non-expired waivers.
#
# EXIT CODES:
#   0 — No unwaived advisories
#   1 — Unwaived or expired advisory found → RELEASE BLOCKED
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
REGISTER="$ROOT_DIR/docs/operations/DEPENDENCY_RISK_REGISTER.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

TODAY=$(date '+%Y-%m-%d')

# ── Step 1: Run audit ──
echo -e "${BOLD}🔍 Running pnpm audit --audit-level=moderate${NC}"
AUDIT_OUTPUT=""
AUDIT_EXIT=0

AUDIT_OUTPUT=$(pnpm -C "$ROOT_DIR" audit --audit-level=moderate 2>&1) || AUDIT_EXIT=$?

if [[ $AUDIT_EXIT -eq 0 ]]; then
    echo -e "${GREEN}✅ No moderate+ advisories found${NC}"
    exit 0
fi

# ── Step 2: Extract advisory IDs ──
echo ""
echo -e "${YELLOW}⚠️  Audit found advisories — checking waivers...${NC}"

# Extract GHSA IDs from audit output
ADVISORY_IDS=$(echo "$AUDIT_OUTPUT" | grep -oE 'GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}' | sort -u)

if [[ -z "$ADVISORY_IDS" ]]; then
    echo -e "${RED}❌ Audit failed but could not extract advisory IDs from output${NC}"
    echo "$AUDIT_OUTPUT"
    exit 1
fi

# ── Step 3: Check register for valid waivers ──
if [[ ! -f "$REGISTER" ]]; then
    echo -e "${RED}❌ DEPENDENCY_RISK_REGISTER.md not found at $REGISTER${NC}"
    echo "   All moderate+ advisories require a waiver or a patch."
    exit 1
fi

UNWAIVED=0

for ghsa in $ADVISORY_IDS; do
    # Check if the GHSA ID is mentioned in the register
    if ! grep -q "$ghsa" "$REGISTER" 2>/dev/null; then
        echo -e "${RED}❌ $ghsa — NO WAIVER found in risk register${NC}"
        UNWAIVED=$((UNWAIVED + 1))
        continue
    fi

    # Check if it's in "Active Acceptances" section (not "Expired / Resolved")
    # Extract the "Review By" date for this advisory
    REVIEW_BY=$(grep -A 20 "$ghsa" "$REGISTER" | grep -i "Review By" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)

    if [[ -z "$REVIEW_BY" ]]; then
        echo -e "${YELLOW}⚠️  $ghsa — waiver found but no 'Review By' date${NC}"
        UNWAIVED=$((UNWAIVED + 1))
        continue
    fi

    # Compare dates (YYYY-MM-DD strings sort lexicographically)
    if [[ "$TODAY" > "$REVIEW_BY" ]]; then
        echo -e "${RED}❌ $ghsa — waiver EXPIRED (Review By: $REVIEW_BY, Today: $TODAY)${NC}"
        UNWAIVED=$((UNWAIVED + 1))
    else
        echo -e "${GREEN}✅ $ghsa — valid waiver (expires: $REVIEW_BY)${NC}"
    fi
done

# ── Result ──
echo ""
if [[ $UNWAIVED -gt 0 ]]; then
    echo -e "${RED}🚫 $UNWAIVED advisory/ies without valid waiver — RELEASE BLOCKED${NC}"
    echo "   Fix: patch the dependency or add a waiver to $REGISTER"
    exit 1
else
    echo -e "${GREEN}✅ All advisories have valid waivers — audit gate passed${NC}"
    exit 0
fi
