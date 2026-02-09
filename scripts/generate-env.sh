#!/usr/bin/env bash
# ─── Generate .env from template (non-interactive) ─────────
# Usage: ./scripts/generate-env.sh <client-slug>
#
# Reads from clients/<slug>/config.json and generates .env
# Suitable for CI/automation pipelines.
# ───────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

CLIENT_SLUG="${1:?Usage: $0 <client-slug>}"
CONFIG_FILE="${ROOT_DIR}/clients/${CLIENT_SLUG}/config.json"
ENV_FILE="${ROOT_DIR}/clients/${CLIENT_SLUG}/.env"
TEMPLATE="${SCRIPT_DIR}/templates/env.template"

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Config not found: ${CONFIG_FILE}"
    echo "   Create it first or use provision-client.sh interactively."
    exit 1
fi

echo "Generating .env for ${CLIENT_SLUG}..."

# Read values from config.json using built-in tools
get_val() {
    grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$CONFIG_FILE" | head -1 | sed 's/.*: *"\(.*\)"/\1/'
}

# Generate secrets
COOKIE_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# Fill template
sed -e "s|\${SUPABASE_URL}|$(get_val supabase_url)|g" \
    -e "s|\${SUPABASE_ANON_KEY}|$(get_val supabase_anon_key)|g" \
    -e "s|\${SUPABASE_SERVICE_KEY}|$(get_val supabase_service_key)|g" \
    -e "s|\${MEDUSA_ADMIN_EMAIL}|$(get_val admin_email)|g" \
    -e "s|\${CLIENT_DOMAIN}|$(get_val domain)|g" \
    -e "s|\${CLIENT_NAME}|$(get_val name)|g" \
    -e "s|\${CLIENT_SLUG}|${CLIENT_SLUG}|g" \
    -e "s|\${COOKIE_SECRET}|${COOKIE_SECRET}|g" \
    -e "s|\${JWT_SECRET}|${JWT_SECRET}|g" \
    -e "s|\${STRIPE_SECRET}|$(get_val stripe_secret_key)|g" \
    -e "s|\${STRIPE_WEBHOOK}|$(get_val stripe_webhook_secret)|g" \
    -e "s|\${WHATSAPP_PHONE}|$(get_val whatsapp_phone)|g" \
    "$TEMPLATE" > "$ENV_FILE"

echo "✅ Generated: ${ENV_FILE}"
