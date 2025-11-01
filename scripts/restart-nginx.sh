#!/bin/bash
#
# Manual Nginx Restart Script
# Use this when Nginx needs a quick restart
#

set -e

echo "🔄 Restarting Nginx..."

cd ~/Applytide

# Restart Nginx container
docker compose -f docker-compose.prod.yml restart nginx

# Wait for Nginx to start
sleep 3

# Test configuration
echo "Testing Nginx configuration..."
docker compose -f docker-compose.prod.yml exec -T nginx nginx -t

# Check status
echo ""
echo "Nginx status:"
docker compose -f docker-compose.prod.yml ps nginx

echo ""
echo "✅ Nginx restarted successfully!"

# Show recent logs
echo ""
echo "📋 Recent Nginx logs:"
docker compose -f docker-compose.prod.yml logs --tail=20 nginx
