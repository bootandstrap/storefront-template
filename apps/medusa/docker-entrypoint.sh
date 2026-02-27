#!/bin/sh
set -e

echo "[medusa-entrypoint] Running migrations..."
npx medusa db:migrate
echo "[medusa-entrypoint] Migrations complete. Starting Medusa..."
exec npx medusa start
