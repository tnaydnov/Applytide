import secrets
import os

# Generate new secure tokens
jwt_secret = secrets.token_urlsafe(32)
refresh_secret = secrets.token_urlsafe(32)
db_password = secrets.token_urlsafe(16)
redis_password = secrets.token_urlsafe(16)

# Create a production .env file template with new secrets
with open('.env.production.new', 'w') as f:
    f.write(f"""# Production Environment (SECURE VERSION)
ENVIRONMENT=production
PORT=8000
JWT_SECRET={jwt_secret}
REFRESH_SECRET={refresh_secret}
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7

# Security settings
ALLOWED_ORIGINS=https://applytide.com
ALLOWED_HOSTS=applytide.com,www.applytide.com
SECURE_COOKIES=true
SAME_SITE_COOKIES=lax

# Database and cache - ROTATE THESE PASSWORDS IN PRODUCTION
DATABASE_URL=postgresql+psycopg2://applytide_user:{db_password}@pg:5432/applytide_prod
REDIS_URL=redis://:{redis_password}@redis:6379/0

# Email settings - Replace with your actual provider
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY_HERE
FROM_EMAIL=no-reply@applytide.com
SMTP_FROM=no-reply@applytide.com

# OpenAI - Replace with your new API key
OPENAI_API_KEY=YOUR_NEW_OPENAI_API_KEY_HERE

# Rate limiting
RATE_LIMIT_ENABLED=true
LOGIN_RATE_LIMIT=5
REFRESH_RATE_LIMIT=10
""")

print("New secrets generated! Check .env.production.new")
print(f"JWT_SECRET: {jwt_secret}")
print(f"REFRESH_SECRET: {refresh_secret}")
print(f"DB_PASSWORD: {db_password}")
print(f"REDIS_PASSWORD: {redis_password}")
print("\nIMPORTANT: Save these values securely! They won't be shown again.")