#!/bin/sh
set -e

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
  alembic upgrade head
else
  echo "Skipping migrations (SKIP_MIGRATIONS=$SKIP_MIGRATIONS)"
fi

exec "$@"
