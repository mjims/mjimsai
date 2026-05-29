#!/usr/bin/env bash
set -e

echo "[entrypoint] MILA Open API starting..."

# Run database migrations if requested
if [ "${RUN_MIGRATIONS}" = "1" ]; then
    echo "[entrypoint] Running Alembic migrations..."
    cd /app
    python -m alembic upgrade head
    echo "[entrypoint] Migrations complete."
    echo "[entrypoint] Running database seed..."
    python -m app.scripts.seed
fi

# Execute the main command (uvicorn)
echo "[entrypoint] Starting application..."
exec "$@"
