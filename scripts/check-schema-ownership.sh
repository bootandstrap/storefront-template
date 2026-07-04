#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# check-schema-ownership.sh
# Validates that migration SQL files only touch tables owned by this repo.
# Reads ownership from schema-ownership.json (auto-discovered up the tree).
#
# Usage (run from repo root):
#   bash /path/to/check-schema-ownership.sh [control-plane|data-plane]
#
# Exit codes:
#   0 = All migrations respect ownership
#   1 = Ownership violation detected
# ---------------------------------------------------------------------------

set -euo pipefail

REPO_ROLE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Auto-detect role from CWD ──────────────────────────────
if [[ -z "$REPO_ROLE" ]]; then
    if [[ "$PWD" == *"BOOTANDSTRAP_WEB"* ]]; then
        REPO_ROLE="control-plane"
    elif [[ "$PWD" == *"ecommerce-template"* ]]; then
        REPO_ROLE="data-plane"
    else
        echo "❌ Cannot auto-detect repo role. Pass 'control-plane' or 'data-plane' as argument."
        exit 1
    fi
fi

# ── Locate schema-ownership.json ───────────────────────────
OWNERSHIP_FILE=""
SEARCH="$SCRIPT_DIR"
for _ in 1 2 3 4; do
    if [[ -f "$SEARCH/schema-ownership.json" ]]; then
        OWNERSHIP_FILE="$(cd "$SEARCH" && pwd)/schema-ownership.json"
        break
    fi
    SEARCH="$SEARCH/.."
done

if [[ -z "$OWNERSHIP_FILE" ]]; then
    echo "⚠️  schema-ownership.json not found — skipping ownership check"
    exit 0
fi

# ── Locate migration directory (from PWD) ──────────────────
MIGRATIONS_DIR=""
if [[ -d "$PWD/supabase/migrations" ]]; then
    MIGRATIONS_DIR="$PWD/supabase/migrations"
fi

if [[ -z "$MIGRATIONS_DIR" ]]; then
    echo "⚠️  No supabase/migrations directory found in $PWD — skipping"
    exit 0
fi

echo "🔍 Checking schema ownership for role: $REPO_ROLE"
echo "   Ownership file: $OWNERSHIP_FILE"
echo "   Migrations dir: $MIGRATIONS_DIR"
echo ""

# ── Cutoff: only enforce on migrations created AFTER the contract ──
# Legacy migrations predate ownership enforcement and are exempted.
# Format expected in filenames: YYYYMMDD (e.g., 20260215_sprint3_transactional_provisioning.sql)
CUTOFF_DATE="20260208"

VIOLATIONS=0
WARNINGS=0

# ── Process each migration file ────────────────────────────
for sql_file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$sql_file" ]] || continue
    filename="$(basename "$sql_file")"

    # Extract date prefix from filename (YYYYMMDD or 0000N format)
    migration_date=$(echo "$filename" | grep -oE '^[0-9]+' | head -1 || echo "0")

    # Skip legacy migrations (before cutoff)
    if [[ "$migration_date" -le "$CUTOFF_DATE" ]]; then
        continue
    fi

    # Extract table names from DDL statements.
    # Matches: CREATE TABLE [IF NOT EXISTS] [public.]table_name
    #          ALTER TABLE [IF EXISTS] [public.]table_name
    #          DROP TABLE [IF EXISTS] [public.]table_name
    # Uses perl for reliable multi-line regex
    tables=$(perl -ne '
        while (/\b(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:public\.)?(\w+)/gi) {
            print "$1\n";
        }
    ' "$sql_file" | sort -u 2>/dev/null || true)

    for table in $tables; do
        # Skip if table name looks like a SQL keyword (safety net)
        if echo "$table" | grep -qiE '^(create|alter|drop|table|if|not|exists|public)$'; then
            continue
        fi

        # Look up owner using perl to parse JSON reliably
        owner=$(perl -0777 -ne "
            if (/\"$table\"\s*:\s*\{[^}]*\"owner\"\s*:\s*\"([^\"]+)\"/s) {
                print \"\$1\n\";
            }
        " "$OWNERSHIP_FILE" 2>/dev/null || echo "")

        if [[ -z "$owner" ]]; then
            echo "⚠️  [$filename] Table '$table' not in ownership file"
            WARNINGS=$((WARNINGS + 1))
            continue
        fi

        # Shared tables can be modified by either repo
        if [[ "$owner" == "shared" ]]; then
            continue
        fi

        # Check if this repo owns the table
        if [[ "$owner" != "$REPO_ROLE" ]]; then
            echo "❌ [$filename] VIOLATION: DDL on '$table' (owner: $owner, this repo: $REPO_ROLE)"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    done
done

echo ""
if [[ $WARNINGS -gt 0 ]]; then
    echo "⚠️  $WARNINGS table(s) not in ownership file (consider adding them)"
fi

if [[ $VIOLATIONS -gt 0 ]]; then
    echo "💥 Found $VIOLATIONS ownership violation(s). Fix migrations or update schema-ownership.json + INFRASTRUCTURE.md"
    exit 1
else
    echo "✅ All migrations respect schema ownership ($WARNINGS warnings)"
    exit 0
fi
