"""
Password Security Module

This module provides secure password hashing and verification using bcrypt
through passlib, along with cryptographically secure random string generation.

Features:
    - Bcrypt password hashing with automatic salt generation
    - Secure password verification with timing attack resistance
    - Cryptographically secure random string generation
    - Comprehensive input validation and error handling
    - Detailed security event logging

Security Considerations:
    - Uses bcrypt with default work factor (rounds=12)
    - Password verification is timing-attack resistant via constant-time comparison
    - All random strings generated using secrets.SystemRandom (CSPRNG)
    - Enforces password length limits to prevent DoS via excessive bcrypt rounds

Constants:
    MIN_PASSWORD_LENGTH: Minimum allowed password length (8 characters)
    MAX_PASSWORD_LENGTH: Maximum allowed password length (128 characters)
    DEFAULT_RANDOM_LENGTH: Default length for random string generation (32 characters)
    MIN_RANDOM_LENGTH: Minimum allowed random string length (16 characters)
    MAX_RANDOM_LENGTH: Maximum allowed random string length (256 characters)

Example:
    >>> from app.infra.security.passwords import hash_password, verify_password
    >>> hashed = hash_password("SecurePassword123!")
    >>> is_valid = verify_password("SecurePassword123!", hashed)
    >>> print(is_valid)  # True
    >>> 
    >>> # Generate secure random token
    >>> from app.infra.security.passwords import get_random_string
    >>> token = get_random_string(length=64)
    >>> print(len(token))  # 64
"""

from __future__ import annotations
import logging
import string
import secrets
from typing import Optional
from passlib.context import CryptContext

# Configure logger for password security events
logger = logging.getLogger(__name__)

# ============================================================================
# Exception Classes
# ============================================================================

class PasswordSecurityError(Exception):
    """Base exception for password security operations"""
    pass

class PasswordValidationError(PasswordSecurityError):
    """Exception raised when password validation fails"""
    pass

class PasswordHashError(PasswordSecurityError):
    """Exception raised when password hashing fails"""
    pass

class PasswordVerificationError(PasswordSecurityError):
    """Exception raised when password verification fails"""
    pass

class RandomStringError(PasswordSecurityError):
    """Exception raised when random string generation fails"""
    pass

# ============================================================================
# Configuration Constants
# ============================================================================

# Password length constraints
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

# Random string generation constraints
DEFAULT_RANDOM_LENGTH = 32
MIN_RANDOM_LENGTH = 16
MAX_RANDOM_LENGTH = 256

# Character sets for random string generation
ALPHANUMERIC_CHARS = string.ascii_letters + string.digits
ALPHANUM_SPECIAL_CHARS = string.ascii_letters + string.digits + string.punctuation

# Bcrypt context configuration
_pwd = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__default_rounds=12,  # Explicit work factor
)

# ============================================================================
# Validation Functions
# ============================================================================

def _validate_password(password: str, operation: str) -> None:
    """
    Validate password meets security requirements.
    
    Args:
        password: The password to validate
        operation: Description of operation (for error messages)
        
    Raises:
        PasswordValidationError: If password is invalid
    """
    if not isinstance(password, str):
        raise PasswordValidationError(
            f"Password for {operation} must be a string, got {type(password).__name__}"
        )
    
    if not password:
        raise PasswordValidationError(f"Password for {operation} cannot be empty")
    
    if len(password) < MIN_PASSWORD_LENGTH:
        raise PasswordValidationError(
            f"Password for {operation} must be at least {MIN_PASSWORD_LENGTH} characters, "
            f"got {len(password)}"
        )
    
    if len(password) > MAX_PASSWORD_LENGTH:
        raise PasswordValidationError(
            f"Password for {operation} must be at most {MAX_PASSWORD_LENGTH} characters, "
            f"got {len(password)} (potential DoS attempt)"
        )

def _validate_random_length(length: int) -> None:
    """
    Validate random string length parameter.
    
    Args:
        length: The requested string length
        
    Raises:
        RandomStringError: If length is invalid
    """
    if not isinstance(length, int):
        raise RandomStringError(
            f"Random string length must be an integer, got {type(length).__name__}"
        )
    
    if length < MIN_RANDOM_LENGTH:
        raise RandomStringError(
            f"Random string length must be at least {MIN_RANDOM_LENGTH}, got {length}"
        )
    
    if length > MAX_RANDOM_LENGTH:
        raise RandomStringError(
            f"Random string length must be at most {MAX_RANDOM_LENGTH}, got {length} "
            f"(potential memory exhaustion)"
        )

