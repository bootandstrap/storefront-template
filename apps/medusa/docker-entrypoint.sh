#!/bin/sh

echo "[medusa-entrypoint] Running migrations..."
if npx medusa db:migrate; then
    echo "[medusa-entrypoint] ✅ Migrations complete"
else
    echo "[medusa-entrypoint] ⚠️ Migration failed (exit $?) — starting anyway for debugging"
fi

echo "[medusa-entrypoint] Starting Medusa..."
exec npx medusa start
