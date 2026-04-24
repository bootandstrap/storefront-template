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
read -rp "Owner email (e.g., 'owner@example.com'): " OWNER_EMAIL
read -rp "Seed profile (blank/retail/food/services) [blank]: " SEED_PROFILE
SEED_PROFILE="${SEED_PROFILE:-blank}"

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
echo "  Owner:   ${OWNER_EMAIL}"
echo "  Profile: ${SEED_PROFILE}"
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

# ── 3. Output next steps ────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║              ✅ Provisioning Complete          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "TENANT_ID: ${TENANT_ID}"
echo ""
echo "Next steps:"
echo "  1. Copy .env for local dev:"
echo "     cp ${ENV_FILE} .env"
echo ""
echo "  2. Seed governance (flags, limits, config):"
echo "     TENANT_ID=${TENANT_ID} npx tsx scripts/seed-governance.ts ${SEED_PROFILE}"
echo ""
echo "  3. Run Medusa migrations + seed:"
echo "     cd apps/medusa && npx medusa db:migrate"
echo "     npx tsx scripts/seed-demo.ts --template=${SEED_PROFILE}"
echo ""
echo "  4. For Dokploy deployment:"
echo "     - Set all env vars from ${ENV_FILE} in Dokploy"
echo "     - Configure domains: ${CLIENT_DOMAIN}, api.${CLIENT_DOMAIN}"
echo "     - Enable SSL"
echo ""
echo "📄 Full guide: docs/guides/DEPLOYMENT.md"

