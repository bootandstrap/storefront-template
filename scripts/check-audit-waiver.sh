#!/usr/bin/env bash
# ============================================================================
# check-audit-waiver.sh — Audit gate with waiver support
# ============================================================================
# Checks the npm bulk advisory endpoint for moderate+ advisories. If advisories
# are found, checks docs/operations/DEPENDENCY_RISK_REGISTER.md for valid,
# non-expired waivers.
#
# EXIT CODES:
#   0 — No unwaived advisories
#   1 — Unwaived or expired advisory found → RELEASE BLOCKED
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
REGISTER="$ROOT_DIR/docs/operations/DEPENDENCY_RISK_REGISTER.md"

RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}🔍 Running bulk advisory audit --audit-level=moderate${NC}"

if [[ ! -f "$REGISTER" ]]; then
    echo -e "${RED}❌ DEPENDENCY_RISK_REGISTER.md not found at $REGISTER${NC}"
    echo "   All moderate+ advisories require a waiver or a patch."
    exit 1
fi

node "$ROOT_DIR/scripts/audit-bulk-advisory.mjs" \
    --root "$ROOT_DIR" \
    --register "$REGISTER" \
    --audit-level moderate
