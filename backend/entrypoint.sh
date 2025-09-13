#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z pg 5432; do
  sleep 0.5
done
echo "PostgreSQL started"

echo "Running database migrations..."
alembic upgrade head

exec "$@"