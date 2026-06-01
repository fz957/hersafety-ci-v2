#!/bin/sh

# Log environment
echo "[BOOT] HerSafety CI Backend - Starting"
echo "[BOOT] Node version: $(node --version)"
echo "[BOOT] npm version: $(npm --version)"
echo "[BOOT] Working directory: $(pwd)"
echo "[BOOT] Files: $(ls -la)"

# Export environment variables with defaults
export DATABASE_URL="${DATABASE_URL:-postgresql://localhost/hersafety}"
export JWT_SECRET="${JWT_SECRET:-default_jwt_secret_change_in_production}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-default_refresh_secret_change_in_production}"
export APP_MODE="${APP_MODE:-production}"
export PORT="${PORT:-10000}"
export NODE_ENV="${NODE_ENV:-production}"

echo "[BOOT] Configuration:"
echo "[BOOT]   APP_MODE=$APP_MODE"
echo "[BOOT]   PORT=$PORT"
echo "[BOOT]   DATABASE_URL=$DATABASE_URL (first 50 chars)"
echo "[BOOT]   NODE_ENV=$NODE_ENV"

# Verify npm packages are installed
if [ ! -d "node_modules" ]; then
  echo "[BOOT] node_modules not found, installing..."
  npm install
fi

echo "[BOOT] node_modules exists: $([ -d node_modules ] && echo 'YES' || echo 'NO')"
echo "[BOOT] src/server.js exists: $([ -f src/server.js ] && echo 'YES' || echo 'NO')"

# Start the application
echo "[BOOT] Executing: npm start"
exec npm start
