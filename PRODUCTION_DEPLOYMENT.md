# Production Deployment Guide

This guide covers deploying Applytide to a production environment.

## Pre-deployment Checklist

### 1. Environment Configuration
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Fill in all required values in `.env.production`
- [ ] Generate secure JWT secrets using: `python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(32)); print('REFRESH_SECRET=' + secrets.token_urlsafe(32))"`
- [ ] Configure production SMTP settings
- [ ] Set up Google OAuth credentials for production domain
- [ ] Configure OpenAI API key

### 2. SSL Certificates
- [ ] Obtain SSL certificates for your domain
- [ ] Place `fullchain.pem` and `privkey.pem` in `nginx/ssl/` directory
- [ ] Ensure certificates are readable by nginx container

### 3. Domain Configuration
- [ ] Update DNS records to point to your server
- [ ] Verify domain accessibility on ports 80 and 443

### 4. Chrome Extension (if updating)
- [ ] Remove `version_name` field from `manifest.json` for production
- [ ] The extension automatically detects production vs development based on domain

## Deployment Steps

### 1. Server Setup
```bash
# Clone repository on production server
git clone https://github.com/yourusername/applytide.git
cd applytide

# Copy and configure environment
cp .env.production.example .env.production
# Edit .env.production with your production values
```

### 2. Deploy Application
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 3. Verify Deployment
- [ ] Check all containers are running: `docker-compose -f docker-compose.prod.yml ps`
- [ ] Test HTTPS redirect: `curl -I http://applytide.com`
- [ ] Verify API health: `curl https://applytide.com/api/health`
- [ ] Test frontend loading: Visit `https://applytide.com`
- [ ] Test authentication flows
- [ ] Test Chrome extension connection

## Security Considerations

### Essential Security Settings
- **JWT Secrets**: Must be cryptographically secure random strings (32+ characters)
- **Database Password**: Use a strong, unique password
- **Redis Password**: Use a strong, unique password
- **HTTPS Enforcement**: All HTTP traffic is automatically redirected to HTTPS
- **CORS Origins**: Restricted to production domain only
- **Cookie Security**: Secure cookies enabled in production

### SSL/TLS Configuration
The nginx configuration includes:
- HTTP to HTTPS redirect
- HTTP/2 support
- Modern SSL settings
- Rate limiting protection

### Database Security
- Use dedicated database user with minimal permissions
- Enable SSL/TLS for database connections if using external database
- Regular automated backups recommended

## Environment Variables Reference

### Critical Security Variables
- `JWT_SECRET`: JWT signing secret (32+ chars)
- `REFRESH_SECRET`: Refresh token signing secret (32+ chars)
- `DB_PASSWORD`: Database password
- `REDIS_PASSWORD`: Redis password

### Application URLs
- `FRONTEND_URL`: Your production domain (https://applytide.com)
- `APP_BASE_URL`: Same as FRONTEND_URL
- `GOOGLE_REDIRECT_URI`: OAuth callback URL

### Email Configuration
- `SMTP_HOST`: Production SMTP server
- `SMTP_PORT`: Usually 587 for TLS
- `SMTP_USER`: SMTP username
- `SMTP_PASSWORD`: SMTP password

## Monitoring and Maintenance

### Log Monitoring
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Updates and Maintenance
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./deploy.sh

# Database migrations (if needed)
docker-compose -f docker-compose.prod.yml exec backend python -m alembic upgrade head
```

### Backup Recommendations
- Regular database backups
- Environment file backups (secure storage)
- SSL certificate backups
- Container volume backups

## Troubleshooting

### Common Issues
1. **SSL Certificate Issues**: Verify certificate files are in correct location and readable
2. **Database Connection**: Check DATABASE_URL format and credentials
3. **OAuth Issues**: Verify Google OAuth configuration and callback URL
4. **Email Issues**: Test SMTP settings and credentials
5. **Extension Issues**: Ensure extension can connect to production API

### Health Checks
- API Health: `https://applytide.com/api/health`
- Frontend: `https://applytide.com`
- Database: Check application logs for connection status
- Redis: Check application logs for Redis connection

## Support
For deployment issues, check:
1. Application logs for error details
2. Nginx logs for routing issues
3. Database connectivity
4. Environment variable configuration