#!/bin/sh
# Medusa boot script — baked into Docker image at /app/docker-entrypoint.sh
# Handles: db:migrate → admin user creation/repair → medusa start
echo "[medusa-entrypoint] Running migrations..."
if npx medusa db:migrate; then
    echo "[medusa-entrypoint] ✅ Migrations complete"
else
    echo "[medusa-entrypoint] ⚠️ Migration failed (exit $?) — starting anyway for debugging"
fi

ensure_admin_user() {
    STAGE="$1"
    MAX_ATTEMPTS="${2:-1}"
    DELAY_SECONDS="${3:-5}"

    # Create admin user on first boot (idempotent — Medusa CLI skips if user exists)
    # NOTE: Do NOT use --invite — it creates a separate invite flow that prevents
    # direct emailpass login. Without --invite, the CLI creates the user + auth identity together.
    # NOTE: stderr is NOT suppressed — container logs must show why creation failed.
    if [ -z "$MEDUSA_ADMIN_EMAIL" ] || [ -z "$MEDUSA_ADMIN_PASSWORD" ]; then
        echo "[medusa-entrypoint] ⚠️ MEDUSA_ADMIN_EMAIL or MEDUSA_ADMIN_PASSWORD not set — skipping admin user creation"
        return 0
    fi

    ATTEMPT=1
    while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
        echo "[medusa-entrypoint] Ensuring admin user ($STAGE attempt $ATTEMPT/$MAX_ATTEMPTS): $MEDUSA_ADMIN_EMAIL"
        if npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD"; then
            echo "[medusa-entrypoint] ✅ Admin user ready ($STAGE)"
            return 0
        fi

        EXIT_CODE=$?
        echo "[medusa-entrypoint] ⚠️ Admin user ensure failed (stage=$STAGE attempt=$ATTEMPT exit=$EXIT_CODE) — check stderr above"
        echo "[medusa-entrypoint] ℹ️ If user already exists with different password, the pre-flight cleanup in job-queue.ts should have removed it"
        ATTEMPT=$((ATTEMPT + 1))
        if [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; then
            sleep "$DELAY_SECONDS"
        fi
    done

    return 1
}

ensure_admin_user "pre-start" 3 5 || true

echo "[medusa-entrypoint] Starting Medusa..."
npx medusa start &
MEDUSA_PID=$!

trap 'kill "$MEDUSA_PID" 2>/dev/null || true; wait "$MEDUSA_PID" 2>/dev/null || true' INT TERM

(
    sleep 15
    ensure_admin_user "post-start" 12 15 || echo "[medusa-entrypoint] ⚠️ Post-start admin repair exhausted"
) &
ADMIN_REPAIR_PID=$!

wait "$MEDUSA_PID"
MEDUSA_STATUS=$?
kill "$ADMIN_REPAIR_PID" 2>/dev/null || true
wait "$ADMIN_REPAIR_PID" 2>/dev/null || true
exit "$MEDUSA_STATUS"
