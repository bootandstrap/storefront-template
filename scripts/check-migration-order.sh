#!/usr/bin/env bash
# =============================================================================
# check-migration-order.sh — Migration graph consistency check
# =============================================================================
# POSIX-compatible (macOS default grep, bash 3.x).
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATION_DIR="$(cd "$SCRIPT_DIR/../supabase/migrations" && pwd)"
EXIT_CODE=0

echo "=== Migration Graph Consistency Check ==="
echo "Scanning: $MIGRATION_DIR"
echo ""

# -- 1. Duplicate CREATE TABLE -------------------------------------------------
echo "── Check 1: Duplicate CREATE TABLE statements"
DUPES=$(grep -ih 'CREATE TABLE' "$MIGRATION_DIR"/*.sql 2>/dev/null | \
    sed -E 's/.*CREATE[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+NOT[[:space:]]+EXISTS[[:space:]]+)?([a-zA-Z_][a-zA-Z0-9_]*).*/\2/' | \
    sort | uniq -d || true)

if [ -n "$DUPES" ]; then
    echo "$DUPES" | while IFS= read -r table; do
        echo "  ⚠️  Table '$table' created in multiple files"
    done
else
    echo "  ✅ No duplicate CREATE TABLE"
fi
echo ""

# -- 2. CREATE POLICY without DROP IF EXISTS -----------------------------------
echo "── Check 2: CREATE POLICY idempotency"
for file in "$MIGRATION_DIR"/*.sql; do
    bname=$(basename "$file")
    policies=$(grep 'CREATE POLICY' "$file" 2>/dev/null | sed -E 's/.*CREATE POLICY[[:space:]]+"([^"]+)".*/\1/' || true)
    if [ -n "$policies" ]; then
        echo "$policies" | while IFS= read -r pname; do
            if [ -n "$pname" ] && ! grep -q "DROP POLICY IF EXISTS \"$pname\"" "$file" 2>/dev/null; then
                echo "  ⚠️  $bname: \"$pname\" — no DROP IF EXISTS"
            fi
        done
    fi
done
echo "  ✅ Policy check complete"
echo ""

# -- 3. plan_tier in canonical migration ---------------------------------------
echo "── Check 3: plan_tier in canonical migration"
CANONICAL="$MIGRATION_DIR/20260209_multi_tenant_foundation.sql"
if [ -f "$CANONICAL" ]; then
    if grep -q 'plan_tier' "$CANONICAL" 2>/dev/null; then
        echo "  ✅ plan_tier present"
    else
        echo "  ❌ plan_tier MISSING"
        EXIT_CODE=1
    fi
else
    echo "  ⚠️  Canonical file not found"
fi
echo ""

# -- 4. Duplicate seed INSERTs ------------------------------------------------
echo "── Check 4: Tenant seed INSERTs"
SEED_COUNT=$(grep -rl "INSERT INTO tenants" "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ "$SEED_COUNT" -gt 1 ]; then
    echo "  ⚠️  INSERT INTO tenants found in $SEED_COUNT files (ensure ON CONFLICT DO NOTHING)"
else
    echo "  ✅ Single seed source"
fi
echo ""

# -- Summary -------------------------------------------------------------------
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "=== ✅ All checks passed ==="
else
    echo "=== ❌ Checks FAILED ==="
fi
exit "$EXIT_CODE"
