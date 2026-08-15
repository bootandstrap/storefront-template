#!/bin/sh
# Medusa boot script — baked into Docker image at /app/docker-entrypoint.sh
# Handles: fail-closed db:migrate → idempotent admin ensure → medusa start.
set -eu

MEDUSA_CLI="${MEDUSA_CLI:-/app/node_modules/.bin/medusa}"

if [ ! -x "$MEDUSA_CLI" ]; then
    echo "[medusa-entrypoint] Medusa CLI is unavailable" >&2
    exit 1
fi

echo "[medusa-entrypoint] Running migrations..."
if ! "$MEDUSA_CLI" db:migrate; then
    echo "[medusa-entrypoint] Migration failed; runtime start is prohibited" >&2
    exit 1
fi
echo "[medusa-entrypoint] Migrations complete"

# Create the admin user only when the credential pair is complete. Medusa's user
# command is idempotent for an existing user; any other failure is terminal.
if [ -n "${MEDUSA_ADMIN_EMAIL:-}" ] || [ -n "${MEDUSA_ADMIN_PASSWORD:-}" ]; then
    if [ -z "${MEDUSA_ADMIN_EMAIL:-}" ] || [ -z "${MEDUSA_ADMIN_PASSWORD:-}" ]; then
        echo "[medusa-entrypoint] Admin credential pair is incomplete" >&2
        exit 1
    fi

    echo "[medusa-entrypoint] Ensuring admin user..."
    if ! "$MEDUSA_CLI" user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD"; then
        echo "[medusa-entrypoint] Admin user ensure failed; runtime start is prohibited" >&2
        exit 1
    fi
    echo "[medusa-entrypoint] Admin user ready"
else
    echo "[medusa-entrypoint] Admin credentials absent; admin ensure not required by this runtime"
fi

echo "[medusa-entrypoint] Starting Medusa..."
exec "$MEDUSA_CLI" start
