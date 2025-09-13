#!/bin/bash
set -e

# Install missing package
pip install PyJWT

# Set the frontend URL environment variable
export FRONTEND_URL=${FRONTEND_URL:-"http://16.171.240.27:8080"}

echo "Waiting for PostgreSQL..."
while ! nc -z pg 5432; do
  sleep 1
done
echo "PostgreSQL started"

# Start the application
echo "Starting Gunicorn..."
exec gunicorn app.main:app --bind 0.0.0.0:8000 --workers 4 --worker-class uvicorn.workers.UvicornWorker
