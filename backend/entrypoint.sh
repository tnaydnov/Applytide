#!/bin/sh
set -e

# Fix ownership of mounted upload volumes (created as root by Docker).
# Only attempt if running as root; otherwise assume already correct.
if [ "$(id -u)" = "0" ]; then
  if [ -d /app/uploads ]; then
    chown -R appuser:appgroup /app/uploads 2>/dev/null || true
  fi
fi

echo "Waiting for PostgreSQL..."
while ! nc -z pg 5432; do
  sleep 0.5
done
echo "PostgreSQL started"

echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.5
done
echo "Redis started"

if [ -z "$SKIP_MIGRATIONS" ]; then
  echo "Running database migrations..."
  if [ "$(id -u)" = "0" ]; then
    gosu appuser alembic upgrade head
  else
    alembic upgrade head
  fi
else
  echo "Skipping migrations (SKIP_MIGRATIONS=$SKIP_MIGRATIONS)"
fi

# Drop to appuser for the app process if we started as root.
if [ "$(id -u)" = "0" ]; then
  exec gosu appuser "$@"
fi
exec "$@"