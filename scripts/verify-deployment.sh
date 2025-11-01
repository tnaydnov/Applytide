#!/bin/bash
#
# Deployment Verification Script
# Checks if all services are healthy after deployment
#

set -e

echo "🔍 Verifying deployment..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if all containers are running
echo ""
echo "📦 Checking container status..."
if docker compose -f docker-compose.prod.yml ps | grep -q "Exit"; then
    echo -e "${RED}❌ Some containers have exited${NC}"
    docker compose -f docker-compose.prod.yml ps
    exit 1
else
    echo -e "${GREEN}✅ All containers are running${NC}"
fi

# Check Nginx config
echo ""
echo "🔧 Testing Nginx configuration..."
if docker compose -f docker-compose.prod.yml exec -T nginx nginx -t &> /dev/null; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    docker compose -f docker-compose.prod.yml exec -T nginx nginx -t
    exit 1
fi

# Check if backend is responding
echo ""
echo "🔌 Checking backend health..."
if docker compose -f docker-compose.prod.yml exec -T backend curl -sf http://localhost:8000/health &> /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed (might be normal if no /health endpoint)${NC}"
fi

# Check if frontend is responding
echo ""
echo "🌐 Checking frontend..."
if docker compose -f docker-compose.prod.yml exec -T frontend curl -sf http://localhost:3000 &> /dev/null; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
    exit 1
fi

# Check Nginx can reach backend
echo ""
echo "🔗 Testing Nginx → Backend connection..."
if docker compose -f docker-compose.prod.yml exec -T nginx wget -q --spider http://backend:8000/docs &> /dev/null; then
    echo -e "${GREEN}✅ Nginx can reach backend${NC}"
else
    echo -e "${RED}❌ Nginx cannot reach backend${NC}"
    exit 1
fi

# Check Nginx can reach frontend
echo ""
echo "🔗 Testing Nginx → Frontend connection..."
if docker compose -f docker-compose.prod.yml exec -T nginx wget -q --spider http://frontend:3000 &> /dev/null; then
    echo -e "${GREEN}✅ Nginx can reach frontend${NC}"
else
    echo -e "${RED}❌ Nginx cannot reach frontend${NC}"
    exit 1
fi

# Check external HTTPS access
echo ""
echo "🌍 Testing external HTTPS access..."
if curl -sf -k https://localhost &> /dev/null; then
    echo -e "${GREEN}✅ HTTPS is working${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS check failed (might be expected in some setups)${NC}"
fi

# Show container resource usage
echo ""
echo "📊 Container resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker compose -f docker-compose.prod.yml ps -q)

echo ""
echo -e "${GREEN}✅ Deployment verification complete!${NC}"