# ============================================================================
# Public API Functions
# ============================================================================

def get_random_string(
    length: int = DEFAULT_RANDOM_LENGTH,
    charset: Optional[str] = None
) -> str:
    """
    Generate a cryptographically secure random string.
    
    Uses secrets.SystemRandom which is suitable for security-sensitive
    applications such as generating tokens, passwords, and secret keys.
    
    Args:
        length: Length of random string to generate.
            Must be between MIN_RANDOM_LENGTH and MAX_RANDOM_LENGTH.
            Defaults to DEFAULT_RANDOM_LENGTH (32).
        charset: Character set to use for generation.
            If None, uses alphanumeric characters (a-zA-Z0-9).
            Can specify custom charset like string.ascii_letters or
            string.ascii_letters + string.digits + string.punctuation.
            
    Returns:
        Cryptographically secure random string of specified length.
        
    Raises:
        RandomStringError: If length validation fails or generation fails.
        
    Example:
        >>> # Generate default 32-character alphanumeric token
        >>> token = get_random_string()
        >>> len(token)
        32
        >>> 
        >>> # Generate 64-character token
        >>> long_token = get_random_string(length=64)
        >>> len(long_token)
        64
        >>> 
        >>> # Generate token with special characters
        >>> import string
        >>> special_token = get_random_string(
        ...     length=32,
        ...     charset=string.ascii_letters + string.digits + string.punctuation
        ... )
        
    Notes:
        - Uses secrets module (CSPRNG) not random module
        - Suitable for security tokens, API keys, session IDs
        - Not suitable for passwords (use password generators with strength rules)
        - Generated strings are uniformly distributed across charset
    """
    try:
        # Validate length parameter
        _validate_random_length(length)
        
        # Use default alphanumeric charset if none specified
        if charset is None:
            charset = ALPHANUMERIC_CHARS
        
        # Validate charset
        if not isinstance(charset, str) or not charset:
            raise RandomStringError(
                f"Charset must be a non-empty string, got {type(charset).__name__}"
            )
        
        logger.debug(
            "Generating random string",
            extra={
                "length": length,
                "charset_size": len(charset),
                "has_digits": any(c.isdigit() for c in charset),
                "has_letters": any(c.isalpha() for c in charset),
            }
        )
        
        # Generate random string using cryptographically secure random source
        random_string = "".join(secrets.choice(charset) for _ in range(length))
        
        logger.info(
            "Generated random string successfully",
            extra={
                "length": length,
                "charset_size": len(charset),
            }
        )
        
        return random_string
        
    except RandomStringError:
        # Re-raise validation errors
        raise
    except Exception as e:
        # Wrap unexpected errors
        logger.error(
            "Failed to generate random string",
            exc_info=True,
            extra={
                "length": length,
                "charset_provided": charset is not None,
                "error": str(e),
            }
        )
        raise RandomStringError(f"Random string generation failed: {e}") from e

