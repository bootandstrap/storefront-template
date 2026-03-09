#!/bin/bash
# Bundle size analyzer for storefront
# Usage: bash scripts/analyze-bundle.sh

set -e

echo "📦 Building with bundle analysis..."
cd "$(dirname "$0")/.."

# Build with Next.js bundle analyzer
NEXT_BUNDLE_ANALYZE=true pnpm turbo build --filter=storefront

echo ""
echo "✅ Bundle analysis complete!"
echo "📊 Check .next/analyze/ directory for bundle visualization."
echo ""
echo "Key thresholds:"
echo "  • First Load JS: < 100kB (target)"
echo "  • Shared chunks: < 80kB"
echo "  • Page-specific: < 50kB"
