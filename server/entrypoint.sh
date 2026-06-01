#!/bin/sh
set -e

# Export environment variables with defaults if not provided
export DATABASE_URL="${DATABASE_URL:-postgresql://localhost/hersafety}"
export JWT_SECRET="${JWT_SECRET:-default_jwt_secret_change_in_production}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-default_refresh_secret_change_in_production}"
export APP_MODE="${APP_MODE:-production}"
export PORT="${PORT:-10000}"
export NODE_ENV="${NODE_ENV:-production}"

echo "[ENTRYPOINT] Starting HerSafety CI Backend"
echo "[ENTRYPOINT] APP_MODE=$APP_MODE"
echo "[ENTRYPOINT] PORT=$PORT"

# Run migrations if needed (non-blocking)
npm run migrate 2>/dev/null || echo "[ENTRYPOINT] Migrations skipped or failed (non-blocking)"

# Start the application
echo "[ENTRYPOINT] Starting npm..."
exec npm start
