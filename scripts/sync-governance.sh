#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-governance.sh — Sync governance modules from shared package to inline
#
# Usage:
#   ./scripts/sync-governance.sh [--check]
#
# Without flags: copies files from packages/shared to apps/storefront inline
# With --check:  verifies alignment without modifying files (for CI)
#
# 🔴 LOCKED files are overwritten — the shared package is always the SSOT.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SHARED_DIR="packages/shared/src/governance"
INLINE_DIR="apps/storefront/src/lib/governance"
FILES=("schemas.ts" "defaults.ts" "circuit-breaker.ts" "cache.ts" "tenant.ts" "report.ts" "index.ts")

# Detect repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -d "$SHARED_DIR" ]]; then
    echo "⚠️  Shared governance package not found at $SHARED_DIR"
    echo "   This script must run from the ecommerce-template monorepo root."
    exit 1
fi

CHECK_MODE=false
if [[ "${1:-}" == "--check" ]]; then
    CHECK_MODE=true
fi

DRIFT_FOUND=false

for file in "${FILES[@]}"; do
    shared_file="$SHARED_DIR/$file"
    inline_file="$INLINE_DIR/$file"

    if [[ ! -f "$shared_file" ]]; then
        echo "⚠️  Missing shared file: $shared_file"
        continue
    fi

    if [[ ! -f "$inline_file" ]]; then
        if $CHECK_MODE; then
            echo "❌ DRIFT: $inline_file does not exist (expected from $shared_file)"
            DRIFT_FOUND=true
        else
            echo "📋 Creating: $inline_file"
            mkdir -p "$(dirname "$inline_file")"
            # Replace CANONICAL header with LOCKED header
            sed 's/@locked 🔴 CANONICAL.*/@locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.\n * Source of truth: ecommerce-template\/packages\/shared\/src\/governance\/'"$file"'\n * Sync via: scripts\/sync-governance.sh/' \
                "$shared_file" > "$inline_file"
        fi
        continue
    fi

    # Compare field counts (structural alignment, not exact content)
    shared_bools=$(grep -c 'z\.boolean()' "$shared_file" 2>/dev/null || echo 0)
    inline_bools=$(grep -c 'z\.boolean()' "$inline_file" 2>/dev/null || echo 0)
    shared_nums=$(grep -c 'z\.number()' "$shared_file" 2>/dev/null || echo 0)
    inline_nums=$(grep -c 'z\.number()' "$inline_file" 2>/dev/null || echo 0)

    if [[ "$shared_bools" != "$inline_bools" || "$shared_nums" != "$inline_nums" ]]; then
        if $CHECK_MODE; then
            echo "❌ DRIFT: $file — shared(bools=$shared_bools, nums=$shared_nums) vs inline(bools=$inline_bools, nums=$inline_nums)"
            DRIFT_FOUND=true
        else
            echo "🔄 Syncing: $file (drift detected)"
            sed 's/@locked 🔴 CANONICAL.*/@locked 🔴 LOCKED — DO NOT MODIFY in tenant repos.\n * Source of truth: ecommerce-template\/packages\/shared\/src\/governance\/'"$file"'\n * Sync via: scripts\/sync-governance.sh/' \
                "$shared_file" > "$inline_file"
        fi
    else
        echo "✅ Aligned: $file"
    fi
done

if $CHECK_MODE && $DRIFT_FOUND; then
    echo ""
    echo "❌ Governance drift detected! Run: ./scripts/sync-governance.sh"
    exit 1
fi

if ! $CHECK_MODE; then
    echo ""
    echo "✅ Governance modules synced successfully."
fi
