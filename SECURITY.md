# Production Deployment Security Guide

## 🔒 Security Hardening Checklist

### 1. Environment Configuration

Create a production `.env` file with secure settings:

```bash
# Copy the production template
cp .env.production.example .env.production

# Generate secure JWT secrets
python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('REFRESH_SECRET=' + secrets.token_urlsafe(32))"
```

### 2. Required Environment Variables

**Critical Security Variables:**
- `ENVIRONMENT=production`
- `JWT_SECRET=<strong-random-string>`
- `REFRESH_SECRET=<different-strong-random-string>`
- `ALLOWED_ORIGINS=https://yourdomain.com`
- `ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com`
- `FRONTEND_URL=https://yourdomain.com`

**Database Security:**
- Use a dedicated database user with minimal permissions
- Enable SSL/TLS connections
- Regular encrypted backups

### 3. Security Features Implemented

✅ **Authentication & Authorization:**
- JWT tokens with 15-minute access token lifetime
- Refresh tokens with 7-day lifetime (production)
- Token revocation and cleanup
- Device/session tracking

✅ **Rate Limiting:**
- Global rate limiting (1000 requests/hour by default)
- Authentication endpoint rate limiting
- IP-based tracking

✅ **Security Headers:**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options
- Referrer Policy

✅ **CORS Protection:**
- Restricted origins in production
- Credential support
- Limited headers and methods

✅ **Input Validation:**
- Pydantic schemas for all inputs
- SQL injection prevention (SQLAlchemy ORM)
- XSS protection via headers

✅ **Logging & Monitoring:**
- Security event logging
- Failed authentication tracking
- Rate limit violations

### 4. Additional Security Recommendations

**SSL/TLS Configuration:**
```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Database Security:**
```sql
-- Create dedicated application user
CREATE USER jobflow_app WITH PASSWORD 'strong_random_password';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE jobflow TO jobflow_app;
GRANT USAGE ON SCHEMA public TO jobflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jobflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jobflow_app;
```

**Docker Security:**
```dockerfile
# Use non-root user
RUN addgroup --system --gid 1001 appgroup
RUN adduser --system --uid 1001 --gid 1001 appuser
USER appuser

# Read-only root filesystem
FROM python:3.11-slim
COPY --from=builder /app /app
WORKDIR /app
USER 1001
```

### 5. Monitoring and Alerts

**Security Monitoring:**
- Monitor failed login attempts
- Track rate limit violations
- Alert on suspicious activity
- Regular security log reviews

**Health Checks:**
```bash
# Check application health
curl -f https://yourdomain.com/health || exit 1

# Check SSL certificate expiry
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | openssl x509 -noout -dates
```

### 6. Security Testing

**Before Production Deployment:**
1. Run security scanner (e.g., OWASP ZAP)
2. Test rate limiting functionality
3. Verify JWT token security
4. Test CORS configuration
5. Validate SSL/TLS configuration
6. Review security headers

**Regular Security Maintenance:**
- Update dependencies regularly
- Rotate JWT secrets periodically
- Review and update rate limits
- Monitor security logs
- Backup and test recovery procedures

### 7. Incident Response

**Security Incident Checklist:**
1. Revoke all user tokens if needed:
   ```sql
   DELETE FROM refresh_tokens WHERE created_at < NOW();
   ```
2. Check security logs for suspicious activity
3. Update JWT secrets if compromised
4. Review and update rate limits
5. Notify users of security measures

## 🚀 Deployment Commands

```bash
# 1. Build production images
docker-compose -f docker-compose.prod.yml build

# 2. Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# 3. Run database migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 4. Check security configuration
docker-compose -f docker-compose.prod.yml exec backend python -m app.security_config
```

## 📊 Security Monitoring Dashboard

Consider implementing:
- Failed authentication rate monitoring
- Token usage patterns
- Rate limit hit rates
- Geographic access patterns
- Unusual user agent patterns

Remember: Security is an ongoing process, not a one-time setup. Regular reviews and updates are essential.
