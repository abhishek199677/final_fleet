#!/bin/sh
set -e

# Build DATABASE_URL from individual vars if not set
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo "Running database migrations..."
pnpm --filter @fleetos/db exec node-pg-migrate up \
  --migrations-dir migrations \
  --database-url-env-var DATABASE_URL || echo "Migration warning (may already be applied)"

echo "Starting API..."
exec node packages/api/dist/main.js
