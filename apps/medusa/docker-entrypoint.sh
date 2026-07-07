#!/bin/sh
# Medusa boot script — baked into Docker image at /app/docker-entrypoint.sh
# Handles: db:migrate → admin user creation → medusa start
RUNTIME_DATABASE_URL="${MEDUSA_DATABASE_URL:-${DATABASE_URL:-${SUPABASE_DB_URL:-}}}"
MIGRATIONS_DATABASE_URL="${MEDUSA_MIGRATIONS_DATABASE_URL:-${RUNTIME_DATABASE_URL}}"

echo "[medusa-entrypoint] Running migrations..."
DATABASE_URL="$MIGRATIONS_DATABASE_URL" npx medusa db:migrate
if [ $? -eq 0 ]; then
    echo "[medusa-entrypoint] ✅ Migrations complete"
else
    echo "[medusa-entrypoint] ⚠️ Migration failed (exit $?) — starting anyway for debugging"
fi

# Create admin user on first boot (idempotent — Medusa CLI skips if user exists)
# NOTE: Do NOT use --invite — it creates a separate invite flow that prevents
# direct emailpass login. Without --invite, the CLI creates the user + auth identity together.
# NOTE: stderr is NOT suppressed — container logs must show why creation failed.
if [ -n "$MEDUSA_ADMIN_EMAIL" ] && [ -n "$MEDUSA_ADMIN_PASSWORD" ]; then
    echo "[medusa-entrypoint] Creating admin user: $MEDUSA_ADMIN_EMAIL"
    if DATABASE_URL="$RUNTIME_DATABASE_URL" npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD"; then
        echo "[medusa-entrypoint] ✅ Admin user created (or already exists)"
    else
        EXIT_CODE=$?
        echo "[medusa-entrypoint] ⚠️ Admin user creation failed (exit=$EXIT_CODE) — check stderr above"
        echo "[medusa-entrypoint] ℹ️ If user already exists with different password, the pre-flight cleanup in job-queue.ts should have removed it"
    fi
else
    echo "[medusa-entrypoint] ⚠️ MEDUSA_ADMIN_EMAIL or MEDUSA_ADMIN_PASSWORD not set — skipping admin user creation"
fi

echo "[medusa-entrypoint] Starting Medusa..."
exec env DATABASE_URL="$RUNTIME_DATABASE_URL" npx medusa start
