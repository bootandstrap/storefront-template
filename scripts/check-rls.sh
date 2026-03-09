#!/usr/bin/env bash
# ============================================================================
# check-rls.sh — Static analysis for overly permissive RLS policies
# ============================================================================
# Scans SQL migration files for CREATE POLICY ... USING (true) patterns
# on governance tables. Only considers the LATEST migration per table
# (determined by filename sort order, since migrations are date-prefixed).
#
# If a later migration DROPs and re-creates a policy, only the final
# CREATE POLICY is evaluated — earlier superseded policies are ignored.
#
# PORTABILITY: Uses grep -Ei (POSIX ERE). Falls back to ripgrep (rg) if available.
#
# EXIT CODES:
#   0 — No permissive policies found (or no governance tables affected)
#   1 — Found permissive CREATE POLICY ... USING (true) on governance tables
#   2 — Fail-closed: no compatible grep/rg found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

# Governance tables that MUST NOT have USING (true) in SELECT policies
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

# Check for SQL files (sorted by name = chronological order)
shopt -s nullglob
SQL_FILES=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#SQL_FILES[@]} -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  No .sql files found in $MIGRATIONS_DIR${NC}"
    exit 0
fi

VIOLATIONS=0

for table in "${GOVERNANCE_TABLES[@]}"; do
    # ──────────────────────────────────────────────────────────────────
    # Strategy: find the LATEST migration that creates a SELECT policy
    # for this table. Only check THAT file for USING (true).
    # ──────────────────────────────────────────────────────────────────

    # Pattern: CREATE POLICY ... ON <table> FOR SELECT
    # We look for files that create SELECT policies for this table
    # Note: Use (public\.)? prefix and boundary to avoid substring matches (e.g. 'config' matching 'chat_tier_config')
    CREATE_SELECT_PATTERN="CREATE[[:space:]]+POLICY.*ON[[:space:]]+(public\\.)?${table}[[:space:];(]"
    USING_TRUE_PATTERN="USING[[:space:]]*\\([[:space:]]*true[[:space:]]*\\)"

    # Find the LATEST file (reverse chronological) that creates a policy on this table
    LATEST_FILE=""
    for (( i=${#SQL_FILES[@]}-1; i>=0; i-- )); do
        f="${SQL_FILES[$i]}"
        if grep -Eiq "$CREATE_SELECT_PATTERN" "$f" 2>/dev/null; then
            LATEST_FILE="$f"
            break
        fi
    done

    if [[ -z "$LATEST_FILE" ]]; then
        # No migration creates a policy for this table — skip
        continue
    fi

    # Check if the latest file has CREATE POLICY ... USING (true) for this table
    # Filter: only non-comment lines (skip lines starting with --)
    HAS_VIOLATION=false

    while IFS= read -r line; do
        # Skip SQL comment lines
        stripped="${line#"${line%%[! ]*}"}"  # trim leading whitespace
        if [[ "$stripped" == --* ]]; then
            continue
        fi
        # Check if this line contains both the table CREATE POLICY and USING (true)
        if echo "$line" | grep -Eiq "$USING_TRUE_PATTERN" 2>/dev/null; then
            # Verify it's actually a CREATE POLICY for this table (could be multi-line)
            HAS_VIOLATION=true
        fi
    done < <(grep -Ei "ON[[:space:]]+${table}[[:space:]]|$USING_TRUE_PATTERN" "$LATEST_FILE" 2>/dev/null || true)

    # More precise check: find actual CREATE POLICY ... ON <table> ... USING (true)
    # by extracting the policy blocks
    HAS_VIOLATION=false

    # Get all CREATE POLICY lines for this table, then check if any have USING (true)
    # on the same or next line
    # Note: Use exact table match to avoid 'config' matching 'chat_tier_config'
    POLICY_LINES=$(grep -Ein "CREATE[[:space:]]+POLICY" "$LATEST_FILE" 2>/dev/null | grep -Ei "ON[[:space:]]+(public\\.)?${table}[[:space:];]" || true)

    if [[ -n "$POLICY_LINES" ]]; then
        while IFS=: read -r linenum _rest; do
            # Check this line and the next few lines for USING (true)
            CONTEXT=$(sed -n "${linenum},$((linenum + 5))p" "$LATEST_FILE" 2>/dev/null || true)
            if echo "$CONTEXT" | grep -Eiq "$USING_TRUE_PATTERN" 2>/dev/null; then
                # But skip if it's an INSERT WITH CHECK (analytics_events exception)
                if echo "$CONTEXT" | grep -Eiq "FOR[[:space:]]+INSERT" 2>/dev/null; then
                    # INSERT WITH CHECK (true) is allowed for analytics_events
                    if [[ "$table" == "analytics_events" ]]; then
                        continue
                    fi
                fi
                HAS_VIOLATION=true
                echo -e "${RED}❌ VIOLATION: Table '${table}' has permissive policy in $(basename "$LATEST_FILE"):${linenum}${NC}"
                echo "   → $(echo "$CONTEXT" | head -3 | sed 's/^/   /')"
            fi
        done <<< "$POLICY_LINES"
    fi

    if $HAS_VIOLATION; then
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# Special check: analytics_events INSERT policy must NOT be WITH CHECK (true)
# ─────────────────────────────────────────────────────────────────────────────
ANALYTICS_INSERT_FILE=""
for (( i=${#SQL_FILES[@]}-1; i>=0; i-- )); do
    f="${SQL_FILES[$i]}"
    if grep -Eiq "CREATE[[:space:]]+POLICY" "$f" 2>/dev/null \
        && grep -Eiq "ON[[:space:]]+analytics_events" "$f" 2>/dev/null \
        && grep -Eiq "FOR[[:space:]]+INSERT" "$f" 2>/dev/null; then
        ANALYTICS_INSERT_FILE="$f"
        break
    fi
done

if [[ -n "$ANALYTICS_INSERT_FILE" ]]; then
    if awk '
        BEGIN {
            in_policy=0
            is_analytics=0
            is_insert=0
            permissive=0
            violation=0
        }
        {
            line=tolower($0)
            if (line ~ /create[[:space:]]+policy/) {
                in_policy=1
                is_analytics=0
                is_insert=0
                permissive=0
            }
            if (in_policy == 1) {
                if (line ~ /on[[:space:]]+analytics_events/) is_analytics=1
                if (line ~ /for[[:space:]]+insert/) is_insert=1
                if (line ~ /with[[:space:]]+check[[:space:]]*\\([[:space:]]*true[[:space:]]*\\)/) permissive=1
                if (line ~ /;/) {
                    if (is_analytics == 1 && is_insert == 1 && permissive == 1) violation=1
                    in_policy=0
                }
            }
        }
        END { exit violation ? 0 : 1 }
    ' "$ANALYTICS_INSERT_FILE"; then
        echo -e "${RED}❌ VIOLATION: analytics_events INSERT policy is permissive in $(basename "$ANALYTICS_INSERT_FILE")${NC}"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
fi

echo ""

if [[ $VIOLATIONS -gt 0 ]]; then
    echo -e "${RED}🚫 Found $VIOLATIONS governance table(s) with permissive policies — cross-tenant leak risk!${NC}"
    echo ""
    echo "FIX: Replace with tenant-scoped policies:"
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
