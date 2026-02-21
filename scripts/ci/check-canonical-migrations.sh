#!/usr/bin/env bash
# check-canonical-migrations.sh
# Ensures all SQL migrations live in the canonical path: supabase/migrations/
# Fails if any .sql migration files are found in non-canonical paths like:
#   apps/*/supabase/migrations/
#   apps/*/src/supabase/migrations/

set -euo pipefail

echo "🔍 Checking for non-canonical migration paths..."

NON_CANONICAL=()

# Find any .sql files in apps/*/supabase/migrations/
while IFS= read -r -d '' file; do
    NON_CANONICAL+=("$file")
done < <(find apps -path '*/supabase/migrations/*.sql' -print0 2>/dev/null || true)

# Find any .sql files in apps/*/src/supabase/migrations/
while IFS= read -r -d '' file; do
    NON_CANONICAL+=("$file")
done < <(find apps -path '*/src/supabase/migrations/*.sql' -print0 2>/dev/null || true)

if [ ${#NON_CANONICAL[@]} -gt 0 ]; then
    echo "❌ FAIL: Found ${#NON_CANONICAL[@]} migration(s) outside canonical path (supabase/migrations/):"
    for f in "${NON_CANONICAL[@]}"; do
        echo "  - $f"
    done
    echo ""
    echo "Move these files to supabase/migrations/ with idempotent syntax (IF NOT EXISTS, etc.)"
    exit 1
fi

echo "✅ PASS: All migrations are in canonical path (supabase/migrations/)"
exit 0