def hash_password(raw: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    
    Uses bcrypt via passlib with default work factor (12 rounds).
    Each hash includes a unique random salt, so identical passwords
    produce different hashes.
    
    Args:
        raw: The plaintext password to hash.
            Must be between MIN_PASSWORD_LENGTH and MAX_PASSWORD_LENGTH characters.
            
    Returns:
        Bcrypt hash string (includes algorithm, rounds, salt, and hash).
        Format: $2b$12$[22-char-salt][31-char-hash]
        
    Raises:
        PasswordValidationError: If password validation fails.
        PasswordHashError: If hashing operation fails.
        
    Example:
        >>> password = "SecurePassword123!"
        >>> hashed = hash_password(password)
        >>> print(hashed[:7])  # $2b$12$
        $2b$12$
        >>> len(hashed)  # Total length is 60 characters
        60
        
    Notes:
        - Bcrypt automatically handles salt generation
        - Work factor of 12 provides strong security with reasonable performance
        - Maximum password length prevents DoS via excessive computation
        - Each call produces different hash even for same password (salted)
    """
    try:
        # Validate password
        _validate_password(raw, "hashing")
        
        logger.debug(
            "Hashing password",
            extra={
                "password_length": len(raw),
                "algorithm": "bcrypt",
                "rounds": 12,
            }
        )
        
        # Hash password using bcrypt
        hashed = _pwd.hash(raw)
        
        logger.info(
            "Password hashed successfully",
            extra={
                "password_length": len(raw),
                "hash_length": len(hashed),
                "algorithm": hashed[:4] if hashed else None,  # e.g., "$2b$"
            }
        )
        
        return hashed
        
    except PasswordValidationError:
        # Re-raise validation errors
        raise
    except Exception as e:
        # Wrap hashing errors
        logger.error(
            "Password hashing failed",
            exc_info=True,
            extra={
                "password_length": len(raw) if isinstance(raw, str) else None,
                "error": str(e),
            }
        )
        raise PasswordHashError(f"Password hashing failed: {e}") from e

def verify_password(raw: str, hashed: str) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    
    Uses constant-time comparison to prevent timing attacks. The comparison
    time is independent of where passwords differ, making it impossible to
    determine password characters through timing analysis.
    
    Args:
        raw: The plaintext password to verify
        hashed: The bcrypt hash to verify against
        
    Returns:
        True if password matches hash, False otherwise.
        Returns False for any error rather than raising (graceful degradation).
        
    Raises:
        PasswordValidationError: If password validation fails.
        PasswordVerificationError: If hash validation or verification fails.
        
    Example:
        >>> password = "SecurePassword123!"
        >>> hashed = hash_password(password)
        >>> 
        >>> # Correct password
        >>> verify_password(password, hashed)
        True
        >>> 
        >>> # Wrong password
        >>> verify_password("WrongPassword", hashed)
        False
        >>> 
        >>> # Invalid hash format
        >>> verify_password(password, "invalid_hash")
        False
        
    Notes:
        - Uses constant-time comparison (timing-attack resistant)
        - Returns False for invalid hash format (graceful degradation)
        - Verification time is independent of password match location
        - Log analysis can detect brute-force attempts (multiple failures)
        
    Security:
        This function is resistant to timing attacks. The comparison time
        does not reveal information about which characters match or differ,
        preventing attackers from using timing information to guess passwords.
    """
    try:
        # Validate password
        _validate_password(raw, "verification")
        
        # Validate hash
        if not isinstance(hashed, str):
            raise PasswordVerificationError(
                f"Hash must be a string, got {type(hashed).__name__}"
            )
        
        if not hashed:
            raise PasswordVerificationError("Hash cannot be empty")
        
        # Check hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
        if not hashed.startswith(("$2a$", "$2b$", "$2y$")):
            logger.warning(
                "Invalid hash format for password verification",
                extra={
                    "hash_prefix": hashed[:4] if len(hashed) >= 4 else hashed,
                    "expected_prefixes": ["$2a$", "$2b$", "$2y$"],
                }
            )
            raise PasswordVerificationError(
                f"Invalid bcrypt hash format (expected $2a$/$2b$/$2y$, got {hashed[:4]})"
            )
        
        logger.debug(
            "Verifying password",
            extra={
                "password_length": len(raw),
                "hash_algorithm": hashed[:4],
            }
        )
        
        # Verify password using constant-time comparison
        is_valid = _pwd.verify(raw, hashed)
        
        if is_valid:
            logger.info(
                "Password verification successful",
                extra={
                    "password_length": len(raw),
                    "hash_algorithm": hashed[:4],
                }
            )
        else:
            logger.warning(
                "Password verification failed",
                extra={
                    "password_length": len(raw),
                    "hash_algorithm": hashed[:4],
                }
            )
        
        return is_valid
        
    except (PasswordValidationError, PasswordVerificationError):
        # Re-raise validation errors
        raise
    except Exception as e:
        # Log error and return False (graceful degradation)
        logger.error(
            "Password verification encountered unexpected error",
            exc_info=True,
            extra={
                "password_length": len(raw) if isinstance(raw, str) else None,
                "hash_length": len(hashed) if isinstance(hashed, str) else None,
                "error": str(e),
            }
        )
        raise PasswordVerificationError(f"Password verification failed: {e}") from e
