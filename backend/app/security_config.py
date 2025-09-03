"""Production security configuration and recommendations"""

# This file contains security recommendations and configuration for production deployment

SECURITY_RECOMMENDATIONS = {
    "jwt_secrets": {
        "description": "Use strong, unique secrets for JWT tokens",
        "recommendation": "Generate cryptographically secure random strings (minimum 32 characters)",
        "environment_vars": ["JWT_SECRET", "REFRESH_SECRET"],
        "command": "python -c \"import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(32)); print('REFRESH_SECRET=' + secrets.token_urlsafe(32))\""
    },
    
    "database_security": {
        "description": "Secure database configuration",
        "recommendations": [
            "Use dedicated database user with minimum required permissions",
            "Enable SSL/TLS for database connections",
            "Regular database backups with encryption",
            "Database connection pooling limits"
        ],
        "environment_vars": ["DATABASE_URL"]
    },
    
    "https_enforcement": {
        "description": "Enforce HTTPS in production",
        "recommendations": [
            "Set FRONTEND_URL to https://",
            "Configure reverse proxy (nginx) with SSL termination",
            "Use HTTP Strict Transport Security (HSTS) headers",
            "Implement certificate auto-renewal"
        ]
    },
    
    "cors_configuration": {
        "description": "Restrict CORS origins",
        "recommendation": "Set ALLOWED_ORIGINS to specific production domains only",
        "environment_vars": ["ALLOWED_ORIGINS"],
        "example": "ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com"
    },
    
    "rate_limiting": {
        "description": "Configure rate limiting for production load",
        "recommendations": [
            "Adjust GLOBAL_RATE_LIMIT_REQUESTS based on expected traffic",
            "Monitor Redis performance under load",
            "Implement progressive rate limiting for different endpoints"
        ],
        "environment_vars": ["GLOBAL_RATE_LIMIT_REQUESTS", "GLOBAL_RATE_LIMIT_WINDOW"]
    },
    
    "logging_and_monitoring": {
        "description": "Comprehensive logging for security monitoring",
        "recommendations": [
            "Set SECURITY_LOG_FILE to persistent storage",
            "Implement log rotation",
            "Set up monitoring alerts for suspicious activity",
            "Regular security log analysis"
        ],
        "environment_vars": ["SECURITY_LOG_FILE"]
    },
    
    "token_management": {
        "description": "Secure token configuration",
        "current_settings": {
            "access_token_lifetime": "15 minutes (recommended)",
            "refresh_token_lifetime": "7 days (production) vs 30 days (development)"
        },
        "recommendations": [
            "Consider shorter refresh token lifetime for high-security applications",
            "Implement device/session management",
            "Regular token cleanup from database"
        ]
    },
    
    "environment_isolation": {
        "description": "Separate development and production configurations",
        "recommendations": [
            "Use different JWT secrets for each environment",
            "Separate database instances",
            "Environment-specific logging levels",
            "Different rate limiting configurations"
        ]
    }
}


def print_security_checklist():
    """Print a security checklist for production deployment"""
    print("🔒 PRODUCTION SECURITY CHECKLIST")
    print("=" * 50)
    
    for category, config in SECURITY_RECOMMENDATIONS.items():
        print(f"\n📋 {category.replace('_', ' ').title()}")
        print("-" * 30)
        
        if "description" in config:
            print(f"Description: {config['description']}")
        
        if "recommendation" in config:
            print(f"✅ {config['recommendation']}")
        
        if "recommendations" in config:
            for rec in config["recommendations"]:
                print(f"✅ {rec}")
        
        if "environment_vars" in config:
            print(f"Environment Variables: {', '.join(config['environment_vars'])}")
        
        if "command" in config:
            print(f"Command: {config['command']}")
        
        if "example" in config:
            print(f"Example: {config['example']}")


if __name__ == "__main__":
    print_security_checklist()
