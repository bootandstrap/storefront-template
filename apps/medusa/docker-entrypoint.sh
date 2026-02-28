#!/bin/sh
# Medusa boot script — baked into Docker image at /app/docker-entrypoint.sh
# Handles: db:migrate → admin user creation → medusa start
echo "[medusa-entrypoint] Running migrations..."
if npx medusa db:migrate; then
    echo "[medusa-entrypoint] ✅ Migrations complete"
else
    echo "[medusa-entrypoint] ⚠️ Migration failed (exit $?) — starting anyway for debugging"
fi

# Create admin user on first boot (idempotent — Medusa CLI skips if user exists)
# NOTE: Do NOT use --invite — it creates a separate invite flow that prevents
# direct emailpass login. Without --invite, the CLI creates the user + auth identity together.
if [ -n "$MEDUSA_ADMIN_EMAIL" ] && [ -n "$MEDUSA_ADMIN_PASSWORD" ]; then
    echo "[medusa-entrypoint] Creating admin user: $MEDUSA_ADMIN_EMAIL"
    if npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" 2>/dev/null; then
        echo "[medusa-entrypoint] ✅ Admin user created (or already exists)"
    else
        echo "[medusa-entrypoint] ⚠️ Admin user creation returned non-zero (may already exist — OK)"
    fi
fi

echo "[medusa-entrypoint] Starting Medusa..."
exec npx medusa start
