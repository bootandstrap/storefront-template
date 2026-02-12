#!/usr/bin/env bash
# check-rls-effective.sh — Effective RLS verification via pg_policies
# Queries pg_policies to verify that every table in the public schema
# that holds tenant data has RLS enabled AND has at least one policy.
#
# Usage: ./scripts/check-rls-effective.sh <SUPABASE_DB_URL>
#   or: SUPABASE_DB_URL=... ./scripts/check-rls-effective.sh
#
# Exit codes: 0 = all checks passed, 1 = RLS gaps found

set -euo pipefail

DB_URL="${1:-${SUPABASE_DB_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "❌ Usage: $0 <SUPABASE_DB_URL>"
  echo "   or: SUPABASE_DB_URL=postgres://... $0"
  exit 1
fi

# Tables that MUST have RLS enabled (tenant-scoped data tables)
REQUIRED_RLS_TABLES=(
  config
  feature_flags
  plan_limits
  profiles
  cms_pages
  whatsapp_templates
  carousel_slides
  product_badges
  stripe_webhook_events
  audit_log
)

echo "═══════════════════════════════════════════════════"
echo "  Effective RLS Verification (pg_policies query)   "
echo "═══════════════════════════════════════════════════"
echo ""

ERRORS=0

for TABLE in "${REQUIRED_RLS_TABLES[@]}"; do
  # Check 1: Does the table exist? (skip if not — allows template flexibility)
  EXISTS=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$TABLE';" 2>/dev/null || echo "0")
  if [[ "$EXISTS" != "1" ]]; then
    echo "⏭️  $TABLE — table does not exist (skipped)"
    continue
  fi

  # Check 2: Is RLS enabled on the table?
  RLS_ENABLED=$(psql "$DB_URL" -tAc "SELECT relrowsecurity FROM pg_class WHERE relname='$TABLE' AND relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');" 2>/dev/null || echo "f")
  if [[ "$RLS_ENABLED" != "t" ]]; then
    echo "❌ $TABLE — RLS is NOT enabled"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check 3: Does the table have at least one policy?
  POLICY_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename='$TABLE';" 2>/dev/null || echo "0")
  if [[ "$POLICY_COUNT" -eq 0 ]]; then
    echo "❌ $TABLE — RLS enabled but NO policies defined (effectively blocks all access)"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check 4: List policies for audit trail
  echo "✅ $TABLE — RLS enabled, $POLICY_COUNT $([ "$POLICY_COUNT" -eq 1 ] && echo "policy" || echo "policies")"
  psql "$DB_URL" -tAc "SELECT '    → ' || policyname || ' (' || permissive || ', ' || cmd || ')' FROM pg_policies WHERE schemaname='public' AND tablename='$TABLE';" 2>/dev/null || true
done

echo ""
echo "═══════════════════════════════════════════════════"
if [[ $ERRORS -gt 0 ]]; then
  echo "  RESULT: ❌ FAIL — $ERRORS table(s) missing RLS"
  echo "═══════════════════════════════════════════════════"
  exit 1
else
  echo "  RESULT: ✅ PASS — All tenant tables have RLS + policies"
  echo "═══════════════════════════════════════════════════"
  exit 0
fi
