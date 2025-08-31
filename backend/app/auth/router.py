import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..db import models
from .schemas import RegisterIn, LoginIn, TokenPairOut, RefreshIn
from ..core.security import hash_password, verify_password
from .tokens import (
    create_access_token, create_refresh_token,
    decode_refresh, is_revoked, revoke_jti
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenPairOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    # email unique check
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        id=uuid.uuid4(),
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="user",
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()

    access = create_access_token(str(user.id))
    refresh, _fam = create_refresh_token(str(user.id))
    return TokenPairOut(access_token=access, refresh_token=refresh)

@router.post("/login", response_model=TokenPairOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_access_token(str(user.id))
    refresh, _fam = create_refresh_token(str(user.id))
    return TokenPairOut(access_token=access, refresh_token=refresh)

@router.post("/refresh", response_model=TokenPairOut)
def refresh(payload: RefreshIn):
    try:
        data = decode_refresh(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if data.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Wrong token type")

    jti = data.get("jti")
    if not jti or is_revoked(jti):
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    # Rotate: revoke this refresh's jti and issue a new one in the same family
    exp_ts = int(data["exp"])
    seconds_left = max(0, exp_ts - int(datetime.now(timezone.utc).timestamp()))
    revoke_jti(jti, seconds_left)

    user_id = data["sub"]
    family = data.get("fam")
    new_access = create_access_token(user_id)
    new_refresh, _ = create_refresh_token(user_id, family=family)

    return TokenPairOut(access_token=new_access, refresh_token=new_refresh)
