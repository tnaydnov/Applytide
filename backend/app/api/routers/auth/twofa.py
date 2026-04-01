"""
Two-Factor Authentication (TOTP) Endpoints

Allows users to enable, verify, and disable TOTP-based 2FA.

Endpoints:
- POST /2fa/enable  - Generate a TOTP secret and return QR code + secret
- POST /2fa/verify  - Confirm 2FA setup with a TOTP code, returns backup codes
- POST /2fa/disable - Disable 2FA (requires password confirmation)
"""
from __future__ import annotations

import io
import base64
import secrets
import hashlib
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import pyotp
import qrcode

from ....db.session import get_db
from ....api.deps import get_current_user
from ....api.schemas import auth as schemas
from ....db.models import User
from ....infra.logging import get_logger
from ....infra.security.encryption import encrypt, decrypt
from ....infra.security.rate_limiter import otp_limiter

router = APIRouter()
logger = get_logger(__name__)


# ─── Schemas ───

class Enable2FAResponse(BaseModel):
    qr_code: str  # data-URI of QR image
    secret: str   # raw TOTP secret for manual entry

class Verify2FARequest(BaseModel):
    code: str  # 6-digit TOTP code

class Verify2FAResponse(BaseModel):
    backup_codes: List[str]

class Disable2FARequest(BaseModel):
    password: str


# ─── Helpers ───

def _generate_backup_codes(count: int = 8) -> tuple[list[str], list[str]]:
    """Generate plain backup codes and their hashes."""
    plain = [secrets.token_hex(4).upper() for _ in range(count)]  # e.g. "A1B2C3D4"
    hashed = [hashlib.sha256(c.encode()).hexdigest() for c in plain]
    return plain, hashed


def _make_qr_data_uri(uri: str) -> str:
    """Generate a PNG QR code and return as a data: URI."""
    img = qrcode.make(uri, box_size=6, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


# ─── Endpoints ───

@router.post("/2fa/enable", response_model=Enable2FAResponse)
def enable_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Begin 2FA setup.

    Generates a new TOTP secret, stores it on the user (not yet activated),
    and returns a QR code image and the raw secret for manual entry.

    The user must call POST /2fa/verify with a valid code to activate 2FA.

    Raises:
        400 if 2FA is already enabled
    """
    if current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="Two-factor authentication is already enabled")

    secret = pyotp.random_base32()
    current_user.totp_secret = encrypt(secret)
    current_user.totp_enabled = False  # not yet activated
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to initiate 2FA setup")

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="Applytide",
    )

    qr_data_uri = _make_qr_data_uri(provisioning_uri)

    logger.info("2FA setup initiated", extra={"user_id": str(current_user.id)})

    return Enable2FAResponse(qr_code=qr_data_uri, secret=secret)


@router.post("/2fa/verify", response_model=Verify2FAResponse)
def verify_2fa(
    body: Verify2FARequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Confirm 2FA setup by verifying a TOTP code.

    If the code is valid, 2FA is activated and backup codes are generated.

    Args:
        body.code: A 6-digit TOTP code from the authenticator app

    Returns:
        Verify2FAResponse with a list of one-time backup codes

    Raises:
        400 if no TOTP secret is set (call /2fa/enable first)
        400 if the code is invalid
        429 if rate limit exceeded
    """
    # Rate limit OTP attempts per user to prevent brute-force
    ip_address = request.client.host if request.client else "unknown"
    is_allowed, retry_after = otp_limiter.check_rate_limit(f"user:{current_user.id}")
    if not is_allowed:
        logger.warning(
            "2FA verify rate limit exceeded",
            extra={"user_id": str(current_user.id), "ip_address": ip_address}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please try again later."
        )

    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Call /2fa/enable first to generate a secret")

    secret = decrypt(current_user.totp_secret)
    totp = pyotp.TOTP(secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Generate backup codes
    plain_codes, hashed_codes = _generate_backup_codes()

    current_user.totp_enabled = True
    current_user.backup_codes = hashed_codes
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to enable 2FA")

    logger.info("2FA enabled successfully", extra={"user_id": str(current_user.id)})

    return Verify2FAResponse(backup_codes=plain_codes)


@router.post("/2fa/disable", response_model=schemas.MessageResponse)
def disable_2fa(
    body: Disable2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Disable 2FA after verifying the user's password.

    Clears the TOTP secret and backup codes.

    Args:
        body.password: The user's account password

    Returns:
        dict with success message

    Raises:
        400 if 2FA is not enabled
        401 if password is incorrect
    """
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="Two-factor authentication is not enabled")

    # Verify password using shared password utility
    from ....infra.security.password import verify_password

    if not current_user.password_hash or not verify_password(body.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")

    current_user.totp_secret = None
    current_user.totp_enabled = False
    current_user.backup_codes = None
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to disable 2FA")

    logger.info("2FA disabled", extra={"user_id": str(current_user.id)})

    return {"message": "Two-factor authentication has been disabled"}
