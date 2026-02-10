#!/usr/bin/env bash
# ─── BootandStrap Client Provisioning ──────────────────────
# Interactive script to provision a new client tenant.
#
# What this script does:
#   1. Collects client info interactively
#   2. Generates a .env.{slug} file in the project root
#   3. Prints the next steps (SQL, Medusa seed, Dokploy)
#
# Usage: ./scripts/provision-client.sh
# ───────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔══════════════════════════════════════════════╗"
echo "║  BootandStrap — Client Provisioning Wizard   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Gather info ─────────────────────────────────────────
read -rp "Client name (e.g., 'Fresh Market'): " CLIENT_NAME
read -rp "Client slug (e.g., 'fresh-market'): " CLIENT_SLUG
read -rp "Client domain (e.g., 'freshmarket.com'): " CLIENT_DOMAIN
read -rp "Plan tier (starter/pro/enterprise) [starter]: " PLAN_TIER
PLAN_TIER="${PLAN_TIER:-starter}"

echo ""
echo "── Supabase Config ──"
read -rp "Supabase URL: " SUPABASE_URL
read -rp "Supabase Anon Key: " SUPABASE_ANON_KEY
read -rp "Supabase Service Role Key: " SUPABASE_SERVICE_KEY

echo ""
echo "── Medusa Config ──"
read -rp "Medusa Admin Email [admin@${CLIENT_DOMAIN}]: " MEDUSA_ADMIN_EMAIL
MEDUSA_ADMIN_EMAIL="${MEDUSA_ADMIN_EMAIL:-admin@${CLIENT_DOMAIN}}"

echo ""
echo "── Optional Integrations ──"
read -rp "Stripe Secret Key (or leave blank): " STRIPE_SECRET
read -rp "Stripe Webhook Secret (or leave blank): " STRIPE_WEBHOOK
read -rp "WhatsApp Phone Number (or leave blank): " WHATSAPP_PHONE

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Client:  ${CLIENT_NAME} (${CLIENT_SLUG})"
echo "  Domain:  ${CLIENT_DOMAIN}"
echo "  Plan:    ${PLAN_TIER}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -rp "Proceed? (y/N): " CONFIRM
[[ "$CONFIRM" =~ ^[Yy] ]] || { echo "Aborted."; exit 1; }

# ── 2. Generate .env file in project root ────────────────
ENV_FILE="${ROOT_DIR}/.env.${CLIENT_SLUG}"
TENANT_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")

cat > "$ENV_FILE" <<EOF
# ─── ${CLIENT_NAME} Environment ───
# Generated on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Tenant
TENANT_ID=${TENANT_ID}
NEXT_PUBLIC_TENANT_ID=${TENANT_ID}

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# Medusa
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_ADMIN_EMAIL=${MEDUSA_ADMIN_EMAIL}
COOKIE_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=

# Store
NEXT_PUBLIC_STORE_URL=https://${CLIENT_DOMAIN}

# Stripe (optional)
STRIPE_SECRET_KEY=${STRIPE_SECRET}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK}

# WhatsApp (optional)
WHATSAPP_PHONE=${WHATSAPP_PHONE}

# Redis
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=production
EOF
echo "✓ Generated .env file: ${ENV_FILE}"

# ── 3. Prepare SQL with placeholders replaced ───────────
SQL_OUT="${ROOT_DIR}/scripts/.provision-${CLIENT_SLUG}.sql"
sed -e "s/__TENANT_SLUG__/${CLIENT_SLUG}/g" \
    -e "s/__TENANT_NAME__/${CLIENT_NAME}/g" \
    -e "s/__PLAN_TIER__/${PLAN_TIER}/g" \
    -e "s/__DOMAIN__/${CLIENT_DOMAIN}/g" \
    "${SCRIPT_DIR}/provision-tenant.sql" > "$SQL_OUT"
echo "✓ Generated SQL script: ${SQL_OUT}"

# ── 4. Output next steps ────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║              ✅ Provisioning Complete          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "TENANT_ID: ${TENANT_ID}"
echo ""
echo "Next steps:"
echo "  1. Run tenant SQL against Supabase:"
echo "     psql \$DATABASE_URL < ${SQL_OUT}"
echo ""
echo "  2. Copy .env for local dev:"
echo "     cp ${ENV_FILE} apps/storefront/.env.local"
echo "     cp ${ENV_FILE} apps/medusa/.env"
echo ""
echo "  3. Seed Medusa products:"
echo "     cd apps/medusa && npx medusa db:migrate && npx medusa exec ./src/scripts/seed.ts"
echo ""
echo "  4. For Dokploy deployment:"
echo "     - Set all env vars from ${ENV_FILE} in Dokploy"
echo "     - Configure domains: ${CLIENT_DOMAIN}, api.${CLIENT_DOMAIN}"
echo "     - Enable SSL"
echo ""
echo "📄 Full guide: docs/guides/DEPLOYMENT.md"
