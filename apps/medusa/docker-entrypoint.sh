#!/bin/sh

echo "[medusa-entrypoint] Running migrations..."
if npx medusa db:migrate; then
    echo "[medusa-entrypoint] ✅ Migrations complete"
else
    echo "[medusa-entrypoint] ⚠️ Migration failed (exit $?) — starting anyway for debugging"
fi

# Create admin user on first boot (idempotent — Medusa CLI skips if user exists)
if [ -n "$MEDUSA_ADMIN_EMAIL" ] && [ -n "$MEDUSA_ADMIN_PASSWORD" ]; then
    echo "[medusa-entrypoint] Creating admin user: $MEDUSA_ADMIN_EMAIL"
    if npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" --invite 2>/dev/null; then
        echo "[medusa-entrypoint] ✅ Admin user created (or already exists)"
    else
        echo "[medusa-entrypoint] ⚠️ Admin user creation returned non-zero (may already exist — OK)"
    fi
fi

echo "[medusa-entrypoint] Starting Medusa..."
exec npx medusa start
