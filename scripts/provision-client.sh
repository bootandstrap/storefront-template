#!/usr/bin/env bash
# ─── BootandStrap Client Provisioning ──────────────────────
# Interactive script to provision a new client tenant.
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

# ── 2. Generate directories ──────────────────────────────
CLIENT_DIR="${ROOT_DIR}/clients/${CLIENT_SLUG}"
mkdir -p "$CLIENT_DIR"
echo "✓ Created client directory: ${CLIENT_DIR}"

# ── 3. Generate .env file ────────────────────────────────
ENV_FILE="${CLIENT_DIR}/.env"
cat > "$ENV_FILE" <<EOF
# ─── ${CLIENT_NAME} Environment ───
# Generated on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# Medusa
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_ADMIN_EMAIL=${MEDUSA_ADMIN_EMAIL}
COOKIE_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# Store
NEXT_PUBLIC_STORE_URL=https://${CLIENT_DOMAIN}
NEXT_PUBLIC_STORE_NAME=${CLIENT_NAME}
TENANT_SLUG=${CLIENT_SLUG}

# Stripe (optional)
STRIPE_SECRET_KEY=${STRIPE_SECRET}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK}

# WhatsApp (optional)
WHATSAPP_PHONE=${WHATSAPP_PHONE}

# Redis
REDIS_URL=redis://redis-${CLIENT_SLUG}:6379

# Environment
NODE_ENV=production
EOF
echo "✓ Generated .env file: ${ENV_FILE}"

# ── 4. Generate Docker Compose override ──────────────────
COMPOSE_FILE="${CLIENT_DIR}/docker-compose.yml"
sed -e "s/\${CLIENT_SLUG}/${CLIENT_SLUG}/g" \
    -e "s/\${CLIENT_DOMAIN}/${CLIENT_DOMAIN}/g" \
    "${SCRIPT_DIR}/templates/docker-compose.client.yml" > "$COMPOSE_FILE" 2>/dev/null || true
echo "✓ Generated docker-compose.yml: ${COMPOSE_FILE}"

# ── 5. Output next steps ────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║              ✅ Provisioning Complete          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Run the tenant SQL to create Supabase records:"
echo "     psql \$DATABASE_URL < scripts/provision-tenant.sql"
echo "     (Update the SQL with: '${CLIENT_SLUG}', '${CLIENT_NAME}', '${PLAN_TIER}')"
echo ""
echo "  2. Seed Medusa products:"
echo "     cd apps/medusa && npx medusa exec ./src/scripts/seed.ts"
echo ""
echo "  3. Deploy with Docker Compose:"
echo "     cd clients/${CLIENT_SLUG} && docker compose up -d"
echo ""
echo "  4. Configure DNS:"
echo "     ${CLIENT_DOMAIN}     → A record → your VPS IP"
echo "     api.${CLIENT_DOMAIN} → A record → your VPS IP"
echo ""
echo "  5. Configure SSL in Dokploy"
echo ""
echo "📄 Full guide: docs/TEMPLATE_USAGE.md"
