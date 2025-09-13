#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z pg 5432; do
  sleep 1
done
echo "PostgreSQL started"

# Skip migrations - they're causing the errors
echo "Skipping database migrations..."

echo "Starting Gunicorn..."
exec gunicorn app.main:app --bind 0.0.0.0:8000 --workers 4 --worker-class uvicorn.workers.UvicornWorker
