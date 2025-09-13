#!/bin/bash
set -e

# Load environment variables for passwords
export DB_PASSWORD=$(grep -oP 'DATABASE_URL=.*?:.*?:\K[^@]*' .env.production)
export REDIS_PASSWORD=$(grep -oP 'REDIS_URL=.*?:.*?:\K[^@]*' .env.production)

# Build and start containers
echo "Building and starting production containers..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

echo "Deployment complete! Services running at https://applytide.com"