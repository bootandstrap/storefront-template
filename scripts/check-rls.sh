#!/usr/bin/env bash
# ============================================================================
# check-rls.sh — Static analysis for overly permissive RLS policies
# ============================================================================
# Scans SQL migration files for USING (true) patterns on governance tables.
# This prevents regressions where a new migration accidentally opens up
# SELECT/INSERT/UPDATE/DELETE to all users without tenant scoping.
#
# PORTABILITY: Uses grep -Ei (POSIX ERE) instead of grep -P (GNU PCRE).
# Falls back to ripgrep (rg) if available.
#
# EXIT CODES:
#   0 — No permissive policies found (or no governance tables affected)
#   1 — Found permissive USING (true) on governance tables
#   2 — Fail-closed: no compatible grep/rg found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

# Governance tables that MUST NOT have USING (true)
GOVERNANCE_TABLES=(
    "config"
    "feature_flags"
    "plan_limits"
    "tenants"
    "profiles"
    "whatsapp_templates"
    "cms_pages"
    "carousel_slides"
    "analytics_events"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 RLS Policy Static Analysis"
echo "   Scanning: $MIGRATIONS_DIR"
echo ""

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
    echo -e "${YELLOW}⚠️  No migrations directory found at $MIGRATIONS_DIR${NC}"
    echo "   Skipping RLS check."
    exit 0
fi

# Check for SQL files
shopt -s nullglob
SQL_FILES=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#SQL_FILES[@]} -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  No .sql files found in $MIGRATIONS_DIR${NC}"
    exit 0
fi

# Determine search tool (prefer rg, fallback to grep -E)
SEARCH_CMD=""
if command -v rg &>/dev/null; then
    SEARCH_CMD="rg"
elif command -v grep &>/dev/null; then
    SEARCH_CMD="grep"
else
    echo -e "${RED}❌ FAIL-CLOSED: Neither 'rg' nor 'grep' found. Cannot verify RLS policies.${NC}"
    exit 2
fi

VIOLATIONS=0

for table in "${GOVERNANCE_TABLES[@]}"; do
    # Pattern: ON <table> ... USING (true)
    # Using ERE regex (grep -E) instead of PCRE (grep -P) for macOS/BSD portability
    PATTERN="ON[[:space:]]+${table}[[:space:]]"
    USING_PATTERN="USING[[:space:]]*\([[:space:]]*true[[:space:]]*\)"

    FOUND_FILES=""

    if [[ "$SEARCH_CMD" == "rg" ]]; then
        # ripgrep: search for both patterns in the same file, case-insensitive
        FOUND_FILES=$(rg -li "$PATTERN" "${SQL_FILES[@]}" 2>/dev/null | while read -r f; do
            if rg -qi "$USING_PATTERN" "$f" 2>/dev/null; then
                echo "$f"
            fi
        done || true)
    else
        # grep -E: POSIX ERE, case-insensitive, list files
        for f in "${SQL_FILES[@]}"; do
            if grep -Eiq "$PATTERN" "$f" 2>/dev/null && grep -Eiq "$USING_PATTERN" "$f" 2>/dev/null; then
                FOUND_FILES="$FOUND_FILES $f"
            fi
        done
    fi

    if [[ -n "$FOUND_FILES" ]]; then
        for f in $FOUND_FILES; do
            echo -e "${RED}❌ VIOLATION: Table '${table}' has USING (true) in $(basename "$f")${NC}"
            # Show offending lines
            if [[ "$SEARCH_CMD" == "rg" ]]; then
                rg -in "$USING_PATTERN" "$f" 2>/dev/null | while read -r line; do
                    echo "   → $line"
                done
            else
                grep -Ein "$USING_PATTERN" "$f" 2>/dev/null | while read -r line; do
                    echo "   → $line"
                done
            fi
        done
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

echo ""

if [[ $VIOLATIONS -gt 0 ]]; then
    echo -e "${RED}🚫 Found $VIOLATIONS governance table(s) with USING (true) — cross-tenant leak risk!${NC}"
    echo ""
    echo "FIX: Replace USING (true) with tenant-scoped policies:"
    echo "  USING (EXISTS ("
    echo "    SELECT 1 FROM profiles"
    echo "    WHERE profiles.id = auth.uid()"
    echo "    AND (profiles.role = 'super_admin' OR profiles.tenant_id = <table>.tenant_id)"
    echo "  ))"
    exit 1
else
    echo -e "${GREEN}✅ All governance tables have properly scoped RLS policies.${NC}"
    exit 0
fi
